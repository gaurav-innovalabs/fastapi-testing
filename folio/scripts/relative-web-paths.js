// Post-processes `expo export --platform web` output (dist/) so every URL is
// relative to index.html instead of the origin root. Expo writes
// `/_expo/static/...` script tags and `/assets/...` asset URLs; with those, the
// build only works when served from a domain root. Made relative, it also works
// under a sub-path (GitHub Pages, …) or from an Android WebView asset loader
// (https://appassets.androidplatform.net/assets/folio/index.html).
//
// No dependencies; run by `npm run export:web`. Fails loudly if Expo's output
// format changes and nothing matches.
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', process.argv[2] || 'dist');

function rewrite(file, pairs) {
  let text = fs.readFileSync(file, 'utf8');
  let count = 0;
  for (const [from, to] of pairs) {
    const parts = text.split(from);
    count += parts.length - 1;
    text = parts.join(to);
  }
  fs.writeFileSync(file, text);
  return count;
}

const html = path.join(dist, 'index.html');
const htmlCount = rewrite(html, [
  ['src="/_expo/', 'src="./_expo/'],
  ['href="/_expo/', 'href="./_expo/'],
  ['href="/favicon', 'href="./favicon'],
]);
if (htmlCount === 0) {
  console.error(`relative-web-paths: no root-absolute script URLs found in ${html}; Expo's output changed?`);
  process.exit(1);
}

let jsCount = 0;
const jsDir = path.join(dist, '_expo', 'static', 'js', 'web');
for (const name of fs.readdirSync(jsDir)) {
  if (!name.endsWith('.js')) continue;
  // Bundled asset URLs, e.g. "/assets/assets/ambient.<hash>.m4a".
  jsCount += rewrite(path.join(jsDir, name), [['"/assets/', '"./assets/']]);
}

console.log(`relative-web-paths: ${htmlCount} URL(s) in index.html, ${jsCount} asset URL(s) in JS made relative.`);
