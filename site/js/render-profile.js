// profile.json の内容をページの各欄に差し込む

export function hashtagUrl(tag) {
  const word = String(tag).replace(/^#/, '');
  return 'https://x.com/hashtag/' + encodeURIComponent(word) + '?src=hashtag_click';
}

// 小さな要素作成ヘルパー（文字は必ず textContent で入れる）
export function el(doc, tag, attrs = {}, children = []) {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

function linkCard(doc, link) {
  const isMail = /^mailto:/i.test(link.url); // メールはメールアプリで開くので、新しいタブにしない
  return el(doc, 'a', {
    class: `link-card link-${link.id}${link.icon ? ' has-icon' : ''}`,
    href: link.url,
    target: isMail ? null : '_blank',
    rel: isMail ? null : 'noopener noreferrer',
  }, [
    link.icon ? el(doc, 'img', { class: 'link-icon', src: link.icon, alt: '', width: 48, height: 48, loading: 'lazy' }) : null,
    el(doc, 'span', { class: 'link-label', text: link.label }),
    link.note ? el(doc, 'span', { class: 'link-note', text: link.note }) : null,
  ]);
}

function fill(doc, id, nodes) {
  const box = doc.getElementById(id);
  if (!box) return;
  box.replaceChildren(...nodes);
}

export function renderProfile(profile, doc) {
  doc.querySelectorAll('[data-name]').forEach(n => { n.textContent = profile.name; });
  doc.querySelectorAll('[data-nickname]').forEach(n => { n.textContent = profile.nickname; });
  const tagline = doc.getElementById('hero-tagline');
  if (tagline) tagline.textContent = profile.tagline;

  const p = profile.profile;
  const rows = [
    ['誕生日', p.birthday],
    ['趣味', (p.hobbies || []).join('、')],
    ['好きなもの', (p.likes || []).join('、')],
    ['苦手なもの', (p.dislikes || []).join('、')],
    ['イメージカラー', p.color],
    ['ファンマーク', p.fanmark],
    ['ファンネーム', p.fanname],
  ].filter(([, v]) => v); // 空の項目は出さない
  fill(doc, 'profile-list', rows.flatMap(([k, v]) => [
    el(doc, 'dt', { text: k }), el(doc, 'dd', { text: v }),
  ]));
  const career = doc.getElementById('profile-career');
  if (career) { career.textContent = p.career || ''; career.hidden = !p.career; }
  const clip = doc.getElementById('profile-clip');
  if (clip) clip.textContent = p.clipNote;

  fill(doc, 'links-main', profile.links.filter(l => l.group === 'main').map(l => linkCard(doc, l)));
  fill(doc, 'links-support', profile.links.filter(l => l.group === 'support').map(l => linkCard(doc, l)));

  fill(doc, 'hashtags', profile.hashtags.map(h => el(doc, 'a', {
    class: 'hashtag', href: hashtagUrl(h.tag), target: '_blank', rel: 'noopener noreferrer',
  }, [el(doc, 'span', { class: 'hashtag-tag', text: h.tag }), el(doc, 'span', { class: 'hashtag-label', text: h.label })])));
  const fa = doc.getElementById('fanart-note');
  if (fa) fa.textContent = profile.fanartNote;

  const songTitle = doc.getElementById('song-title');
  if (songTitle) songTitle.textContent = profile.song.title;
  const songNote = doc.getElementById('song-note');
  if (songNote) songNote.textContent = profile.song.note;

  renderGallery(doc, profile.gallery);

  const contact = doc.getElementById('contact');
  if (contact) {
    contact.hidden = !profile.contact.show;
    const t = doc.getElementById('contact-text');
    if (t) {
      const email = profile.contact.email;
      // メールはリンク欄と同じカードの形で、押すとメールアプリが開く（空なら文章だけ）
      t.replaceChildren(...[
        el(doc, 'span', { text: profile.contact.text }),
        email ? linkCard(doc, { id: 'mail', icon: 'img/links/mail.svg', label: 'メールを送る', note: email, url: 'mailto:' + email }) : null,
      ].filter(Boolean));
    }
  }
}

// ファンアート欄。Googleドライブから取り込んだ絵（fanart.json）と profile.json の gallery を並べる
export function renderGallery(doc, items) {
  const list = Array.isArray(items) ? items.filter(g => g && g.src) : [];
  const box = doc.getElementById('gallery-list');
  if (box) box.className = list.length ? 'gallery gallery-many' : 'gallery';
  if (!list.length) {
    fill(doc, 'gallery-list', [el(doc, 'p', { class: 'gallery-empty', text: 'ファンアートはただいま準備中です。#なおぴみつけた で投稿してね🌷' })]);
  } else fill(doc, 'gallery-list', list.map(g => el(doc, 'figure', { class: 'gallery-item', tabindex: 0, role: 'button', 'aria-label': 'ファンアートを大きく表示' }, [
    // 描いた人の名前は表示しない（ユーザー指示 2026-11-24）
    el(doc, 'img', { src: g.src, alt: 'ファンアート', loading: 'lazy', decoding: 'async' }),
  ])));
}
