'use strict';

const { diff } = require('./diff');
const { deepClone } = require('./clone');

/**
 * Tracks a target object's history as a sequence of timestamped
 * JSON-patch diffs, one per tap() call.
 */
class Tap {
  constructor(target) {
    this.target = target;
    this._snapshot = deepClone(target);
    this._history = [];
    this._recordInitial();
  }

  _recordInitial() {
    this._history.push({
      timestamp: Date.now(),
      diff: [{ op: 'add', path: '', value: this._snapshot }],
    });
  }

  /**
   * Snapshot the current state of the target, diff it against the
   * previous snapshot, and append a timestamped entry to history.
   * Returns the recorded entry (diff may be an empty array if nothing
   * changed since the last tap).
   */
  tap() {
    const nextSnapshot = deepClone(this.target);
    const ops = diff(this._snapshot, nextSnapshot);
    const entry = { timestamp: Date.now(), diff: ops };
    this._history.push(entry);
    this._snapshot = nextSnapshot;
    return entry;
  }

  /** Full history of recorded diff entries, oldest first. */
  getHistory() {
    return this._history.slice();
  }

  /** The most recent snapshot taken of the target. */
  getSnapshot() {
    return deepClone(this._snapshot);
  }

  /** Discard history and start over from the target's current state. */
  reset() {
    this._snapshot = deepClone(this.target);
    this._history = [];
    this._recordInitial();
  }
}

function createTap(target) {
  if (typeof target !== 'object' || target === null) {
    throw new TypeError('statetap: tap target must be a plain object or array');
  }
  return new Tap(target);
}

module.exports = { createTap, Tap };
