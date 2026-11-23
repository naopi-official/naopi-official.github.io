import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashtagUrl } from '../site/js/render-profile.js';

const profile = JSON.parse(readFileSync(new URL('../site/data/profile.json', import.meta.url), 'utf8'));

test('hashtagUrl はXのハッシュタグ検索URLを返す', () => {
  assert.equal(hashtagUrl('#なおぴみつけた'),
    'https://x.com/hashtag/' + encodeURIComponent('なおぴみつけた') + '?src=hashtag_click');
});

test('活動名は「なおぴを探せ」', () => {
  assert.equal(profile.name, 'なおぴを探せ');
  assert.equal(profile.nickname, 'なおぴ');
});

test('main リンクは6つ', () => {
  const ids = profile.links.filter(l => l.group === 'main').map(l => l.id);
  assert.deepEqual(ids, ['twitch', 'youtube', 'x', 'tiktok', 'discord', 'mond']);
});

test('support リンクは6つ', () => {
  const ids = profile.links.filter(l => l.group === 'support').map(l => l.id);
  assert.deepEqual(ids, ['booth', 'gipt', 'steam', 'legevi', 'fansfer', 'skeb']);
});

test('全リンクは https', () => {
  for (const l of profile.links) assert.match(l.url, /^https:\/\//, l.id);
});

test('オリジナル曲と連絡先の設定', () => {
  assert.equal(profile.song.youtubeId, 'QLtYm1WSBj0');
  assert.equal(profile.contact.show, false);
});

test('ギャラリーに透かし入り画像を含めない', () => {
  for (const g of profile.gallery) assert.doesNotMatch(g.src, /透かし/);
});
