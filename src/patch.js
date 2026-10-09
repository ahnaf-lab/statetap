'use strict';

/**
 * Apply a sequence of RFC 6902-style JSON Patch operations to `target`,
 * returning the resulting value. Written without any Node-specific API
 * so the exact same function body can run unmodified in the browser
 * (see ui.js, which embeds this via `applyPatch.toString()`).
 */
function applyPatch(target, ops) {
  // Nested (not module-level) so this helper is captured when ui.js
  // embeds this function's source via `.toString()` for the browser.
  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  // Clone before mutating, and clone every value an op assigns, so the
  // result never aliases the caller's target or the diff entries
  // themselves -- required for reconstructStates to produce independent
  // snapshots instead of every entry pointing at the same mutated object.
  let result = clone(target);

  for (const op of ops) {
    const segments = op.path === '' ? [] : op.path.split('/').slice(1).map(function (s) {
      return s.replace(/~1/g, '/').replace(/~0/g, '~');
    });

    if (segments.length === 0) {
      result = op.op === 'remove' ? undefined : clone(op.value);
      continue;
    }

    let node = result;
    for (let i = 0; i < segments.length - 1; i++) {
      node = node[segments[i]];
    }
    const lastKey = segments[segments.length - 1];

    if (op.op === 'remove') {
      if (Array.isArray(node)) node.splice(Number(lastKey), 1);
      else delete node[lastKey];
    } else {
      node[lastKey] = clone(op.value);
    }
  }

  return result;
}

/**
 * Replay a tap() history (an array of `{ diff }` entries) into the
 * sequence of reconstructed states, one per entry, so a UI can jump to
 * any index without re-deriving earlier steps.
 */
function reconstructStates(history) {
  const states = [];
  let current;
  for (const entry of history) {
    current = applyPatch(current, entry.diff);
    states.push(current);
  }
  return states;
}

module.exports = { applyPatch, reconstructStates };
