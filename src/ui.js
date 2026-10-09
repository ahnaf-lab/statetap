'use strict';

const { applyPatch, reconstructStates } = require('./patch');

/**
 * Renders the single-file time-travel UI. Everything (markup, styles,
 * and client script) lives in one string so the server can respond
 * with it directly -- no bundler, no separate static assets. The
 * replay functions are embedded via `.toString()` so the exact code
 * covered by test/patch.test.js is what runs in the browser.
 */
function renderUI() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>statetap</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #14161a;
    color: #e6e6e6;
  }
  header {
    padding: 12px 16px;
    border-bottom: 1px solid #2a2d33;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  header h1 {
    font-size: 14px;
    margin: 0;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #9fd3ff;
  }
  #scrubber {
    flex: 1;
  }
  #stepLabel {
    min-width: 160px;
    text-align: right;
    font-size: 12px;
    color: #9aa0a8;
  }
  main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: #2a2d33;
    height: calc(100vh - 49px);
  }
  section {
    background: #14161a;
    overflow: auto;
    padding: 12px 16px;
  }
  h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9aa0a8;
    margin: 0 0 8px;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.5;
  }
  #empty {
    padding: 16px;
    color: #9aa0a8;
  }
</style>
</head>
<body>
<header>
  <h1>statetap</h1>
  <input id="scrubber" type="range" min="0" max="0" value="0" step="1" disabled>
  <span id="stepLabel">no history</span>
</header>
<main>
  <section>
    <h2>state at this step</h2>
    <pre id="state"></pre>
  </section>
  <section>
    <h2>diff recorded at this step</h2>
    <pre id="diff"></pre>
  </section>
</main>
<div id="empty" hidden>No history yet. Call tap() on the tracked object, then reload.</div>
<script>
(function () {
  'use strict';

  ${applyPatch.toString()}

  ${reconstructStates.toString()}

  async function main() {
    const res = await fetch('/history.json');
    const history = await res.json();

    const scrubber = document.getElementById('scrubber');
    const stepLabel = document.getElementById('stepLabel');
    const stateEl = document.getElementById('state');
    const diffEl = document.getElementById('diff');
    const emptyEl = document.getElementById('empty');

    if (history.length === 0) {
      emptyEl.hidden = false;
      return;
    }

    const states = reconstructStates(history);

    scrubber.max = String(history.length - 1);
    scrubber.disabled = false;

    function render(index) {
      const entry = history[index];
      stepLabel.textContent = (index + 1) + ' / ' + history.length + '  ·  ' + new Date(entry.timestamp).toLocaleTimeString();
      stateEl.textContent = JSON.stringify(states[index], null, 2);
      diffEl.textContent = JSON.stringify(entry.diff, null, 2);
    }

    scrubber.addEventListener('input', function () {
      render(Number(scrubber.value));
    });

    scrubber.value = String(history.length - 1);
    render(history.length - 1);
  }

  main().catch(function (err) {
    document.getElementById('empty').hidden = false;
    document.getElementById('empty').textContent = 'Failed to load history: ' + err.message;
  });
})();
</script>
</body>
</html>
`;
}

module.exports = { renderUI };
