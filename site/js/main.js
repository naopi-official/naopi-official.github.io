import { renderProfile, renderGallery } from './render-profile.js?v=202611241947';
import { loadNotices } from './notices.js?v=202611241947';
import { renderFeeds } from './feeds-view.js?v=202611241947';
import { mountTwitch, mountYoutube, mountXTimeline } from './embeds.js?v=202611241947';
import { setupLightbox } from './lightbox.js?v=202611241947';
import { loadWeek } from './week.js?v=202611241947';
import { setupLoader, setupSlides, setupTilt, setupReveal } from './motion.js?v=202611241947';

async function getJson(path) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function setupMenu() {
  const btn = document.getElementById('menu-button');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  const close = () => { btn.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
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
