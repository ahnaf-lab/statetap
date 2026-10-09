'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyPatch, reconstructStates } = require('../src/patch');
const { createTap } = require('../src/tap');
const { diff } = require('../src/diff');

test('applyPatch sets the whole document from an "add" at the root', () => {
  const result = applyPatch(undefined, [{ op: 'add', path: '', value: { count: 0 } }]);
  assert.deepEqual(result, { count: 0 });
});

test('applyPatch replaces a nested path', () => {
  const result = applyPatch({ user: { name: 'a', age: 1 } }, [
    { op: 'replace', path: '/user/age', value: 2 },
  ]);
  assert.deepEqual(result, { user: { name: 'a', age: 2 } });
});

test('applyPatch adds and removes object keys', () => {
  const added = applyPatch({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]);
  assert.deepEqual(added, { a: 1, b: 2 });

  const removed = applyPatch({ a: 1, b: 2 }, [{ op: 'remove', path: '/b' }]);
  assert.deepEqual(removed, { a: 1 });
});

test('applyPatch removes an array element by index', () => {
  const result = applyPatch({ list: [1, 2, 3] }, [{ op: 'remove', path: '/list/1' }]);
  assert.deepEqual(result, { list: [1, 3] });
});

test('applyPatch unescapes ~1 and ~0 in path segments', () => {
  const result = applyPatch({}, [{ op: 'add', path: '/a~1b~0c', value: 1 }]);
  assert.deepEqual(result, { 'a/b~c': 1 });
});

test('reconstructStates replays a history into one state per entry', () => {
  const history = [
    { diff: [{ op: 'add', path: '', value: { count: 0, label: 'idle' } }] },
    { diff: [{ op: 'replace', path: '/count', value: 1 }] },
    { diff: [{ op: 'replace', path: '/label', value: 'running' }] },
  ];

  const states = reconstructStates(history);

  assert.equal(states.length, 3);
  assert.deepEqual(states[0], { count: 0, label: 'idle' });
  assert.deepEqual(states[1], { count: 1, label: 'idle' });
  assert.deepEqual(states[2], { count: 1, label: 'running' });
});

test('reconstructStates on an empty history returns an empty array', () => {
  assert.deepEqual(reconstructStates([]), []);
});

test('reconstructStates matches the live-tapped snapshot at every step', () => {
  const store = { count: 0, tags: ['a'] };
  const tracker = createTap(store);
  const snapshots = [JSON.parse(JSON.stringify(store))];

  store.count = 1;
  tracker.tap();
  snapshots.push(JSON.parse(JSON.stringify(store)));

  store.tags.push('b');
  tracker.tap();
  snapshots.push(JSON.parse(JSON.stringify(store)));

  store.count = 5;
  store.tags = ['only'];
  tracker.tap();
  snapshots.push(JSON.parse(JSON.stringify(store)));

  const replayed = reconstructStates(tracker.getHistory());

  assert.equal(replayed.length, snapshots.length);
  for (let i = 0; i < snapshots.length; i++) {
    assert.deepEqual(replayed[i], snapshots[i]);
  }
});

test('reconstructStates composes with diff() output directly, not just tap()', () => {
  const a = { x: 1 };
  const b = { x: 2, y: [1, 2] };
  const c = { x: 2, y: [1, 2, 3] };

  const history = [
    { diff: [{ op: 'add', path: '', value: a }] },
    { diff: diff(a, b) },
    { diff: diff(b, c) },
  ];

  const states = reconstructStates(history);

  assert.deepEqual(states[0], a);
  assert.deepEqual(states[1], b);
  assert.deepEqual(states[2], c);
});
