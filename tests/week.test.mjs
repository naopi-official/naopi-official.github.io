import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWeekCsv, weekDates, renderWeek } from '../site/js/week.js';
import { makeDoc } from './fake-dom.mjs';

const CSV = '曜日,時間,内容,ひとこと\n月,21:00,マイクラ,なおぴ村つくる\n火,,おやすみ,\n水曜日,22:00,"雑談, お便り",\n木,,,\n金,20:30,VALORANT,\n';

test('曜日ごとに読み込み、書いていない日・おやすみはおやすみ扱い', () => {
  const w = parseWeekCsv(CSV);
  assert.equal(w.length, 7);
  assert.deepEqual(w[0], { day: '月', time: '21:00', title: 'マイクラ', note: 'なおぴ村つくる', off: false });
  assert.equal(w[1].off, true);
  assert.equal(w[2].title, '雑談, お便り');
  assert.equal(w[3].off, true);
  assert.equal(w[6].off, true);
  assert.equal(parseWeekCsv('').every(d => d.off), true);
});

test('今週の日付は日本時間・月曜はじまり', () => {
  // 2026-11-24 は火曜。UTC 15:30 は日本時間で 11/25(水) 0:30
  const a = weekDates(new Date('2026-11-24T03:00:00Z'));
  assert.equal(a.todayIndex, 1);
  assert.equal(a.dates[0], '11/23');
  assert.equal(a.dates[6], '11/29');
  assert.equal(weekDates(new Date('2026-11-24T15:30:00Z')).todayIndex, 2);
  assert.equal(weekDates(new Date('2026-11-29T14:00:00Z')).todayIndex, 6); // 日曜の夜（日本時間）
});

test('予定が1つもないときは欄を隠し、あるときは7枚のカードを出す', () => {
  const doc = makeDoc(['week', 'week-list', 'week-range']);
  renderWeek(parseWeekCsv(''), doc);
  assert.equal(doc.byId.week.hidden, true);
  renderWeek(parseWeekCsv(CSV), doc, new Date('2026-11-24T03:00:00Z'));
  assert.equal(doc.byId.week.hidden, false);
  assert.equal(doc.byId['week-list'].children.length, 7);
  assert.match(doc.byId['week-range'].textContent, /11\/23（月）〜 11\/29（日）/);
  assert.match(doc.byId['week-list'].children[1].className, /is-today/);
});
