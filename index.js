'use strict';

const { createTap, Tap } = require('./src/tap');
const { diff, deepEqual } = require('./src/diff');
const { applyPatch, reconstructStates } = require('./src/patch');
const { createServer, serveTap } = require('./src/server');
const { tapStore } = require('./src/adapters');

module.exports = {
  createTap,
  Tap,
  diff,
  deepEqual,
  applyPatch,
  reconstructStates,
  createServer,
  serveTap,
  tapStore,
};
