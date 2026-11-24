import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNoticesCsv, renderNotices } from '../site/js/notices.js';
import { makeDoc } from './fake-dom.mjs';

const H = '日付,タイトル,本文,リンク,表示\n';

test('普通の3行は新しい順に3件', () => {
  const csv = H + '2026/11/01,A,本文A,,○\n2026/11/20,B,本文B,,○\n2026/11/10,C,本文C,,○\n';
  assert.deepEqual(parseNoticesCsv(csv).map(n => n.title), ['B', 'C', 'A']);
});

test('最大5件', () => {
  let csv = H;
  for (let i = 1; i <= 7; i++) csv += `2026/11/0${i},T${i},b,,○\n`;
  const r = parseNoticesCsv(csv);
  assert.equal(r.length, 5);
  assert.equal(r[0].title, 'T7');
});

test('表示が○でない行は除く', () => {
  const csv = H + '2026/11/01,A,x,,○\n2026/11/02,B,x,,\n2026/11/03,C,x,,×\n';
  assert.deepEqual(parseNoticesCsv(csv).map(n => n.title), ['A']);
});

test('引用符内のカンマと改行を1セルとして読む', () => {
  const csv = H + '2026/11/01,"題,名","1行目\n2行目",,○\r\n';
  const [n] = parseNoticesCsv(csv);
  assert.equal(n.title, '題,名');
  assert.equal(n.body, '1行目\n2行目');
});

test('引用符のエスケープ ""', () => {
  const [n] = parseNoticesCsv(H + '2026/11/01,"「""遊ぼ""」",b,,○\n');
  assert.equal(n.title, '「"遊ぼ"」');
});

test('空行・列不足・日付不正は飛ばし、他は残す', () => {
  const csv = H + '\n2026/11/01,A\n,B,x,,○\nあした,C,x,,○\n2026-11-05,D,x,,○\n';
  assert.deepEqual(parseNoticesCsv(csv).map(n => n.title), ['D']);
});

test('空文字・見出しだけ → []', () => {
  assert.deepEqual(parseNoticesCsv(''), []);
  assert.deepEqual(parseNoticesCsv(H), []);
  assert.deepEqual(parseNoticesCsv(null), []);
});

test('リンクは http/https だけ許可', () => {
  const csv = H + '2026/11/01,A,x,javascript:alert(1),○\n2026/11/02,B,x,https://example.com/,○\n';
  const r = parseNoticesCsv(csv);
  assert.equal(r.find(n => n.title === 'A').link, null);
  assert.equal(r.find(n => n.title === 'B').link, 'https://example.com/');
});

test('日付は YYYY/MM/DD に揃える', () => {
  const [n] = parseNoticesCsv(H + '2026-1-5,A,x,,○\n');
  assert.equal(n.date, '2026/01/05');
});

test('本文の <script> は要素にならず文字のまま（詳細ページ）', async () => {
  const { renderNoticeDetail } = await import('../site/js/notices.js');
  const doc = makeDoc(['news-detail']);
  const box = doc.byId['news-detail'];
  renderNoticeDetail([{ id: 2, date: '2026/11/01', title: 'T', body: '<script>alert(1)</script>', link: null }], 2, box, doc);
  assert.ok(!box.all().some(n => n.tagName === 'SCRIPT'));
  assert.match(box.textContent, /<script>alert\(1\)<\/script>/);
});

test('0件ならXへの案内を出す', () => {
  const doc = makeDoc(['notices-list']);
  const box = doc.byId['notices-list'];
  renderNotices([], box, doc);
  assert.match(box.textContent, /X/);
  assert.ok(box.all().some(n => n.tagName === 'A' && n.attrs.href === 'https://x.com/__155crn'));
});

test('表示欄は ○ 以外の「まる」も受け付ける', () => {
  const rows = ['〇', '◯', 'o', 'O', 'TRUE', '○ '].map((m, i) => `2026/11/0${i + 1},T${i},x,,${m}`).join('\n');
  assert.equal(parseNoticesCsv(H + rows + '\n').length, 5); // 6件中、最大5件
  assert.equal(parseNoticesCsv(H + '2026/11/01,A,x,,×\n2026/11/02,B,x,,no\n').length, 0);
});

// ---- お知らせの詳細ページ ----
test('各お知らせにシートの行番号の id が付き、上限を変えられる', async () => {
  const csv = H + '2026/11/01,A,a,,TRUE\n2026/11/02,B,b,,FALSE\n2026/11/03,C,c,,TRUE\n';
  const r = parseNoticesCsv(csv);
  assert.deepEqual(r.map(n => [n.title, n.id]), [['C', 4], ['A', 2]]);
  const many = Array.from({ length: 8 }, (_, i) => `2026/11/0${i + 1},T${i},x,,TRUE`).join('\n');
  assert.equal(parseNoticesCsv(H + many + '\n').length, 5);
  assert.equal(parseNoticesCsv(H + many + '\n', { limit: Infinity }).length, 8);
});

test('トップの一覧は日付とタイトルだけで、詳細ページへのリンクになる', () => {
  const doc = makeDoc(['notices-list']);
  const box = doc.byId['notices-list'];
  renderNotices([{ id: 7, date: '2026/11/01', title: 'T', body: '本文', link: null }], box, doc);
  const a = box.all().find(n => n.tagName === 'A');
  assert.equal(a.attrs.href, 'news.html?id=7');
  assert.doesNotMatch(box.textContent, /本文/);
});

test('詳細ページ：id のお知らせを出し、無ければ見つからない案内', async () => {
  const { renderNoticeDetail } = await import('../site/js/notices.js');
  const items = [{ id: 3, date: '2026/11/01', title: 'T', body: '1行目\n2行目', link: 'https://example.com/' }];
  const doc = makeDoc(['news-detail']);
  const box = doc.byId['news-detail'];
  assert.equal(renderNoticeDetail(items, 3, box, doc), 'T');
  assert.match(box.textContent, /1行目\n2行目/);
  assert.ok(box.all().some(n => n.tagName === 'A' && n.attrs.href === 'https://example.com/'));
  assert.equal(renderNoticeDetail(items, 99, box, doc), null);
  assert.match(box.textContent, /見つかりません/);
});
