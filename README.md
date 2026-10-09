# statetap

A zero-dependency Node library you attach to any plain object or store.
Every `tap()` call snapshots the target and records a minimal JSON-patch
diff with a timestamp, so you can see exactly what changed and when
without wiring up framework-specific DevTools.

It also ships a local, single-file time-travel UI: point `serveTap()`
at a tracker and open the page it serves in a browser to scrub through
every recorded step and see the state and diff at that point.

## Install

```sh
npm install statetap
```

Or, inside this repository, just `npm install` to pull in dev tooling
(there are no runtime dependencies to install).

## Usage

```js
const { createTap } = require('statetap');

const store = { count: 0, label: 'idle' };
const tracker = createTap(store);

store.count = 1;
store.label = 'running';
tracker.tap();

store.count = 2;
tracker.tap();

for (const entry of tracker.getHistory()) {
  console.log(entry.timestamp, entry.diff);
}
// => <ts>  [{ op: 'add', path: '', value: { count: 0, label: 'idle' } }]
// => <ts>  [{ op: 'replace', path: '/count', value: 1 }, { op: 'replace', path: '/label', value: 'running' }]
// => <ts>  [{ op: 'replace', path: '/count', value: 2 }]
```

`tracker.tap()` compares the target's current state against the
snapshot taken on the previous `tap()` call and returns a
`{ timestamp, diff }` entry, where `diff` is an array of RFC 6902-style
JSON Patch operations (`add` / `remove` / `replace`). Calling `tap()`
with no changes since the last call records an empty diff.

Other methods on the object returned by `createTap`:

- `getHistory()` — the full list of recorded `{ timestamp, diff }` entries.
- `getSnapshot()` — a deep clone of the most recently tapped state.
- `reset()` — discard history and start over from the target's current state.

statetap tracks JSON-compatible data (plain objects, arrays, strings,
numbers, booleans, `null`). Functions, class instances, and other
non-JSON values are not supported, since diffs are snapshotted via
JSON cloning so they stay dependency-free and easy to serialize.

### Time-travel UI

`serveTap()` starts a plain `node:http` server that serves a single
self-contained HTML page (no bundler, no external assets) plus one
JSON endpoint it reads from:

```js
const { createTap, serveTap } = require('statetap');

const store = { count: 0, label: 'idle' };
const tracker = createTap(store);

serveTap(tracker).then((server) => {
  const { port } = server.address();
  console.log(`statetap UI at http://127.0.0.1:${port}/`);
});

store.count = 1;
tracker.tap();
```

- `GET /` — the time-travel UI: a slider that scrubs through every
  recorded step, showing the reconstructed state and the diff
  recorded at that step. Moving the slider replays the history's
  diffs client-side up to the selected index — no server round trip
  per step.
- `GET /history.json` — the tracker's current `getHistory()` output,
  as JSON.

The replay logic that reconstructs state from diffs
(`applyPatch` / `reconstructStates`) is also exported from the
package, in case you want to reconstruct a past state outside the
browser UI:

```js
const { applyPatch, reconstructStates } = require('statetap');

const states = reconstructStates(tracker.getHistory());
states[2]; // the tracked object's state as of the 3rd tap()
```

The page embeds these exact functions (via `.toString()`) into its
single-file client script, so the replay code that ships to the
browser is the same code covered by the test suite.

`serveTap(tracker, options)` returns a promise that resolves to the
started `http.Server` once it is listening. By default it binds only
to `127.0.0.1` on an OS-assigned port, since the page exposes the
tracked object's full state history and is meant for local debugging,
not for exposing on a network. Pass `{ port, host }` to override
either. Call `createServer(tracker)` instead if you want the
unstarted `http.Server` to wire up yourself (e.g. to mount it behind
an existing server).

## Adapters

`createTap` snapshots a mutable object on demand, by re-reading it
every time you call `tap()`. That fits a plain object or class
instance you mutate in place, but it doesn't fit state containers like
Redux or Zustand, which replace their entire state with a new object
on every update and announce that moment themselves instead of
waiting to be polled.

For those, use `tapStore(store)` instead. It works with anything that
exposes a `getState()` method and a `subscribe(listener)` method that
calls `listener()` after each state change — which is the shape of a
plain Redux store and of a Zustand vanilla store (the object `create()`
returns), so the same adapter covers both without importing either
library:

```js
const { tapStore, serveTap } = require('statetap');

// Zustand
const useStore = require('zustand').create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
const tracker = tapStore(useStore);

useStore.getState().increment();
useStore.getState().increment();

serveTap(tracker);
```

```js
const { tapStore, serveTap } = require('statetap');
const { createStore } = require('redux');

function counter(state = { count: 0 }, action) {
  if (action.type === 'increment') return { count: state.count + 1 };
  return state;
}

const store = createStore(counter);
const tracker = tapStore(store);

store.dispatch({ type: 'increment' });

serveTap(tracker);
```

`tapStore` returns an object with the same `getHistory()` /
`getSnapshot()` methods as `createTap`'s tracker, so it plugs straight
into `serveTap` / `createServer`, plus `unsubscribe()` to stop
recording. It records one `add` entry up front from the store's state
at the time `tapStore` was called, then one `replace`/`add`/`remove`
diff per subsequent notification — it never calls `dispatch` or
`setState` itself, it only reacts to the store's own notifications.

Neither Zustand nor Redux is a dependency of this package — the
adapter only relies on the `getState`/`subscribe` shape both libraries
happen to share, so nothing is installed unless you bring the store
library yourself.

## Status

This project is built autonomously, milestone by milestone, and every
change is gated on its test suite passing before being accepted.
