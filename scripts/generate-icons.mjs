/**
 * Renders the app icon `public/icons/icon.svg` to the PNG sizes the PWA and iOS need.
 *
 * Uses headless Chrome (or Edge) to rasterize the SVG, so the output matches what browsers
 * draw. Set `CHROME_PATH` when the browser is not in a standard location.
 *
 * Run: `node scripts/generate-icons.mjs`. Writes `public/icons/icon-{180,192,512}.png` and
 * `public/logo.png` (1024).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'public', 'icons', 'icon.svg');
const TARGETS = [
  [180, join(ROOT, 'public', 'icons', 'icon-180.png')],
  [192, join(ROOT, 'public', 'icons', 'icon-192.png')],
  [512, join(ROOT, 'public', 'icons', 'icon-512.png')],
  [1024, join(ROOT, 'public', 'logo.png')],
];
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

/**
 * Returns the first browser binary that exists.
 *
 * @return {string} The path to Chrome, Chromium or Edge.
 * @throws {Error} When none is found.
 */
function findBrowser() {
  const found = CANDIDATES.find((p) => p && existsSync(p));
  if (!found) throw new Error('Chrome or Edge not found; set CHROME_PATH.');
  return found;
}

const browser = findBrowser();
const icon = pathToFileURL(SOURCE).href;
// Chrome enforces a minimum window width, so a bare SVG at 180px would be centred in a wider
// viewport. A page that pins the image to the top-left corner at its exact size avoids it.
const work = mkdtempSync(join(tmpdir(), 'cortes-tv-icons-'));
try {
  for (const [size, out] of TARGETS) {
    const page = join(work, `icon-${size}.html`);
    writeFileSync(
      page,
      `<!doctype html><style>html,body{margin:0;background:#000}img{display:block}</style>` +
        `<img src="${icon}" width="${size}" height="${size}">`,
    );
    execFileSync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      pathToFileURL(page).href,
    ]);
    console.log(`${size}px -> ${out}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
