'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { diff, deepEqual } = require('../src/diff');

test('diff returns empty array for identical objects', () => {
  const a = { count: 1, nested: { x: 2 } };
  const b = { count: 1, nested: { x: 2 } };
  assert.deepEqual(diff(a, b), []);
});

test('diff detects a changed primitive value', () => {
  const ops = diff({ count: 1 }, { count: 2 });
  assert.deepEqual(ops, [{ op: 'replace', path: '/count', value: 2 }]);
});

test('diff detects an added key', () => {
  const ops = diff({ a: 1 }, { a: 1, b: 2 });
  assert.deepEqual(ops, [{ op: 'add', path: '/b', value: 2 }]);
});

test('diff detects a removed key', () => {
  const ops = diff({ a: 1, b: 2 }, { a: 1 });
  assert.deepEqual(ops, [{ op: 'remove', path: '/b' }]);
});

test('diff recurses into nested objects and emits minimal paths', () => {
  const ops = diff({ user: { name: 'a', age: 1 } }, { user: { name: 'a', age: 2 } });
  assert.deepEqual(ops, [{ op: 'replace', path: '/user/age', value: 2 }]);
});

test('diff escapes ~ and / in path segments per JSON Pointer', () => {
  const ops = diff({}, { 'a/b~c': 1 });
  assert.deepEqual(ops, [{ op: 'add', path: '/a~1b~0c', value: 1 }]);
});

test('diff replaces whole array when length changes', () => {
  const ops = diff({ list: [1, 2] }, { list: [1, 2, 3] });
  assert.deepEqual(ops, [{ op: 'replace', path: '/list', value: [1, 2, 3] }]);
});

test('diff recurses into same-length arrays element by element', () => {
  const ops = diff({ list: [1, 2, 3] }, { list: [1, 9, 3] });
  assert.deepEqual(ops, [{ op: 'replace', path: '/list/1', value: 9 }]);
});

test('diff on root-level type change replaces the whole document', () => {
  const ops = diff({ a: 1 }, 'now a string');
  assert.deepEqual(ops, [{ op: 'replace', path: '', value: 'now a string' }]);
});

test('deepEqual treats differently-ordered keys as equal', () => {
  assert.equal(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
});
