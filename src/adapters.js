'use strict';

const { diff } = require('./diff');
const { deepClone } = require('./clone');

/**
 * Tracks a store's history as a sequence of timestamped JSON-patch
 * diffs, one per state change the store itself announces.
 *
 * Unlike createTap() (which snapshots a mutable object on demand),
 * this is for stores that replace their state wholesale on every
 * update and expose that moment via subscribe() -- which covers both
 * Redux stores and Zustand's vanilla store object (the one returned
 * by zustand's create(), or accessible as useStore itself), since
 * both shapes expose getState() and subscribe(listener). No store
 * library is imported here; only that shape is relied on, which is
 * what keeps this adapter dependency-free.
 */
function tapStore(store) {
  if (!store || typeof store.getState !== 'function' || typeof store.subscribe !== 'function') {
    throw new TypeError('statetap: tapStore requires a store with getState() and subscribe()');
  }

  let snapshot = deepClone(store.getState());
  const history = [
    { timestamp: Date.now(), diff: [{ op: 'add', path: '', value: snapshot }] },
  ];

  const unsubscribe = store.subscribe(() => {
    const nextSnapshot = deepClone(store.getState());
    const ops = diff(snapshot, nextSnapshot);
    history.push({ timestamp: Date.now(), diff: ops });
    snapshot = nextSnapshot;
  });

  return {
    /** Full history of recorded diff entries, oldest first. */
    getHistory() {
      return history.slice();
    },
    /** The most recent snapshot taken of the store's state. */
    getSnapshot() {
      return deepClone(snapshot);
    },
    /** Stop listening to the store's changes. */
    unsubscribe,
  };
}

module.exports = { tapStore };
