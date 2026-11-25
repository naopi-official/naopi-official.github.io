// お知らせ：Googleスプレッドシート（ウェブに公開したCSV）を読み込んで表示する
import { el } from './render-profile.js?v=202611251503';

const MAX_ITEMS = 5;
// 「まる」の変換候補（記号の○・漢数字の〇・大きな◯）や o / TRUE も表示扱いにする
const SHOW_MARKS = new Set(['○', '〇', '◯', 'O', 'TRUE']);
export const X_URL = 'https://x.com/__155crn';

// RFC4180 形式のCSVを行の配列にする（引用符内のカンマ・改行・"" に対応）
export function parseCsvRows(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function normalizeDate(s) {
  const m = String(s).trim().match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}/${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

function safeLink(s) {
  const v = String(s || '').trim();
  return /^https?:\/\//i.test(v) ? v : null;
}

// id はスプレッドシートの行番号（見出しが1行目）。行を下に足していく使い方なので、あとから変わらない
export function parseNoticesCsv(text, { limit = MAX_ITEMS } = {}) {
  if (!text) return [];
  const rows = parseCsvRows(String(text).replace(/^﻿/, ''));
  const items = [];
  for (const [i, r] of rows.entries()) {
    if (i === 0 || r.length < 5) continue;
    const [date, title, body, link, show] = r.map(c => c.trim());
    if (!SHOW_MARKS.has(show.toUpperCase())) continue;
    const d = normalizeDate(date);
    if (!d || !title) continue;
    items.push({ id: i + 1, date: d, title, body, link: safeLink(link) });
  }
  // 新しい日付が上。同じ日付なら下の行（あとから書いたもの）が上
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  return items.slice(0, limit);
}

export function fallbackNode(doc, message) {
  return el(doc, 'li', { class: 'fallback' }, [
    message + ' 最新情報は ',
    el(doc, 'a', { href: X_URL, target: '_blank', rel: 'noopener noreferrer', text: 'X（@__155crn）' }),
    ' をチェックしてね🌷',
  ]);
}

export function renderNotices(items, container, doc = globalThis.document) {
  if (!container) return;
  if (!items || items.length === 0) {
    container.replaceChildren(fallbackNode(doc, 'いまお知らせはありません。'));
    return;
  }
  // 日付とタイトルだけ並べ、押すと詳細ページ（news.html?id=行番号）へ
  container.replaceChildren(...items.map(n => el(doc, 'li', {}, [
    el(doc, 'a', { class: 'notice-link', href: 'news.html?id=' + n.id }, [
      el(doc, 'span', { class: 'notice-date', text: n.date }),
      el(doc, 'span', { class: 'notice-title', text: n.title }),
      el(doc, 'span', { class: 'notice-arrow', 'aria-hidden': 'true', text: '→' }),
    ]),
  ])));
}

// 詳細ページ：id のお知らせを1件表示。表示したらタイトルを、無ければ null を返す
export function renderNoticeDetail(items, id, container, doc = globalThis.document) {
  if (!container) return null;
  const n = (items || []).find(x => x.id === Number(id));
  if (!n) {
    container.replaceChildren(
      el(doc, 'p', { class: 'news-missing', text: 'このお知らせは見つかりませんでした。終了したか、非表示になった可能性があります。' }),
    );
    return null;
  }
  container.replaceChildren(...[
    el(doc, 'p', { class: 'news-meta' }, [
      el(doc, 'span', { class: 'notice-date', text: n.date }),
      el(doc, 'span', { class: 'news-tag', text: 'お知らせ' }),
    ]),
    el(doc, 'h1', { class: 'news-title', text: n.title }),
    n.body ? el(doc, 'div', { class: 'news-body', text: n.body }) : null,
    n.link ? el(doc, 'a', { class: 'btn btn-primary news-more', href: n.link, target: '_blank', rel: 'noopener noreferrer', text: 'くわしくはこちら ↗' }) : null,
  ].filter(Boolean));
  return n.title;
}

// お知らせのCSVを読む（読めなければ null）
export async function fetchNotices(url, opts) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    return parseNoticesCsv(await res.text(), opts);
  } catch {
    return null;
  }
}

export async function loadNotices(url, container, doc = globalThis.document) {
  renderNotices((await fetchNotices(url)) || [], container, doc);
}
