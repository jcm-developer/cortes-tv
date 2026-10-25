/**
 * Checks that the agent documentation still matches the repository.
 *
 * Fails (exit 1) on: an em dash in any tracked text file, a `@returns` tag in a JS/TS docblock,
 * a relative Markdown link or anchor that does not resolve, a file listed in a file map that no
 * longer exists, a file missing from a folder that a strict file map enumerates, and a doc under
 * `docs/` that no `AGENTS.md` or `DESIGN.md` mentions.
 *
 * File maps are opt-in: put `<!-- check-docs: map -->` (or `map strict`) on the line before a
 * fenced tree whose first line is a folder (`src/`) or the repository name.
 *
 * `.checkdocsignore` holds one path prefix per line (`#` comments). A plain prefix skips every
 * check but the em dash one; `em-dash: <prefix>` also skips the em dash check, for content
 * where the dash is legitimate (translations, prompts, prose in another language).
 *
 * Run from anywhere inside the repository: `node scripts/check-docs.mjs`. No dependencies.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const EM_DASH = String.fromCharCode(0x2014);
const BINARY =
  /\.(png|jpe?g|gif|ico|webp|avif|bmp|svgz|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|mp3|mp4|webm|mov|glb|gltf|wasm|pyc|ipynb|db|sqlite)$/i;
const SKIP_TEXT =
  /(^|\/)(_generated\/|vendor\/|node_modules\/|dist\/|build\/|[^/]*-lock\.(json|yaml)$|[^/]*\.lock$|poetry\.lock$|uv\.lock$)/;
const SOURCE = /\.(m?js|cjs|jsx|ts|tsx|vue|svelte|astro)$/;
const MAP_MARKER = /^<!--\s*check-docs:\s*map(\s+strict)?\s*-->\s*$/;
const UNMAPPED = /(\.test\.|\.spec\.|\.d\.ts$|^__init__\.py$|^\.)/;

const errors = [];

/**
 * Returns the repository files git knows about, tracked or new but not ignored.
 *
 * @return {string[]} Paths relative to the root, with forward slashes.
 */
function repoFiles() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return out.split('\n').filter((f) => f && existsSync(join(ROOT, f)));
}

/**
 * Reads a file relative to the root as UTF-8 with LF line endings.
 *
 * @param {string} path - The path relative to the root.
 * @return {string} The file contents.
 */
