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
  recorded at that step.
- `GET /history.json` — the tracker's current `getHistory()` output,
  as JSON.

`serveTap(tracker, options)` returns a promise that resolves to the
started `http.Server` once it is listening. By default it binds only
to `127.0.0.1` on an OS-assigned port, since the page exposes the
tracked object's full state history and is meant for local debugging,
not for exposing on a network. Pass `{ port, host }` to override
either. Call `createServer(tracker)` instead if you want the
unstarted `http.Server` to wire up yourself (e.g. to mount it behind
an existing server).

## Status

This project is built autonomously, milestone by milestone, and every
change is gated on its test suite passing before being accepted.
