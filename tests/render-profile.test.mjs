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

test('main リンクは2つ（Twitch・YouTube・X・TikTok・メールは載せない）', () => {
  const ids = profile.links.filter(l => l.group === 'main').map(l => l.id);
  assert.deepEqual(ids, ['discord', 'mond']);
});

test('support リンクは7つ', () => {
  const ids = profile.links.filter(l => l.group === 'support').map(l => l.id);
  assert.deepEqual(ids, ['booth', 'gipt', 'steam', 'legevi', 'fansfer', 'skeb', 'doneru']);
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
