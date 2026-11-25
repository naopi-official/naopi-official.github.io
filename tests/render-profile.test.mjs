import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashtagUrl, renderProfile } from '../site/js/render-profile.js';

const profile = JSON.parse(readFileSync(new URL('../site/data/profile.json', import.meta.url), 'utf8'));

test('hashtagUrl はXのハッシュタグ検索URLを返す', () => {
  assert.equal(hashtagUrl('#なおぴみつけた'),
    'https://x.com/hashtag/' + encodeURIComponent('なおぴみつけた') + '?src=hashtag_click');
});

test('活動名は「なおぴを探せ」', () => {
  assert.equal(profile.name, 'なおぴを探せ');
  assert.equal(profile.nickname, 'なおぴ');
});

test('リンクは分けずに1つの欄に全部並べる（9つ）', async () => {
  const { makeDoc } = await import('./fake-dom.mjs');
  const doc = makeDoc(['links-main', 'links-support', 'contact', 'contact-text']);
  renderProfile(profile, doc);
  const labels = doc.byId['links-main'].children.map(c => c.children.find(n => n.className === 'link-label').textContent);
  assert.deepEqual(labels, profile.links.map(l => l.label));
  assert.equal(labels.length, 9);
  assert.equal(doc.byId['links-support'].children.length, 0);
});

test('HTML に「SNS・配信」「応援する」の小見出しと「旧Twitter」がない', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /SNS・配信<|応援する<|旧Twitter/);
  assert.doesNotMatch(profile.contact.text, /Twitter/);
});

test('全リンクは https（メールだけ mailto で連絡先と同じアドレス）', () => {
  for (const l of profile.links) {
    if (l.id === 'mail') assert.equal(l.url, 'mailto:' + profile.contact.email);
    else assert.match(l.url, /^https:\/\//, l.id);
  }
});

test('リンク名にカッコ書きのサービス名を付けない', () => {
  for (const l of profile.links) assert.doesNotMatch(l.label, /[（(]/, l.id);
});

test('いちばん下のご依頼欄のメールは、押せるリンク（新しいタブにしない）', async () => {
  const { makeDoc } = await import('./fake-dom.mjs');
  const doc = makeDoc(['links-main', 'links-support', 'contact', 'contact-text']);
  renderProfile(profile, doc);
  const mail = doc.byId['contact-text'].all().find(n => n.tagName === 'A');
  assert.equal(mail.attrs.href, 'mailto:' + profile.contact.email);
  assert.match(mail.className, /link-card/);
  assert.equal(mail.attrs.target, undefined);
  assert.match(mail.textContent, /naopiiii_7070@yahoo.co.jp/);
});

test('Doneru の一言', () => {
  assert.equal(profile.links.find(l => l.id === 'doneru').note, '還元率90%以上💸 投げ銭はここがお得🉐');
});

test('オリジナル曲と連絡先の設定', () => {
  assert.equal(profile.song.youtubeId, 'QLtYm1WSBj0');
  assert.equal(profile.contact.show, true);
  assert.match(profile.contact.email, /@/);
});

test('ギャラリーに透かし入り画像を含めない', () => {
  for (const g of profile.gallery) assert.doesNotMatch(g.src, /透かし/);
});
