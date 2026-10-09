'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createTap } = require('../src/tap');
const { serveTap } = require('../src/server');
const { reconstructStates } = require('../src/patch');

/**
 * A fixed script of mutations against a realistic nested store, run
 * once here and once inside each test below. Keeping it in one place
 * means the "scripted sequence" and the expected diff/state snapshots
 * it produces can't drift apart from each other.
 */
function runScript(tracker, store) {
  store.todos.push({ id: 1, text: 'write snapshot tests', done: false });
  tracker.tap();

  store.todos[0].done = true;
  tracker.tap();

  store.filter = 'done';
  store.user.name = 'ada';
  tracker.tap();

  store.todos.push({ id: 2, text: 'ship it', done: false });
  tracker.tap();

  store.todos.shift();
  tracker.tap();

  delete store.user.name;
  tracker.tap();
}

function freshStore() {
  return { todos: [], filter: 'all', user: { name: 'guest' } };
}

const EXPECTED_DIFFS = [
  [{ op: 'add', path: '', value: { todos: [], filter: 'all', user: { name: 'guest' } } }],
  // push onto an empty array changes its length, so diff() replaces the
  // whole array rather than diffing element by element (see src/diff.js).
  [{ op: 'replace', path: '/todos', value: [{ id: 1, text: 'write snapshot tests', done: false }] }],
  [{ op: 'replace', path: '/todos/0/done', value: true }],
  [
    { op: 'replace', path: '/filter', value: 'done' },
    { op: 'replace', path: '/user/name', value: 'ada' },
  ],
  [
    {
      op: 'replace',
      path: '/todos',
      value: [
        { id: 1, text: 'write snapshot tests', done: true },
        { id: 2, text: 'ship it', done: false },
      ],
    },
  ],
  [{ op: 'replace', path: '/todos', value: [{ id: 2, text: 'ship it', done: false }] }],
  [{ op: 'remove', path: '/user/name' }],
];

const EXPECTED_FINAL_STATE = {
  todos: [{ id: 2, text: 'ship it', done: false }],
  filter: 'done',
  user: {},
};

function get(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

test('scripted mutation sequence produces the exact expected diff at every step', () => {
  const store = freshStore();
  const tracker = createTap(store);

  runScript(tracker, store);

  const history = tracker.getHistory();
  assert.equal(history.length, EXPECTED_DIFFS.length);

  for (let i = 0; i < EXPECTED_DIFFS.length; i++) {
    assert.deepEqual(history[i].diff, EXPECTED_DIFFS[i]);
    assert.equal(typeof history[i].timestamp, 'number');
  }

  for (let i = 1; i < history.length; i++) {
    assert.ok(history[i].timestamp >= history[i - 1].timestamp);
  }
});

test('scripted mutation sequence replays to the exact expected final state', () => {
  const store = freshStore();
  const tracker = createTap(store);

  runScript(tracker, store);

  const states = reconstructStates(tracker.getHistory());
  assert.deepEqual(states[states.length - 1], EXPECTED_FINAL_STATE);
  assert.deepEqual(states[states.length - 1], store);
});

test('served /history.json for the scripted sequence matches the expected diffs exactly', async () => {
  const store = freshStore();
  const tracker = createTap(store);
  const server = await serveTap(tracker);

  try {
    runScript(tracker, store);

    const res = await get(server, '/history.json');
    assert.equal(res.status, 200);

    const servedHistory = JSON.parse(res.body);
    assert.equal(servedHistory.length, EXPECTED_DIFFS.length);

    for (let i = 0; i < EXPECTED_DIFFS.length; i++) {
      assert.deepEqual(servedHistory[i].diff, EXPECTED_DIFFS[i]);
    }

    assert.deepEqual(servedHistory, tracker.getHistory());
  } finally {
    server.close();
  }
});
