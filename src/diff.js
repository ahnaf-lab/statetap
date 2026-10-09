'use strict';

function isPlainObject(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function escapePointerSegment(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

function joinPath(basePath, segment) {
  return `${basePath}/${escapePointerSegment(segment)}`;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Compute a minimal set of RFC 6902-style JSON Patch operations that
 * transform `oldValue` into `newValue`. Supports plain objects, arrays,
 * and JSON primitives.
 */
function diff(oldValue, newValue, basePath = '') {
  if (deepEqual(oldValue, newValue)) {
    return [];
  }

  if (isPlainObject(oldValue) && isPlainObject(newValue)) {
    const ops = [];
    const oldKeys = Object.keys(oldValue);
    const newKeys = Object.keys(newValue);

    for (const key of oldKeys) {
      if (!Object.prototype.hasOwnProperty.call(newValue, key)) {
        ops.push({ op: 'remove', path: joinPath(basePath, key) });
      }
    }

    for (const key of newKeys) {
      if (!Object.prototype.hasOwnProperty.call(oldValue, key)) {
        ops.push({ op: 'add', path: joinPath(basePath, key), value: newValue[key] });
      } else {
        ops.push(...diff(oldValue[key], newValue[key], joinPath(basePath, key)));
      }
    }

    return ops;
  }

  if (Array.isArray(oldValue) && Array.isArray(newValue) && oldValue.length === newValue.length) {
    const ops = [];
    for (let i = 0; i < oldValue.length; i++) {
      ops.push(...diff(oldValue[i], newValue[i], joinPath(basePath, i)));
    }
    return ops;
  }

  return [{ op: 'replace', path: basePath, value: newValue }];
}

module.exports = { diff, deepEqual, isPlainObject };
