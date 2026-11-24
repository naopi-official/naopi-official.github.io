// feeds.json（Actions が作る）を、配信予定・アーカイブ・YouTube 欄に表示する
import { el } from './render-profile.js?v=202611250750';
import { fallbackNode } from './notices.js?v=202611250750';

const STALE_MS = 48 * 60 * 60 * 1000;

const fmt = iso => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).format(d);
};

function thumbLink(doc, { href, img, title }) {
  return el(doc, 'li', {}, [el(doc, 'a', { class: 'thumb-link', href, target: '_blank', rel: 'noopener noreferrer' }, [
    img ? el(doc, 'img', { src: img, alt: '', loading: 'lazy', width: 320, height: 180 }) : null,
    el(doc, 'span', { text: title }),
  ])]);
}

function put(doc, id, nodes, emptyMessage) {
  const box = doc.getElementById(id);
  if (!box) return;
  box.replaceChildren(...(nodes && nodes.length ? nodes : [fallbackNode(doc, emptyMessage)]));
}

export function renderFeeds(feeds, doc = globalThis.document, now = new Date()) {
  const fresh = feeds && feeds.updatedAt && now - new Date(feeds.updatedAt) < STALE_MS;
  const tw = fresh ? feeds.twitch : null;
  const yt = fresh ? feeds.youtube : null;

  const badge = doc.getElementById('live-badge');
  if (badge) badge.hidden = !(tw && tw.live);

  put(doc, 'schedule-list', tw?.schedule?.map(s => el(doc, 'li', {}, [
    el(doc, 'span', { class: 'schedule-date', text: fmt(s.start) }),
    el(doc, 'span', { text: [s.title, s.category && `（${s.category}）`].filter(Boolean).join(' ') }),
  ])), tw ? '配信予定はXでお知らせします。' : '配信予定を読み込めませんでした。');

  put(doc, 'archive-list', tw?.archives?.map(a => thumbLink(doc, { href: a.url, img: a.thumbnail, title: a.title })),
    'アーカイブを読み込めませんでした。');

  put(doc, 'youtube-list', yt?.videos?.map(v => thumbLink(doc, {
    href: `https://www.youtube.com/watch?v=${v.id}`, img: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, title: v.title,
  })), 'YouTubeの動画を読み込めませんでした。');
}
