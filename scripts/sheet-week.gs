// スプレッドシート「なおぴ公式サイト お知らせ」の Apps Script（拡張機能 → Apps Script に貼る）
// ・setup()    … 「今週の予定」シートを、今週＋来週の14行（日付つき）に作り直し、毎週の切り替えを登録する。最初に1回だけ実行
// ・rollWeek() … 毎週月曜 0時台に自動実行。来週の行を今週へ上げ、来週の行を空にして日付を1週間進める
// サイトは日付を見て表示するので、日本時間の月曜 0:00（日曜 23:59 の次）ちょうどに来週の分へ切り替わる。
// rollWeek はシートの見た目を整えるだけ（遅れて動いてもサイトの表示はずれない）。

const SHEET = '今週の予定';
const TZ = 'Asia/Tokyo';
const DAY = 86400000;
const HEAD = ['日付', '曜日', '時間', '内容', 'ひとこと'];
const NOTES = [
  '日付は自動で入ります。消したり変えたりしないでね',
  '曜日は自動で入ります',
  '例：20:00〜　未定なら空欄でOK（「時間未定」と出ます）',
  '例：VALORANTランク　空欄か「おやすみ」と書くと🌙おやすみ表示になります',
  'カードの下に小さく出る一言（なくてOK）。例：コラボあり！',
];

// 日本時間の今週の月曜（UTCの値で持つ）
function thisMonday_() {
  const now = new Date();
  const [y, m, d, u] = Utilities.formatDate(now, TZ, 'yyyy,M,d,u').split(',').map(Number);
  return Date.UTC(y, m - 1, d - (u - 1));
}
function ymd_(t) { return Utilities.formatDate(new Date(t), 'UTC', 'yyyy/MM/dd'); }
function parse_(s) {
  const m = String(s).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
}
function writeDates_(sh, monday) {
  const rows = [];
  for (let i = 0; i < 14; i++) rows.push([ymd_(monday + i * DAY)]);
  sh.getRange(2, 1, 14, 1).setNumberFormat('yyyy/mm/dd').setValues(rows);
}

function setup() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET);
  // 前の形式（曜日,時間,内容,ひとこと）で書いてある予定は、今週の行に引き継ぐ
  const old = sh.getRange(1, 1, 8, 4).getDisplayValues();
  const keep = old[0][0] === '曜日' ? old.slice(1).map(r => [r[1], r[2], r[3]]) : null;
  // もう新しい形式なら、書いてある予定（時間・内容・ひとこと 14行）をそのまま残す（もう一度実行しても消えない）
  const keep14 = old[0][0] === '日付' ? sh.getRange(2, 3, 14, 3).getValues() : null;

  sh.getRange('A1:Z100').clear().clearNote();
  sh.getRange(1, 1, 1, 5).setValues([HEAD]).setFontWeight('bold').setBackground('#fff2cc');
  HEAD.forEach((_, i) => sh.getRange(1, i + 1).setNote(NOTES[i]));
  writeDates_(sh, thisMonday_());
  const days = [];
  for (let r = 2; r <= 15; r++) days.push([`=CHOOSE(WEEKDAY(A${r},2),"月","火","水","木","金","土","日")`]);
  sh.getRange(2, 2, 14, 1).setFormulas(days);
  if (keep) sh.getRange(2, 3, 7, 3).setValues(keep);
  if (keep14) sh.getRange(2, 3, 14, 3).setValues(keep14);
  sh.getRange(2, 1, 14, 2).setFontColor('#8a7a66');
  sh.getRange(9, 1, 7, 5).setBackground('#eaf4fb'); // 来週の行は水色
  sh.getRange('G2').setValue('← 今週（サイトに表示中）').setFontColor('#8a7a66');
  sh.getRange('G9').setValue('← 来週（月曜0:00にサイトが切り替わります）').setFontColor('#8a7a66');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 95); sh.setColumnWidth(2, 50); sh.setColumnWidth(3, 110);
  sh.setColumnWidth(4, 300); sh.setColumnWidth(5, 300);
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(p => p.remove());
  sh.getRange(2, 1, 14, 2).protect().setDescription('日付と曜日（自動）').setWarningOnly(true);

  // 毎週月曜 0時台に rollWeek を実行（前に登録したものは消してから）
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'rollWeek').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('rollWeek').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(0).inTimezone(TZ).create();
}

function rollWeek() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
  const monday = thisMonday_();
  for (let n = 0; n < 60; n++) {
    const first = parse_(sh.getRange('A2').getDisplayValue());
    if (!(first < monday)) return; // もう今週になっている
    if (first + 7 * DAY >= monday) {
      sh.getRange(2, 3, 7, 3).setValues(sh.getRange(9, 3, 7, 3).getValues()); // 来週 → 今週
    } else {
      sh.getRange(2, 3, 7, 3).clearContent(); // 2週以上たっていたら空に
    }
    sh.getRange(9, 3, 7, 3).clearContent();
    writeDates_(sh, first + 7 * DAY);
  }
}

// 「使い方」シートの今週の予定の書き方（17行目から下）を書き直す
function updateHelp() {
  const sh = SpreadsheetApp.getActive().getSheetByName('使い方');
  const lines = [
    '📅 今週の予定の書き方（「今週の予定」シート）',
    '',
    '① 白い行が「今週」、水色の行が「来週」。日付と曜日は自動で入るので、時間・内容・ひとことだけ書く',
    '② 時間：例）20:00〜　未定なら空欄でOK（「時間未定」と出ます）',
    '③ 内容：例）VALORANTランク　空欄か「おやすみ」で 🌙おやすみ 表示',
    '④ ひとこと：カードの下に小さく出る一言（なくてOK）',
    '',
    '・サイトに出るのは「今週」の分だけ。日曜23:59が過ぎる（月曜0:00）と、自動で「来週」の分に切り替わります',
    '・月曜の0時台に、来週の行が今週の行へ自動で上がり、来週の行は空になります（次の週の予定をそこに書いてね）',
    '・今日のカードには「🌷 TODAY」が出ます',
    '・1週間ぜんぶ空欄だと、サイトの「今週の予定」欄ごと隠れます',
    '・書いてからサイトに出るまで、最大で数分かかります',
    '・日付・曜日の列と1行目（見出し）、シートの名前は変えないでください',
  ];
  sh.getRange('A17:A45').clearContent().setFontWeight('normal');
  sh.getRange(17, 1, lines.length, 1).setValues(lines.map(l => [l]));
  sh.getRange('A17').setFontWeight('bold');
}
