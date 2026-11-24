// 今週の予定：スプレッドシート「今週の予定」シート（ウェブに公開したCSV）を、月〜日のカードで表示する
import { el } from './render-profile.js';
import { parseCsvRows } from './notices.js';

export const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const OFF_WORDS = /^(おやすみ|お休み|休み|やすみ|休|off|なし|-|ー)$/i;

// CSV（見出し：曜日,時間,内容,ひとこと）→ 月〜日の7件。書いていない曜日はおやすみ扱い
export function parseWeekCsv(text) {
  const week = DAYS.map(day => ({ day, time: '', title: '', note: '', off: true }));
  if (!text) return week;
  const rows = parseCsvRows(String(text).replace(/^﻿/, ''));
  for (const r of rows.slice(1)) {
    const [dayCell = '', time = '', title = '', note = ''] = r.map(c => String(c).trim());
    const i = DAYS.indexOf(dayCell.charAt(0));
    if (i < 0) continue;
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
}
