'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createTap } = require('../src/tap');
const { createServer, serveTap } = require('../src/server');

function get(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

test('createServer rejects a target without getHistory', () => {
  assert.throws(() => createServer({}), TypeError);
  assert.throws(() => createServer(null), TypeError);
});

test('serveTap serves the time-travel UI as HTML at /', async () => {
  const tracker = createTap({ count: 0 });
  const server = await serveTap(tracker);

  try {
    const res = await get(server, '/');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.body, /<title>statetap<\/title>/);
  } finally {
    server.close();
  }
});

test('serveTap serves the tracker history as JSON at /history.json', async () => {
  const store = { count: 0 };
  const tracker = createTap(store);
  store.count = 1;
  tracker.tap();

  const server = await serveTap(tracker);

  try {
    const res = await get(server, '/history.json');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /application\/json/);

    const history = JSON.parse(res.body);
    assert.deepEqual(history, tracker.getHistory());
    assert.equal(history.length, 2);
    assert.deepEqual(history[1].diff, [{ op: 'replace', path: '/count', value: 1 }]);
  } finally {
    server.close();
  }
});

test('unknown routes return 404', async () => {
  const tracker = createTap({ count: 0 });
  const server = await serveTap(tracker);

  try {
    const res = await get(server, '/nope');
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test('serveTap binds to loopback only by default and resolves a listening server', async () => {
  const tracker = createTap({ count: 0 });
  const server = await serveTap(tracker);

  try {
    assert.equal(server.address().address, '127.0.0.1');
    assert.equal(server.listening, true);
  } finally {
    server.close();
  }
});
