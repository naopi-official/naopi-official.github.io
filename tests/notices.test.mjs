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

test('本文の <script> は要素にならず文字のまま', () => {
  const doc = makeDoc(['notices-list']);
  const box = doc.byId['notices-list'];
  renderNotices([{ date: '2026/11/01', title: 'T', body: '<script>alert(1)</script>', link: null }], box, doc);
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
