// CSS・JSを変えたあとに実行する：node scripts/bump-version.mjs
// index.html の style.css / main.js と、js どうしの import に同じ ?v=番号 を付け、
// ブラウザに古いファイルが残って新旧が混ざるのを防ぐ（GitHub Pages は10分キャッシュ）
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('../site/', import.meta.url));
const d = new Date(Date.now() + 9 * 3600 * 1000).toISOString(); // 日本時間
const ver = process.argv[2] || d.slice(0, 16).replace(/[-:T]/g, '');

// site 直下の .html すべて（index.html・news.html など）
for (const name of await readdir(site)) {
  if (!name.endsWith('.html')) continue;
  const html = site + name;
  let h = await readFile(html, 'utf8');
  h = h.replace(/(href="css\/style\.css)(\?v=[^"]*)?"/, `$1?v=${ver}"`)
       .replace(/(src="js\/[\w-]+\.js)(\?v=[^"]*)?"/g, `$1?v=${ver}"`);
  await writeFile(html, h);
}

for (const f of await readdir(site + 'js')) {
  if (!f.endsWith('.js')) continue;
  const p = site + 'js/' + f;
  const s = await readFile(p, 'utf8');
  const t = s.replace(/(from\s+'\.\/[\w-]+\.js)(\?v=[^']*)?'/g, `$1?v=${ver}'`);
  if (t !== s) await writeFile(p, t);
}
console.log('version', ver);