function read(path) {
  return readFileSync(join(ROOT, path), 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Returns the path prefixes listed in `.checkdocsignore`, split by what they skip.
 *
 * @return {{all: string[], emDash: string[]}} Prefixes that skip the structural checks, and
 *     prefixes that skip the em dash check too.
 */
function ignoredPrefixes() {
  const out = { all: [], emDash: [] };
  if (!existsSync(join(ROOT, '.checkdocsignore'))) return out;
  for (const raw of read('.checkdocsignore').split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const m = line.match(/^em-dash:\s*(.+)$/);
    if (m) out.emDash.push(m[1].trim());
    else out.all.push(line);
  }
  return out;
}

/**
 * Checks whether a path is one of the prefixes or sits under one.
 *
 * @param {string} file - The path relative to the root.
 * @param {string[]} prefixes - The prefixes, as written in `.checkdocsignore`.
 * @return {boolean} True when the path matches a prefix.
 */
function underAny(file, prefixes) {
  return prefixes.some((p) => file === p || file.startsWith(p.endsWith('/') ? p : `${p}/`));
}

/**
 * Converts a Markdown heading to the anchor GitHub generates for it.
 *
 * @param {string} heading - The heading text without the leading hashes.
 * @return {string} The anchor slug.
 */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');
}

/**
 * Lists the anchors of a Markdown file, skipping headings inside code fences.
 *
 * @param {string} text - The Markdown source.
 * @return {Set<string>} The anchor slugs.
 */
function anchorsOf(text) {
  const anchors = new Set();
  let fenced = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;
    const m = !fenced && line.match(/^#{1,6} (.*)$/);
    if (m) anchors.add(slug(m[1]));
  }
  return anchors;
}

/**
 * Parses one fenced file tree into paths relative to the folder it describes.
 *
 * A comment starts at ` #` after the name. A line holding several comma-separated files lists
 * siblings. Directories end in `/`.
 *
 * @param {string[]} lines - The fence lines, without the fences.
 * @return {{root: string, paths: string[], dirs: Set<string>}} The tree root and its entries.
 */
function parseTree(lines) {
  const head = lines[0].match(/^([\w.@-][\w./@-]*)\/\s*(#.*)?$/);
  if (!head) return null;
  const root = head[1] === basename(ROOT) ? '.' : head[1];
  const stack = [];
  const paths = [];
  const dirs = new Set();
  for (const line of lines.slice(1)) {
    const m = line.match(/^((?:[│| ] {3})*)(?:[├└]── )(.*)$/);
    if (!m) continue;
    const depth = m[1].length / 4;
    const body = m[2].split(/\s+#/)[0].trim();
    if (!body) continue;
    const names = body.split(/,\s*/).map((n) => n.trim()).filter(Boolean);
    stack.length = depth;
    if (names.length === 1 && names[0].endsWith('/')) {
      stack[depth] = names[0].slice(0, -1);
      paths.push(`${stack.join('/')}/`);
      continue;
    }
    for (const name of names) {
      if (/[*<>{}]|\.\.\./.test(name)) continue;
      paths.push([...stack.slice(0, depth), name].join('/'));
      dirs.add(stack.slice(0, depth).join('/'));
    }
  }
  return { root, paths, dirs };
}

/* ── 1. Em dash and @returns ── */

const files = repoFiles();
const ignored = ignoredPrefixes();
const isIgnored = (f) => underAny(f, ignored.all);

for (const file of files) {
  if (BINARY.test(file) || SKIP_TEXT.test(file)) continue;
  const lines = read(file).split('\n');
  const checkTags = SOURCE.test(file) && !isIgnored(file);
  const checkDash = !underAny(file, ignored.emDash);
  lines.forEach((line, i) => {
    if (checkDash && line.includes(EM_DASH)) errors.push(`${file}:${i + 1}: em dash (U+2014)`);
    if (checkTags && /^\s*\*\s*@returns\b/.test(line)) errors.push(`${file}:${i + 1}: @returns, use @return`);
  });
}

/* ── 2. Relative links in the docs ── */

const docs = files.filter(
  (f) =>
    f.endsWith('.md') &&
    !isIgnored(f) &&
    (!f.includes('/') || /(^|\/)(AGENTS|CLAUDE)\.md$/.test(f) || f.startsWith('docs/')),
);
for (const doc of docs) {
  const text = read(doc).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;
    const [path, anchor] = target.split('#');
    const file = path ? relative(ROOT, resolve(ROOT, dirname(doc), path)).replace(/\\/g, '/') : doc;
    if (!existsSync(join(ROOT, file))) {
      errors.push(`${doc}: broken link to ${target}`);
      continue;
    }
    if (anchor && file.endsWith('.md') && !anchorsOf(read(file)).has(anchor)) {
      errors.push(`${doc}: missing anchor #${anchor} in ${file}`);
    }
  }
}

/* ── 3. File maps ── */

const known = new Set(files);
for (const doc of docs) {
  const lines = read(doc).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].match(MAP_MARKER);
    if (!marker || !lines[i + 1]?.startsWith('```')) continue;
    const end = lines.indexOf('```', i + 2);
    const tree = parseTree(lines.slice(i + 2, end === -1 ? undefined : end));
    if (!tree) {
      errors.push(`${doc}:${i + 3}: map must start with a folder line such as "src/"`);
      continue;
    }
    const base = dirname(doc) === '.' ? tree.root : join(dirname(doc), tree.root).replace(/\\/g, '/');
    for (const p of tree.paths) {
      if (!existsSync(join(ROOT, base, p))) errors.push(`${doc}: map lists ${join(base, p).replace(/\\/g, '/')}, which does not exist`);
    }
    if (!marker[1]) continue;
    // Strict: a folder whose files the map enumerates must list every tracked file in it.
    const listed = new Set(tree.paths);
    for (const dir of tree.dirs) {
      const abs = join(ROOT, base, dir);
      if (!existsSync(abs)) continue;
      for (const f of readdirSync(abs)) {
        const rel = dir ? `${dir}/${f}` : f;
        const repoPath = join(base, rel).replace(/\\/g, '/').replace(/^\.\//, '');
        if (UNMAPPED.test(f) || !statSync(join(abs, f)).isFile() || !known.has(repoPath)) continue;
        if (!listed.has(rel)) errors.push(`${doc}: map is missing ${repoPath}`);
      }
    }
  }
}

/* ── 4. Every doc under docs/ is indexed ── */

const indexText = files
  .filter((f) => /(^|\/)AGENTS\.md$|^DESIGN\.md$/.test(f) && !isIgnored(f))
  .map(read)
  .join('\n');
for (const f of files.filter((f) => f.startsWith('docs/') && f.endsWith('.md') && !isIgnored(f))) {
  const name = basename(f);
  const sub = f.slice('docs/'.length);
  if (!indexText.includes(f) && !indexText.includes(sub) && !indexText.includes(`\`${name}\``)) {
    errors.push(`${f}: not mentioned in any AGENTS.md or DESIGN.md`);
  }
}

if (errors.length) {
  console.error(`check-docs: ${errors.length} problem(s)\n${errors.map((e) => `  ${e}`).join('\n')}`);
  process.exit(1);
}
console.error('check-docs: ok');
