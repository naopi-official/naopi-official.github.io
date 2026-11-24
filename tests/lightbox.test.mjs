import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepIndex } from '../site/js/lightbox.js';

test('前後の絵への切り替えは端で反対側に回る', () => {
  assert.equal(stepIndex(0, 1, 3), 1);
  assert.equal(stepIndex(2, 1, 3), 0);
  assert.equal(stepIndex(0, -1, 3), 2);
  assert.equal(stepIndex(1, 0, 3), 1);
  assert.equal(stepIndex(0, 1, 0), 0);
});
