import { renderProfile, renderGallery } from './render-profile.js?v=202611251358';
import { loadNotices } from './notices.js?v=202611251358';
import { renderFeeds } from './feeds-view.js?v=202611251358';
import { mountTwitch, mountYoutube, mountXTimeline } from './embeds.js?v=202611251358';
import { setupLightbox } from './lightbox.js?v=202611251358';
import { loadWeek } from './week.js?v=202611251358';
import { setupMenu } from './menu.js?v=202611251358';
import { setupLoader, setupSlides, setupTilt, setupReveal } from './motion.js?v=202611251358';

async function getJson(path) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function start() {
  setupLoader();
  setupMenu();
  setupSlides();
  setupTilt();
  const profile = await getJson('data/profile.json');
  if (!profile) { setupReveal(); return; }
  renderProfile(profile, document);
  mountTwitch(document.getElementById('twitch-player'), profile.twitchLogin, location.hostname);
  mountYoutube(document.getElementById('song-player'), profile.song.youtubeId, profile.song.title);
  setupReveal();
  const [feeds, fanart] = await Promise.all([
    getJson('data/feeds.json'),
    getJson('data/fanart.json'),
    loadNotices(profile.noticesCsvUrl, document.getElementById('notices-list')),
    loadWeek(profile.weekCsvUrl, document),
  ]);
  renderFeeds(feeds);
  setupLightbox(document);
  if (Array.isArray(fanart) && fanart.length) renderGallery(document, fanart);
  setupReveal(); // あとから入った予定・動画・お知らせにも演出をつける
  mountXTimeline(document.getElementById('x-timeline'), profile.xHandle);
}

start();
