// build.mjs — produce the deployed copy of the planner.
//
// The source of truth is index.html: a single self-contained file that runs as-is when
// opened directly, because it transpiles its own JSX in the browser via babel-standalone.
// That in-browser transpile costs visitors ~2s on load. This script does that transpile
// once, at deploy time, and writes dist/index.html with:
//   - the <script type="text/babel"> body replaced by plain JS (same "react" preset),
//   - the babel-standalone CDN <script> removed (no longer needed),
//   - 'unsafe-eval' stripped from the CSP (only Babel needed it).
// Everything else is byte-identical. guide.html and tests.html are copied verbatim so the
// deployed site (which will serve dist/) still resolves the in-app Guide link and the tests.
//
// @babel/standalone is the only dependency; the GitHub Action installs it at build time.
// Run locally with:  npm i @babel/standalone@7.23.2 --no-save && node build.mjs
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import * as Babel from '@babel/standalone';

const src = await readFile('index.html', 'utf8');

// 1. Slice out the in-browser JSX (from the opening tag to the next </script>).
const OPEN = '<script type="text/babel">';
const start = src.indexOf(OPEN);
if (start < 0) throw new Error('index.html: <script type="text/babel"> not found');
const bodyStart = start + OPEN.length;
const end = src.indexOf('</script>', bodyStart);
if (end < 0) throw new Error('index.html: closing </script> for the app not found');
const jsx = src.slice(bodyStart, end);

// 2. Transpile JSX -> plain JS, the same transform the browser did at runtime.
const { code } = Babel.transform(jsx, { presets: ['react'], filename: 'planner.jsx' });

// 3. Reassemble: plain <script>, no babel CDN tag, no 'unsafe-eval'.
let out = src.slice(0, start) + '<script>\n' + code + '\n' + src.slice(end);
out = out.replace(/^[ \t]*<script\b[^>]*\bbabel-standalone\b[^>]*><\/script>\n/m, '');  // drop the Babel CDN <script> (match the tag, not a mention)
out = out.replace(/^[ \t]*<!--[^\n]*precompiled by build\.mjs[^\n]*-->\n/m, '');         // drop the source-only deploy note
out = out.replace(" 'unsafe-eval'", '');                                                 // Babel was the only reason for it

// 4. Offline: register the service worker (built copy only — SW needs HTTPS/localhost, so it
// has no place in a file:// open of the source). script-src 'self' already allows it.
const reg = `<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>\n`;
out = out.replace('</body>', reg + '</body>');

// 5. Emit dist. sw.js gets APP_VERSION baked into its cache name so each release drops the old cache.
const version = (src.match(/APP_VERSION\s*=\s*"([^"]+)"/) || [])[1] || '0';
const sw = (await readFile('sw.js', 'utf8')).replace('__APP_VERSION__', version);

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', out);
await writeFile('dist/sw.js', sw);
await copyFile('guide.html', 'dist/guide.html');
await copyFile('tests.html', 'dist/tests.html');

console.log(`built dist/index.html (${out.length} bytes; source ${src.length}); sw.js@${version}; copied guide.html, tests.html`);
