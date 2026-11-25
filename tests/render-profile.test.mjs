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

test('main リンクは3つ（Twitch・YouTube・X・TikTokは載せず、メールを先頭に）', () => {
  const ids = profile.links.filter(l => l.group === 'main').map(l => l.id);
  assert.deepEqual(ids, ['mail', 'discord', 'mond']);
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

test('メールのリンクは新しいタブで開かない', async () => {
  const { makeDoc } = await import('./fake-dom.mjs');
  const doc = makeDoc(['links-main', 'links-support', 'contact', 'contact-text']);
  renderProfile(profile, doc);
  const mail = doc.byId['links-main'].children[0];
  assert.equal(mail.attrs.href, 'mailto:' + profile.contact.email);
  assert.equal(mail.attrs.target, undefined);
});

test('オリジナル曲と連絡先の設定', () => {
  assert.equal(profile.song.youtubeId, 'QLtYm1WSBj0');
  assert.equal(profile.contact.show, true);
  assert.match(profile.contact.email, /@/);
});

test('ギャラリーに透かし入り画像を含めない', () => {
  for (const g of profile.gallery) assert.doesNotMatch(g.src, /透かし/);
});
