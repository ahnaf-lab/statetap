'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { tapStore } = require('../src/adapters');

/**
 * A minimal store that follows the shape shared by Redux stores and
 * Zustand's vanilla store object: getState(), subscribe(listener),
 * and some way to replace state wholesale (setState here, dispatch in
 * Redux, setState in Zustand -- tapStore never calls this itself, it
 * only reacts to the subscribe() notification).
 */
function createFakeStore(initialState) {
  let state = initialState;
  const listeners = [];
  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const i = listeners.indexOf(listener);
        if (i !== -1) listeners.splice(i, 1);
      };
    },
    setState(next) {
      state = next;
      for (const listener of listeners) listener();
    },
  };
}

test('tapStore rejects stores without getState()/subscribe()', () => {
  assert.throws(() => tapStore(null), TypeError);
  assert.throws(() => tapStore({}), TypeError);
  assert.throws(() => tapStore({ getState: () => ({}) }), TypeError);
});

test('tapStore records an initial add entry from the store state', () => {
  const store = createFakeStore({ count: 0 });
  const tracker = tapStore(store);
  const history = tracker.getHistory();

  assert.equal(history.length, 1);
  assert.deepEqual(history[0].diff, [{ op: 'add', path: '', value: { count: 0 } }]);
});

test('tapStore records a diff for each store notification', () => {
  const store = createFakeStore({ count: 0, label: 'idle' });
  const tracker = tapStore(store);

  store.setState({ count: 1, label: 'idle' });
  store.setState({ count: 1, label: 'running' });

  const history = tracker.getHistory();
  assert.equal(history.length, 3);
  assert.deepEqual(history[1].diff, [{ op: 'replace', path: '/count', value: 1 }]);
  assert.deepEqual(history[2].diff, [{ op: 'replace', path: '/label', value: 'running' }]);
});

test('tapStore getSnapshot reflects the latest recorded state', () => {
  const store = createFakeStore({ count: 0 });
  const tracker = tapStore(store);

  store.setState({ count: 9 });

  assert.deepEqual(tracker.getSnapshot(), { count: 9 });
});

test('tapStore unsubscribe stops recording further changes', () => {
  const store = createFakeStore({ count: 0 });
  const tracker = tapStore(store);

  tracker.unsubscribe();
  store.setState({ count: 1 });

  assert.equal(tracker.getHistory().length, 1);
});

test('tapStore works with the history-serving UI server', async () => {
  const { createServer } = require('../src/server');
  const store = createFakeStore({ count: 0 });
  const tracker = tapStore(store);
  store.setState({ count: 1 });

  const server = createServer(tracker);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/history.json`);
  const body = await res.json();

  assert.equal(body.length, 2);
  assert.deepEqual(body[1].diff, [{ op: 'replace', path: '/count', value: 1 }]);

  await new Promise((resolve) => server.close(resolve));
});
