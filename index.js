'use strict';

const { createTap, Tap } = require('./src/tap');
const { diff, deepEqual } = require('./src/diff');
const { createServer, serveTap } = require('./src/server');

module.exports = { createTap, Tap, diff, deepEqual, createServer, serveTap };
