# Workflow

How a task moves from idea to commit: the issue that documents it, the commit that ships it and
the comment that closes it. Everything here is written in English.

## 1. Issue first

Every task starts as a GitHub issue, created **before** any code changes. One self-contained
task per issue; split anything larger than `size: L`.

**Title:** imperative, sentence case, no type prefix, no trailing period
("Purge sessions older than 30 days", not "feat: purge sessions.").

**Labels:** one `type:`, one `size:`, one `priority:`, one or more `area:`. Add `status:` only
when blocked or deferred.

**Body**, in this order (templates in `.github/ISSUE_TEMPLATE/`):

```md
## Context

Why this matters now: the current behaviour, what triggered it, the files and symbols
involved (by path and symbol, never by line number), numbers when they exist.

## Goal

The outcome in one or two sentences, not the implementation.

## Steps

1. Concrete steps naming files and symbols.
2. The docs to update (Section 4).
3. The test that proves it.

## Constraints

Optional: what must not change, cost or performance limits, things to avoid.

## Acceptance criteria

- [ ] Observable results a reviewer can check.
- [ ] The gate passes (AGENTS.md, Workflow).
```

Bugs use `Steps to reproduce`, `Expected` and `Actual` instead of `Goal` and `Steps`.

Work found while doing a task that is not part of it becomes its own issue; note "Found while
working on #N" in its Context.

## 2. Commits

- **One line**, English, [Conventional Commits](https://www.conventionalcommits.org/):
  `<type>(<optional scope>): <summary>`. No body, no `Co-Authored-By` or any other trailer.
- **Types:** `feat` new functionality, `fix` bug fix, `docs` documentation only, `refactor`
  no behaviour change, `perf` performance, `test` tests only, `style` formatting only, `build`
  dependencies or build system, `ci` CI config, `chore` everything else, `revert` reverting a
  commit. `!` after the type marks a breaking change.
- **Summary:** lowercase start, imperative mood, no trailing period, at most 72 characters in
  total. Say what changes for the user or the code, not which files were touched
  (`fix: skip stale prices in the fallback quote`, not `fix: update quotes.ts`).
- **Docs travel with the code:** a commit that changes behaviour also updates the docs it makes
  stale (Section 4). Never a separate "update docs" commit afterwards.
- One logical change per commit. The issue number does not go in the subject; the closing
  comment links the commit.
- `.githooks/commit-msg` enforces the format locally (`git config core.hooksPath .githooks`)
  and CI checks every pushed commit with the same script.

## 3. Closing comment

When the work is committed, comment on the issue, then close it if every acceptance criterion
is met. If not, leave it open and say what is missing in the same comment.

```md
Done in <short sha>.

- <What changed and why, one bullet per change, naming files and symbols.>
- <Decisions taken on the way and the reason; trade-offs accepted.>
- Docs: <files updated>, or "none needed" with the reason.

Gate green: <the checks that ran>.
```

Partial work starts with "Partially done in <sha>." and ends with a "Still missing:" list.
Several commits: list each sha with what it did.

## 4. Docs to update

The table in `AGENTS.md` ("Keeping the docs current") says which doc owns which fact. Before
committing, search the docs for every file and symbol you touched and fix whatever no longer
holds, then run `node scripts/check-docs.mjs`.
