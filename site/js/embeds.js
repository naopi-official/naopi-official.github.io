// Twitch・YouTube・X の埋め込み
import { el } from './render-profile.js?v=202611242049';

// Twitch プレイヤー。parent には表示しているサイトのドメインを渡す必要がある
export function mountTwitch(box, login, hostname, doc = document) {
  if (!box) return;
  if (!hostname) {
    box.replaceChildren(el(doc, 'a', { class: 'embed-fallback', href: `https://www.twitch.tv/${login}`, target: '_blank', rel: 'noopener noreferrer', text: 'Twitchで配信を見る ↗' }));
    return;
  }
  const src = `https://player.twitch.tv/?channel=${encodeURIComponent(login)}&parent=${encodeURIComponent(hostname)}&muted=true&autoplay=false`;
  box.replaceChildren(el(doc, 'iframe', { src, title: 'Twitch プレイヤー', allowfullscreen: true, loading: 'lazy' }));
}

// YouTube。押すまでは画像だけ表示して、ページを軽くする
export function mountYoutube(box, id, title = '', doc = document) {
  if (!box || !id) return;
  const btn = el(doc, 'button', { class: 'yt-poster', type: 'button', 'aria-label': `${title} を再生` }, [
    el(doc, 'img', { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: '', loading: 'lazy' }),
  ]);
  btn.addEventListener('click', () => {
    box.replaceChildren(el(doc, 'iframe', {
      src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
      title: title || 'YouTube 動画',
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowfullscreen: true,
    }));
  });
  box.replaceChildren(btn);
}

// X のタイムライン。決まった時間内に表示されなければ枠ごと隠す
export function mountXTimeline(box, handle, timeoutMs = 5000, doc = document) {
  if (!box) return;
  box.hidden = false;
  box.replaceChildren(el(doc, 'a', {
    class: 'twitter-timeline', 'data-height': '520', 'data-chrome': 'noheader nofooter transparent',
    'data-lang': 'ja', href: `https://twitter.com/${handle}`, text: '',
  }));
  const s = el(doc, 'script', { src: 'https://platform.twitter.com/widgets.js', async: true, charset: 'utf-8' });
  doc.body.append(s);
  setTimeout(() => {
    const frame = box.querySelector('iframe');
    if (!frame || frame.offsetHeight < 100) box.hidden = true;
  }, timeoutMs);
}
