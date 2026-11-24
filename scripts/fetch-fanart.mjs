// Googleドライブの「ファンアート」フォルダの画像を取り込み、site/img/fanart/ と site/data/fanart.json を作る。
// GitHub Actions から1時間ごとに実行する。鍵は環境変数 GDRIVE_API_KEY、フォルダは profile.json の fanartFolderId。
// 鍵かフォルダが未設定なら何もしない（サイトは今までどおり profile.json の gallery だけを出す）。
import { readFile, writeFile, appendFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PROFILE = new URL('../site/data/profile.json', import.meta.url);
const OUT = new URL('../site/data/fanart.json', import.meta.url);
const IMG_DIR = new URL('../site/img/fanart/', import.meta.url);
const MAX = 30;

// ---------- 純粋関数（テスト対象） ----------

// スマホやPCが自動でつける名前は作者名ではないので、クレジットに出さない
const AUTO_NAME = /^(img|pxl|dsc|dscn|screenshot|screen ?shot|image|photo|line_|スクリーンショット|名称未設定|無題)[\s_\-\d]/i;

// ファイル名「作者名.jpg」「作者名_2.jpg」「作者名 (1).png」→ 作者名
export function creditFromName(name) {
  const base = String(name || '').replace(/\.[a-z0-9]+$/i, '').trim();
  if (!base || AUTO_NAME.test(base + ' ') || /^\d+$/.test(base)) return '';
  return base.replace(/\s*\(\d+\)$/, '').replace(/[_\-]\d+$/, '').trim();
}

// Drive API の files.list の結果 → サイトに出す一覧（新しい順・画像だけ・最大 MAX 件）
export function shapeFanart(files, max = MAX) {
  if (!Array.isArray(files)) return [];
  return files
    .filter(f => f && /^[\w-]+$/.test(f.id || '') && /^image\//.test(f.mimeType || ''))
    .sort((a, b) => String(b.createdTime || '').localeCompare(String(a.createdTime || '')))
    .slice(0, max)
    .map(f => {
      const credit = creditFromName(f.name);
      return {
        id: f.id,
        src: `img/fanart/${f.id}.jpg`,
        alt: credit ? `${credit}さんのファンアート` : 'なおぴのファンアート',
        credit,
      };
    });
}

// ---------- 取得（Actions で実行） ----------

async function listFolder(folderId, key) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,createdTime)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ドライブの一覧を取得できません（${res.status}）`);
  return (await res.json()).files || [];
}

const exists = p => access(p).then(() => true, () => false);

// 共有された画像を幅1200pxに縮めたJPEGで受け取る（大きな元画像をそのまま載せない）
async function downloadThumb(id, dest) {
  const res = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w1200`);
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) throw new Error(`画像を取得できません（${id}・${res.status}）`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

export async function main() {
  const key = process.env.GDRIVE_API_KEY;
  const profile = JSON.parse(await readFile(PROFILE, 'utf8'));
  const folderId = profile.fanartFolderId;
  const setOutput = v => process.env.GITHUB_OUTPUT && appendFile(process.env.GITHUB_OUTPUT, `fanart_changed=${v}\n`);
  if (!key || !folderId) {
    console.log('ファンアート：鍵かフォルダIDが未設定なのでスキップ');
    await setOutput(false);
    return;
  }

  const items = shapeFanart(await listFolder(folderId, key));
  await mkdir(IMG_DIR, { recursive: true });
  const ok = [];
  for (const item of items) {
    const dest = new URL(`${item.id}.jpg`, IMG_DIR);
    try {
      if (!(await exists(dest))) await downloadThumb(item.id, dest);
      ok.push({ src: item.src, alt: item.alt, credit: item.credit });
    } catch (e) {
      console.warn(e.message); // 1枚失敗しても残りは載せる
    }
  }

  const prev = await readFile(OUT, 'utf8').catch(() => '');
  const next = JSON.stringify(ok, null, 2) + '\n';
  const changed = prev !== next;
  if (changed) await writeFile(OUT, next);
  console.log(`ファンアート：${ok.length}枚${changed ? '（更新あり）' : '（変化なし）'}`);
  await setOutput(changed);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.error(e.message); process.exitCode = 0; }); // 失敗しても公開は止めない
}
