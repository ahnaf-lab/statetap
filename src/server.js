'use strict';

const http = require('node:http');
const { renderUI } = require('./ui');

/**
 * Builds (but does not start) an http.Server that serves the
 * time-travel UI at `/` and the tracker's recorded history as JSON
 * at `/history.json`.
 */
function createServer(tracker) {
  if (!tracker || typeof tracker.getHistory !== 'function') {
    throw new TypeError('statetap: createServer requires a tap tracker');
  }

  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/') {
      const body = renderUI();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/history.json') {
      const body = JSON.stringify(tracker.getHistory());
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(body);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });
}

/**
 * Creates and starts a server for `tracker`, resolving once it is
 * listening. Defaults to an OS-assigned port on the loopback
 * interface only, since this UI exposes the tracked object's full
 * state history and is meant for local debugging.
 */
function serveTap(tracker, options = {}) {
  const { port = 0, host = '127.0.0.1' } = options;
  const server = createServer(tracker);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

module.exports = { createServer, serveTap };
