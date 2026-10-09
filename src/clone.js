'use strict';

/**
 * Deep-clone a JSON-compatible value. statetap only tracks data that can
 * round-trip through JSON (objects, arrays, strings, numbers, booleans,
 * null), so JSON cloning is sufficient and avoids a dependency.
 */
function deepClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

module.exports = { deepClone };
