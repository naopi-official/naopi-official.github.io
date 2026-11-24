import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, prepareReveal } from '../site/js/motion.js';

test('スライドは最後の次で最初に戻る', () => {
  assert.equal(nextIndex(0, 2), 1);
  assert.equal(nextIndex(1, 2), 0);
  assert.equal(nextIndex(0, 1), 0);
});

test('IntersectionObserver が無い環境では何も隠さない', () => {
  const touched = [];
  const doc = { querySelectorAll: () => [{ classList: { add: c => touched.push(c) } }] };
  assert.equal(prepareReveal(doc, { hasObserver: false, reduced: false }), 0);
  assert.deepEqual(touched, []);
});

test('動きを減らす設定では何も隠さない', () => {
  const touched = [];
  const doc = { querySelectorAll: () => [{ classList: { add: c => touched.push(c) } }] };
  assert.equal(prepareReveal(doc, { hasObserver: true, reduced: true }), 0);
  assert.deepEqual(touched, []);
});

test('スクロール量はキービジュアルの高さまでで止める', async () => {
  const { heroScroll } = await import('../site/js/motion.js');
  assert.equal(heroScroll(-20, 600), 0);
  assert.equal(heroScroll(123.4, 600), 123);
  assert.equal(heroScroll(5000, 600), 600);
});
