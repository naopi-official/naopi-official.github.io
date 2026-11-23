import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseYoutubeRss, shapeSchedule, shapeVideos, shapeLive, sameContent } from '../scripts/fetch-feeds.mjs';
import { renderFeeds } from '../site/js/feeds-view.js';
import { makeDoc } from './fake-dom.mjs';

const fx = n => readFileSync(new URL('./fixtures/' + n, import.meta.url), 'utf8');
const IDS = ['schedule-list', 'archive-list', 'youtube-list', 'live-badge'];

test('YouTube RSS → 最大4件、id と title', () => {
  const v = parseYoutubeRss(fx('youtube.xml'));
  assert.equal(v.length, 4);
  for (const x of v) { assert.match(x.id, /^[\w-]{11}$/); assert.ok(x.title.length > 0); assert.ok(x.published); }
  assert.equal(v[0].title, '〖 マイクラ 〗０から始めるなおぴ村 #5');
});

test('RSS の実体参照を戻す', () => {
  const xml = '<feed><entry><yt:videoId>abcdefghijk</yt:videoId><title>A &amp; B &lt;3</title><published>2026-11-01T00:00:00+00:00</published></entry></feed>';
  assert.equal(parseYoutubeRss(xml)[0].title, 'A & B <3');
});

test('壊れたRSS → []', () => {
  assert.deepEqual(parseYoutubeRss(''), []);
  assert.deepEqual(parseYoutubeRss('<html>error</html>'), []);
});

test('配信予定：null・空 → []', () => {
  assert.deepEqual(shapeSchedule(null), []);
  assert.deepEqual(shapeSchedule({ data: { segments: [] } }), []);
  assert.deepEqual(shapeSchedule({ data: { segments: null } }), []);
});

test('配信予定：5件 → 早い順に3件、カテゴリ無しは空文字', () => {
  const s = shapeSchedule(JSON.parse(fx('twitch-schedule.json')));
  assert.deepEqual(s.map(x => x.title), ['雑談', 'VALORANT', 'C']);
  assert.equal(s[2].category, '');
});

test('アーカイブ：サムネは320x180、空サムネはnull', () => {
  const a = shapeVideos(JSON.parse(fx('twitch-videos.json')));
  assert.equal(a[0].thumbnail, 'https://static-cdn.jtvnw.net/cf_vods/x/thumb/thumb0-320x180.jpg');
  assert.equal(a[1].thumbnail, null);
  assert.equal(a.length, 2);
});

test('配信中の判定', () => {
  assert.deepEqual(shapeLive(JSON.parse(fx('twitch-streams.json'))), { live: true, liveTitle: '【VALORANT】ランクいくよ〜🌷' });
  assert.deepEqual(shapeLive({ data: [] }), { live: false, liveTitle: null });
  assert.deepEqual(shapeLive(null), { live: false, liveTitle: null });
});

test('sameContent は updatedAt を無視して比べる', () => {
  const a = { updatedAt: '1', twitch: null, youtube: { videos: [] } };
  assert.ok(sameContent(a, { ...a, updatedAt: '2' }));
  assert.ok(!sameContent(a, { ...a, youtube: null }));
  assert.ok(!sameContent(null, a));
});

const NOW = new Date('2026-11-23T12:00:00Z');
const fresh = {
  updatedAt: '2026-11-23T11:07:00Z',
  twitch: { live: true, liveTitle: 'x', schedule: [{ start: '2026-11-24T11:00:00Z', title: '雑談', category: 'Just Chatting' }],
    archives: [{ title: 'アーカイブ1', url: 'https://www.twitch.tv/videos/1', thumbnail: null, createdAt: '2026-11-22T11:00:00Z', duration: '2h' }] },
  youtube: { videos: [{ id: 'QLtYm1WSBj0', title: 'Chu♡lip', published: '2026-10-01T00:00:00Z' }] },
};

test('feeds が null → 3欄とも案内文', () => {
  const doc = makeDoc(IDS);
  renderFeeds(null, doc, NOW);
  for (const id of ['schedule-list', 'archive-list', 'youtube-list']) assert.match(doc.byId[id].textContent, /X/, id);
});

test('updatedAt が3日前 → 案内文', () => {
  const doc = makeDoc(IDS);
  renderFeeds({ ...fresh, updatedAt: '2026-11-20T11:00:00Z' }, doc, NOW);
  assert.match(doc.byId['schedule-list'].textContent, /X/);
  assert.ok(doc.byId['live-badge'].hidden);
});

test('新しいデータ → 予定・アーカイブ・動画が出て LIVE バッジ表示', () => {
  const doc = makeDoc(IDS);
  doc.byId['live-badge'].hidden = true;
  renderFeeds(fresh, doc, NOW);
  assert.match(doc.byId['schedule-list'].textContent, /雑談/);
  assert.match(doc.byId['archive-list'].textContent, /アーカイブ1/);
  assert.match(doc.byId['youtube-list'].textContent, /Chu♡lip/);
  assert.equal(doc.byId['live-badge'].hidden, false);
});

test('予定が空なら予定欄だけ案内文', () => {
  const doc = makeDoc(IDS);
  renderFeeds({ ...fresh, twitch: { ...fresh.twitch, schedule: [] } }, doc, NOW);
  assert.match(doc.byId['schedule-list'].textContent, /配信予定はXでお知らせ/);
  assert.match(doc.byId['archive-list'].textContent, /アーカイブ1/);
});

test('YouTube は公開日の新しい順', () => {
  const v = parseYoutubeRss(fx('youtube.xml'), 15);
  const dates = v.map(x => x.published);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

import { mergeWithPrev } from '../scripts/fetch-feeds.mjs';

test('取り消された配信予定は出さない', () => {
  const s = shapeSchedule({ data: { segments: [
    { start_time: '2026-11-24T11:00:00Z', title: '中止', canceled_until: '2026-11-24T13:00:00Z' },
    { start_time: '2026-11-25T11:00:00Z', title: '通常' },
  ] } });
  assert.deepEqual(s.map(x => x.title), ['通常']);
});

test('取得に失敗した欄は前回の値を引き継ぎ、LIVEは消す', () => {
  const prev = { updatedAt: 'old', twitch: { live: true, liveTitle: 'x', schedule: [1], archives: [2] }, youtube: { videos: [3] } };
  const m = mergeWithPrev(prev, { updatedAt: 'new', twitch: null, youtube: null });
  assert.equal(m.updatedAt, 'new');
  assert.deepEqual(m.twitch, { live: false, liveTitle: null, schedule: [1], archives: [2] });
  assert.deepEqual(m.youtube, { videos: [3] });
});

test('前回もなければ null のまま', () => {
  const m = mergeWithPrev(null, { updatedAt: 'new', twitch: null, youtube: { videos: [] } });
  assert.equal(m.twitch, null);
  assert.deepEqual(m.youtube, { videos: [] });
});

test('変化がなくても feeds.json の updatedAt は毎回新しくなる（main の動き）', async () => {
  const { buildOutput } = await import('../scripts/fetch-feeds.mjs');
  const prev = { updatedAt: '2026-11-20T00:00:00Z', twitch: null, youtube: { videos: [] } };
  const { data, changed } = buildOutput(prev, { twitch: null, youtube: { videos: [] } }, '2026-11-23T00:00:00Z');
  assert.equal(data.updatedAt, '2026-11-23T00:00:00Z');
  assert.equal(changed, false);
});
