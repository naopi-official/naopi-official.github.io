// 今週の予定：スプレッドシート「今週の予定」シート（ウェブに公開したCSV）を、月〜日のカードで表示する
import { el } from './render-profile.js?v=202611251433';
import { parseCsvRows } from './notices.js?v=202611251433';

export const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const OFF_WORDS = /^(おやすみ|お休み|休み|やすみ|休|off|なし|-|ー)$/i;

// 「2026/11/23」「2026-11-23」「2026/1/5」→ その日の 0:00（UTCの値で持つ）。読めなければ NaN
function parseDay(s) {
  const m = String(s).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
}

// 日本時間での今週の月曜日 0:00（UTCの値で持つ）
function mondayJst(now) {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - (jst.getUTCDay() + 6) % 7);
}

// CSV → 月〜日の7件。書いていない曜日はおやすみ扱い
// ・日付つき（見出し：日付,曜日,時間,内容,ひとこと。今週＋来週の14行）→ 今週の日付の行だけ使う。
//   日本時間の月曜 0:00（＝日曜 23:59 の次）で、来週の行に自動で切り替わる
// ・日付なし（見出し：曜日,時間,内容,ひとこと）→ 曜日で読む（前の形式）
export function parseWeekCsv(text, now = new Date()) {
  const week = DAYS.map(day => ({ day, time: '', title: '', note: '', off: true }));
  if (!text) return week;
  const rows = parseCsvRows(String(text).replace(/^﻿/, ''));
  const dated = String(rows[0]?.[0] ?? '').trim() === '日付';
  const monday = mondayJst(now);
  for (const r of rows.slice(1)) {
    const cells = r.map(c => String(c).trim());
    let i;
    if (dated) {
      const d = parseDay(cells.shift());
      cells.shift(); // 曜日（表示用）
      i = Number.isNaN(d) ? -1 : Math.round((d - monday) / 86400000);
      if (i > 6) i = -1;
    } else {
      i = DAYS.indexOf((cells.shift() || '').charAt(0));
    }
    if (i < 0) continue;
    const [time = '', title = '', note = ''] = cells;
    const off = !title || OFF_WORDS.test(title);
    week[i] = { day: DAYS[i], time: off ? '' : time, title: off ? '' : title, note, off };
  }
  return week;
}

// 日本時間での「今週」（月曜はじまり）の日付と、今日が何番目か
export function weekDates(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000); // UTCの値として日本時間の年月日を読む
  const todayIndex = (jst.getUTCDay() + 6) % 7; // 月=0 … 日=6
  const monday = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - todayIndex);
  const dates = DAYS.map((_, i) => {
    const d = new Date(monday + i * 86400000);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  });
  return { dates, todayIndex };
}

export function renderWeek(week, doc = globalThis.document, now = new Date()) {
  const list = doc.getElementById('week-list');
  const range = doc.getElementById('week-range');
  const section = doc.getElementById('week');
  if (!list) return;
  const hasAny = week.some(w => !w.off);
  if (section) section.hidden = !hasAny; // 1日も書いていないときは欄ごと隠す
  if (!hasAny) return;
  const { dates, todayIndex } = weekDates(now);
  if (range) range.textContent = `${dates[0]}（月）〜 ${dates[6]}（日）`;
  list.replaceChildren(...week.map((w, i) => el(doc, 'li', {
    class: `week-card week-${DAY_EN[i].toLowerCase()}${w.off ? ' is-off' : ''}${i === todayIndex ? ' is-today' : ''}`,
  }, [
    i === todayIndex ? el(doc, 'span', { class: 'week-today', text: '🌷 TODAY' }) : null,
    el(doc, 'span', { class: 'week-day' }, [
      el(doc, 'span', { class: 'week-day-en', text: DAY_EN[i] }),
      el(doc, 'span', { class: 'week-day-ja', text: `${dates[i]}（${w.day}）` }),
    ]),
    w.off
      ? el(doc, 'p', { class: 'week-title', text: '🌙 おやすみ' })
      : el(doc, 'p', { class: 'week-time', text: w.time || '時間未定' }),
    w.off ? null : el(doc, 'p', { class: 'week-title', text: w.title }),
    w.note ? el(doc, 'p', { class: 'week-note', text: w.note }) : null,
  ])));
  // スマホ（横スクロール）では、今日のカードが最初に見えるようにする
  const today = list.children?.[todayIndex];
  if (today && typeof list.scrollTo === 'function' && list.scrollWidth > list.clientWidth) {
    list.scrollTo({ left: Math.max(0, today.offsetLeft - list.offsetLeft - 8) });
  }
}

export async function loadWeek(url, doc = globalThis.document) {
  const section = doc.getElementById('week');
  if (!url) { if (section) section.hidden = true; return; }
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    renderWeek(parseWeekCsv(await res.text()), doc);
  } catch {
    if (section) section.hidden = true;
  }
  // ページを開いたまま週が変わったら（日本時間の月曜 0:00）、読み直して来週の分に切り替える
  if (typeof setTimeout === 'function' && doc === globalThis.document) {
    const wait = msUntilNextMonday() + 1000;
    clearTimeout(loadWeek.timer);
    loadWeek.timer = setTimeout(() => loadWeek(url, doc), wait);
  }
}

// 次の月曜 0:00（日本時間）までのミリ秒
export function msUntilNextMonday(now = new Date()) {
  return mondayJst(now) + 7 * 86400000 - 9 * 3600 * 1000 - now.getTime();
}
