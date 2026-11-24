import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creditFromName, shapeFanart } from '../scripts/fetch-fanart.mjs';

test('ファイル名から作者名を取り出す', () => {
  assert.equal(creditFromName('もちこ.jpg'), 'もちこ');
  assert.equal(creditFromName('もちこ_2.png'), 'もちこ');
  assert.equal(creditFromName('もちこ (1).jpeg'), 'もちこ');
  assert.equal(creditFromName('@mochiko_art.webp'), '@mochiko_art');
});

test('スマホが自動でつけた名前はクレジットにしない', () => {
  for (const n of ['IMG_1234.jpg', 'PXL_20261124_0101.jpg', 'Screenshot_2026.png', 'スクリーンショット 2026-11-24.png', '12345.jpg', 'image.png'])
    assert.equal(creditFromName(n), '', n);
});

test('画像だけを新しい順に、上限つきで並べる', () => {
  const files = [
    { id: 'a1', name: 'A.jpg', mimeType: 'image/jpeg', createdTime: '2026-11-01T00:00:00Z' },
    { id: 'b2', name: 'メモ.txt', mimeType: 'text/plain', createdTime: '2026-11-03T00:00:00Z' },
    { id: 'c3', name: 'C.png', mimeType: 'image/png', createdTime: '2026-11-02T00:00:00Z' },
    { id: '../x', name: 'D.png', mimeType: 'image/png', createdTime: '2026-11-04T00:00:00Z' },
  ];
  const out = shapeFanart(files);
  assert.deepEqual(out.map(f => f.id), ['c3', 'a1']);
  assert.equal(out[0].src, 'img/fanart/c3.jpg');
  assert.equal(out[0].credit, 'C');
  assert.equal(shapeFanart(files, 1).length, 1);
  assert.deepEqual(shapeFanart(null), []);
});
