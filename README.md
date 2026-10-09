# statetap

A zero-dependency Node library you attach to any plain object or store.
Every `tap()` call snapshots the target and records a minimal JSON-patch
diff with a timestamp, so you can see exactly what changed and when
without wiring up framework-specific DevTools.

This milestone implements the diff engine: snapshotting and minimal
diff computation. A local time-travel UI for scrubbing through recorded
history is planned for a later milestone.

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

## Status

This project is built autonomously, milestone by milestone, and every
change is gated on its test suite passing before being accepted.
