# Code style

How code, comments and tests are written in this repository. Read it before writing or editing
code or tests. Rules that apply to one folder only live in that folder's `AGENTS.md`.

## Naming

- **Files:** Svelte components in PascalCase (`PosterCard.svelte`); modules in `src/lib/` in
  lowercase, one word per concern (`store.ts`, `tmdb.ts`); Node scripts in kebab-case `.mjs`.
- **Code:** camelCase for functions, variables and stores (`appData`, `openDetail`);
  PascalCase for types, interfaces and classes (`StoredTitle`, `TmdbError`); UPPER_SNAKE_CASE
  for module constants (`STORAGE_KEY`, `API_BASE`).
- **Data:** the app model uses camelCase (`posterPath`); TMDB snake_case fields stay inside the
  `Raw*` interfaces of `src/lib/tmdb.ts` and are mapped at that boundary.
- **Storage keys:** `localStorage` keys are prefixed `cortes-tv:` (`cortes-tv:data`,
  `cortes-tv:session`, `cortes-tv:theme`, `cortes-tv:genres`).
- **UI copy** (labels, toasts, error messages shown to the user) is Spanish; identifiers,
  comments and docs are English.

## Comments

- **English**, always. When you touch code commented in another language, switch the comments
  you touch to English; do not mass-translate untouched code.
- Two kinds only: **docblocks** on declarations (format below) and **inline comments** inside a
  body that explain the WHY, never the WHAT. Never comment the change itself ("now uses X",
  "fixed bug"); that belongs in the commit message and the issue.
- Section banners that split a long file (`/* ── Section ── */`, `# ── Section ──`) are allowed.
- No commented-out code, no `TODO` without an issue number (`TODO(#42): ...`).
- **Never an em dash (U+2014)** anywhere: code, comments, docs, commits. It reads as
  AI-written. Use a comma, colon, semicolon, period or parentheses. `check-docs` fails on it.

## Docblocks (Google style)

Every exported or public function, method, class, hook and component carries one. New code adds
it; when you touch a public declaration without one, add it. A comment that documents a
declaration is always a docblock directly above (or, in Python, inside) it, never a line comment.

Rules shared by every language:

- **Summary:** one sentence in the third person, starting with a verb ("Returns", "Builds",
  "Checks"), ending in a period. Further paragraphs, if any, hold the WHY: constraints,
  invariants, traps. Never restate the signature.
- **A blank line** between the summary (or the last paragraph) and the tags or sections.
- **Parameters** in signature order. Each description starts with a capital and ends with a
  period.
- **Return** describes the value, not its type alone. Omit it when nothing is returned and for
  UI components.
- **Errors** (`@throws`, `Raises:`) only for errors a caller is expected to handle.
- **Types live in one place.** Where the language or a type checker declares them in the
  signature (TypeScript, typed Python), the docblock does not repeat them.
- **Constants, fields and short private helpers:** a single-line docblock is enough.
- Line width 100.

### JavaScript (JSDoc)

- `@param {type} name - Description.` Optional: `[name]`; default: `[name=value]`; nullable:
  `{?type}`; object members: `@param {type} args.member - ...`.
- `@return {type} Description.` **Never `@returns`** (`check-docs` fails on it).
- Continuation lines of a tag are indented 4 spaces after the `*`.

```js
/**
 * Returns the total price of the cart items, with the discount applied.
 *
 * Discounts apply before tax because invoices show the taxable base after discount.
 *
 * @param {Object[]} items - The cart lines, each with a price and a quantity.
 * @param {number} [discount=0] - The discount rate, between 0 and 1.
 * @return {number} The total, rounded to two decimals.
 * @throws {RangeError} When the discount is outside 0 to 1.
 */
export function cartTotal(items, discount = 0) { ... }

/**
 * Renders the user's avatar, falling back to their initials.
 *
 * @param {Object} props - The component props.
 * @param {string} props.name - The display name.
 * @param {?string} props.src - The image URL, or null when there is none.
 */
export function Avatar({ name, src }) { ... }

/** How long a session stays valid without activity, in minutes. */
export const SESSION_TIMEOUT_MINUTES = 30;
```

### TypeScript (TSDoc with Google layout)

The same as JavaScript, **without `{type}`**: the signature declares it and `tsc` checks it.

```ts
/**
 * Checks whether two date ranges share at least one day.
 *
 * @param a - The first range, with inclusive bounds.
 * @param b - The second range, with inclusive bounds.
 * @return True when the ranges overlap.
 */
export function rangesOverlap(a: DateRange, b: DateRange): boolean { ... }
```

### Vue, Svelte and Astro components

The `<script>` block follows the JavaScript or TypeScript rules above (by its `lang`).
Document the component with a docblock on its props declaration (`defineProps`,
`$props()`, `interface Props`), one line per prop.

```vue
<script setup lang="ts">
/**
 * Shows a dismissible banner at the top of the page.
 *
 * @param message - The text to show.
 * @param tone - The colour scheme: info, success or error.
 */
const props = defineProps<{ message: string; tone: 'info' | 'success' | 'error' }>();
</script>
```

## Tests

There is no test runner yet. The safety net is the gate: `pnpm check` (types, Svelte and
Astro diagnostics) and `pnpm build`. When tests are added, put them next to the module
(`src/lib/store.test.ts`), add the runner to `package.json` and to the gate in `AGENTS.md`.

- **Names** state the behaviour in English, present tense, third person: "returns null without
  items". No "should", no "works", no arrows.
- **Deterministic:** explicit dates, fixed seeds, no reliance on test order or the network.
  Compare floating-point values with a tolerance.
- **One concept per test**, Arrange, Act, Assert. Assert on results and state, not on which
  helper was called.
- Keep incident references (an ID, a real date) in names and fixtures: they document a real
  regression.
- No focused or skipped tests committed (`.only`, `.skip`, `@pytest.mark.skip` without a reason).
