'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTap } = require('../src/tap');

test('createTap rejects non-object targets', () => {
  assert.throws(() => createTap(null), TypeError);
  assert.throws(() => createTap('nope'), TypeError);
  assert.throws(() => createTap(42), TypeError);
});

test('createTap records an initial add entry with a timestamp', () => {
  const store = { count: 0 };
  const tracker = createTap(store);
  const history = tracker.getHistory();

  assert.equal(history.length, 1);
  assert.equal(typeof history[0].timestamp, 'number');
  assert.deepEqual(history[0].diff, [{ op: 'add', path: '', value: { count: 0 } }]);
});

test('tap() records a minimal diff against the previous snapshot', () => {
  const store = { count: 0, label: 'a' };
  const tracker = createTap(store);

  store.count = 1;
  const entry = tracker.tap();

  assert.deepEqual(entry.diff, [{ op: 'replace', path: '/count', value: 1 }]);
  assert.equal(typeof entry.timestamp, 'number');
  assert.equal(tracker.getHistory().length, 2);
});

test('tap() with no changes records an empty diff', () => {
  const store = { count: 0 };
  const tracker = createTap(store);

  const entry = tracker.tap();

  assert.deepEqual(entry.diff, []);
});

test('successive tap() calls accumulate history in order', () => {
  const store = { n: 0 };
  const tracker = createTap(store);

  store.n = 1;
  tracker.tap();
  store.n = 2;
  tracker.tap();

  const history = tracker.getHistory();
  assert.equal(history.length, 3);
  assert.deepEqual(history[1].diff, [{ op: 'replace', path: '/n', value: 1 }]);
  assert.deepEqual(history[2].diff, [{ op: 'replace', path: '/n', value: 2 }]);
});

test('getSnapshot reflects the most recently tapped state, not live mutations', () => {
  const store = { count: 0 };
  const tracker = createTap(store);

  store.count = 5;
  assert.deepEqual(tracker.getSnapshot(), { count: 0 });

  tracker.tap();
  assert.deepEqual(tracker.getSnapshot(), { count: 5 });
});

test('reset() clears history and starts fresh from current target state', () => {
  const store = { count: 0 };
  const tracker = createTap(store);

  store.count = 1;
  tracker.tap();
  tracker.reset();

  const history = tracker.getHistory();
  assert.equal(history.length, 1);
  assert.deepEqual(history[0].diff, [{ op: 'add', path: '', value: { count: 1 } }]);
});
