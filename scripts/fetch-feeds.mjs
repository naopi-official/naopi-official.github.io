// Twitch（配信中・予定・アーカイブ）と YouTube（最新動画）を取得して site/data/feeds.json に保存する。
// GitHub Actions から1時間ごとに実行する。鍵は環境変数 TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET から読む。
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PROFILE = new URL('../site/data/profile.json', import.meta.url);
const OUT = new URL('../site/data/feeds.json', import.meta.url);

// ---------- 純粋関数（テスト対象） ----------
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const unescapeXml = s => s.replace(/&(amp|lt|gt|quot|#39);/g, m => ENTITIES[m]);
const tagText = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? unescapeXml(m[1].trim()) : '';
};

export function parseYoutubeRss(xml, max = 4) {
  if (!xml) return [];
  const entries = String(xml).match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.map(e => ({
    id: tagText(e, 'yt:videoId'),
    title: tagText(e, 'title'),
    published: tagText(e, 'published'),
  })).filter(v => /^[\w-]{11}$/.test(v.id) && v.title)
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, max);
}

export function shapeSchedule(json, max = 3) {
  const segs = json?.data?.segments;
  if (!Array.isArray(segs)) return [];
  return segs
    .filter(s => s && s.start_time && !s.canceled_until)
    .map(s => ({ start: s.start_time, title: s.title || '', category: s.category?.name || '' }))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, max);
}

export function shapeVideos(json, max = 6) {
  const list = Array.isArray(json?.data) ? json.data : [];
  return list.slice(0, max).map(v => ({
    title: v.title || '',
    url: v.url,
    thumbnail: v.thumbnail_url ? v.thumbnail_url.replace('%{width}', '320').replace('%{height}', '180') : null,
    createdAt: v.created_at,
    duration: v.duration || '',
  }));
}

export function shapeLive(json) {
  const s = Array.isArray(json?.data) ? json.data.find(x => x.type === 'live') : null;
  return s ? { live: true, liveTitle: s.title || '' } : { live: false, liveTitle: null };
}

export function sameContent(a, b) {
  if (!a || !b) return false;
  const strip = o => JSON.stringify({ ...o, updatedAt: undefined });
  return strip(a) === strip(b);
}

// 取得に失敗した欄（null）は前回の値を引き継ぐ。ただし配信中かどうかは分からないので LIVE は消す
export function mergeWithPrev(prev, next) {
  const twitch = next.twitch ?? (prev?.twitch ? { ...prev.twitch, live: false, liveTitle: null } : null);
  const youtube = next.youtube ?? prev?.youtube ?? null;
  return { ...next, twitch, youtube };
}

// updatedAt は毎回「今」にする（サイト側の鮮度判定は、取得が動いているかどうかを見る）。
// changed は中身が前回から変わったか（変わったときだけ git に保存する）
export function buildOutput(prev, fetched, nowIso) {
  const data = mergeWithPrev(prev, { updatedAt: nowIso, ...fetched });
  return { data, changed: !sameContent(prev, data) };
}

// ---------- 取得 ----------
async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (res.status === 404) return null; // 配信予定が未設定のとき Twitch は 404 を返す
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchTwitch(login) {
  const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) { console.log('Twitch: 鍵がないためスキップ'); return null; }
  try {
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
    });
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();
    const h = { 'Client-Id': id, Authorization: `Bearer ${access_token}` };
    const api = 'https://api.twitch.tv/helix';
    const user = (await getJson(`${api}/users?login=${encodeURIComponent(login)}`, h))?.data?.[0];
    if (!user) throw new Error('user not found');
    const [streams, schedule, videos] = await Promise.all([
      getJson(`${api}/streams?user_id=${user.id}`, h),
      getJson(`${api}/schedule?broadcaster_id=${user.id}&first=10`, h).catch(() => null),
      getJson(`${api}/videos?user_id=${user.id}&type=archive&first=6`, h),
    ]);
    return { ...shapeLive(streams), schedule: shapeSchedule(schedule), archives: shapeVideos(videos) };
  } catch (e) {
    console.log('Twitch: 取得失敗', e.message);
    return null;
  }
}

async function fetchYoutube(channelId) {
  if (!channelId) return null;
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
    if (!res.ok) throw new Error(String(res.status));
    return { videos: parseYoutubeRss(await res.text()) };
  } catch (e) {
    console.log('YouTube: 取得失敗', e.message);
    return null;
  }
}

export async function main() {
  const profile = JSON.parse(await readFile(PROFILE, 'utf8'));
  const [twitch, youtube] = await Promise.all([fetchTwitch(profile.twitchLogin), fetchYoutube(profile.youtubeChannelId)]);
  let prev = null;
  try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
  const { data, changed } = buildOutput(prev, { twitch, youtube }, new Date().toISOString());
  // 公開するファイルには毎回新しい updatedAt を書く（git に保存するかは changed で決める）
  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(changed ? '内容が変わりました' : '内容の変化なし（updatedAt のみ更新）');
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
