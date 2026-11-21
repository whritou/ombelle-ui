# CLI installer safety and correctness

Date: 21 November 2026. Commit: `d162ab30586f57a2bd8b88dc8511e43fd5664bbf` (0.9.1), worktree branch `docs/1-0-audits-wave-1`.
Environment: Windows 11 (NTFS, case-insensitive), Node 24.19.0, Git Bash, system Git setting `core.autocrlf=true`. CLI built by `pnpm build:packages` in the worktree; every reproduction ran `node packages/cli/dist/main.js` against copies of `fixtures/next` (with a one-line `src/app/globals.css` added) or `fixtures/shadcn/next`, in a scratch directory outside the repository. Package managers were replaced by local stub `pnpm.cjs` files on `PATH` where an install had to hang or fail; no real dependency install and no network request beyond a local stub server ran.

Covered: all of `packages/cli/src` (main.ts, plan/, apply/, project/, snapshots/, the preset and recipe file readers, format.ts), read end to end, except `project/component-presets.ts` and `snapshots/cache.ts` ACL logic, which I read only for the paths that affect installs. Reproductions for plan/apply separation, crash and dependency-failure recovery, conflict detection (line endings, BOM, invalid UTF-8, case, junctions), CSS merging, manager detection, remote-input failures and exit codes.

Not covered, and why:
- The prompt names `registry/`. It still exists as `packages/cli/src/registry/build.ts`, but it is a pure function used only by `packages/cli/test/registry.test.ts`; the CLI never calls it, so it has no install behaviour to audit.
- Real npm, Yarn and Bun installs: they need the network and the documented toolchain, and the prompt rules out the consumer matrix. I checked the manager arguments by reading `apply/manager.ts` and `apply/bun.ts`.
- POSIX symlinks: creating one needs administrator rights on this machine (`New-Item -ItemType SymbolicLink` failed). I tested a directory junction instead.
- The production snapshot service was not contacted. Remote checks used `--snapshot-origin http://127.0.0.1:<port>` with a stub server.

## Summary

Most of the installer's guards do what they say. Planning and `--dry-run` leave the tree byte-identical. Conflicts survive `--yes`. Preconditions are rechecked under an exclusive lock. A failed dependency install restores source and writes `recovery.json`. Paths that escape the project, including a junction, are refused. Remote input is size-capped, timed out, not redirected and origin-checked. Two defects should block 1.0. First, `add` silently replaces dependencies the user already declared with the catalog's exact pin, which on a stock shadcn Next.js project downgrades `lucide-react` from 1.66.0 to 1.55.0. Second, if the process is killed during an apply (for example Ctrl-C during the package install), the project is left half-applied, with no `recovery.json` and a stale `.ombelle-operation.lock` that blocks every later write and is documented nowhere. Below those, the main risks are Windows-specific: a CRLF checkout (Git for Windows' default) makes every managed file an unresolvable conflict, and a case-mismatched directory gets written without a conflict. The theme merge also falls short of its documentation: it shows no diff and ignores `:root` blocks nested in layers.

## Findings

### CLI-01 Adding a component re-pins the user's existing dependencies to the catalog version, including downgrades
- Severity: blocker
- Where: packages/cli/src/plan/components.ts:264-273; packages/cli/src/plan/recipe.ts:145-154; packages/cli/src/plan/component-preset.ts:182-191; packages/cli/src/plan/theme.ts:287-296 (font packages); packages/cli/src/apply/manager.ts:172-201 (`--save-exact` / `--exact` with the pinned version); pins in packages/catalog/src/manifest.ts:1-41
- What happens: a dependency counts as satisfied only if `package.json` declares exactly the catalog's version string (`installed[d.name] !== d.version`). Any range, or any newer exact version, is planned as `<manager> add --save-exact <name>@<pin>`. On the unmodified `fixtures/shadcn/next` project (`lucide-react: ^1.66.0`, lockfile resolved to 1.66.0), `add dialog` plans `lucide-react@1.55.0`. Applying it rewrites the declaration to `1.55.0` and installs an older release, so icons the app imports from 1.56 to 1.66 stop resolving. `class-variance-authority ^0.7.1`, `radix-ui` siblings, `clsx` and `tailwind-merge` ranges are re-pinned the same way. Neither the human plan (`Dependencies: lucide-react@1.55.0`) nor the JSON `dependencyPlan` shows the current version, so `--yes` after `--dry-run` gives no warning. The docs say the opposite: "if the project does not have it, the dependency plan adds it" (docs/foundation-local-usage.md:44), and the manager runs "only when the planned component installation needs dependency changes" (docs/10-installation-and-theme-merging.md:62). `tests/integration/shadcn-theme-merge.test.ts:166-184` stubs the install and never asserts what was planned.
- How verified: reproduced. `cp -r fixtures/shadcn/next sh1`; `node packages/cli/dist/main.js theme add examples/preset.example.json --cwd sh1 --yes`; `node packages/cli/dist/main.js add dialog --cwd sh1 --dry-run --json` gives `dependencyPlan: [{"name":"@radix-ui/react-dialog","version":"1.3.1"},{"name":"clsx","version":"2.1.1"},{"name":"lucide-react","version":"1.55.0"},{"name":"tailwind-merge","version":"3.7.0"}]`, while `sh1/pnpm-lock.yaml` records `lucide-react` specifier `^1.66.0`, version `1.66.0`.
- Suggested change: treat a declared dependency as satisfied when its range (or the installed `node_modules` version) satisfies the catalog's compatible range, and never plan a downgrade. When a declared version is truly incompatible, make it a diagnostic or an explicit opt-in, and put the current and planned versions in both outputs.
- Effort: M

### CLI-02 A killed apply leaves a half-applied project, no recovery record, and a stale lock that blocks every later write
- Severity: blocker
- Where: packages/cli/src/apply/transaction.ts:60-72 (lock), 96-127 (writes before dependencies), 128-138 (dependency install), 152-196 (recovery only in `catch`/`finally`); packages/cli/src/main.ts (no signal handling; `grep -rn SIGINT packages/cli/src` finds nothing); docs/foundation-local-usage.md:21; docs/05-cli-specification.md:135-139
- What happens: recovery runs only inside the JavaScript `catch`/`finally`. If the process is killed, or Ctrl-C arrives (Node's default SIGINT handler exits without running `finally`), nothing is rolled back. Source files and `ui-library.lock.json` have already been renamed into place before the dependency step, and the dependency step can run for up to 120 s. What is left: the new component files, a lock that records them as managed, a missing dependency, `.ombelle-transactions/<uuid>/` holding only `plan.json` and `.bak` files (no `recovery.json`), and `.ombelle-operation.lock`. Every later write then fails with `FILE_CONFLICT: Another operation or an unrecovered lock exists`, exit 4, and the generic next action "Review the reported input and retry.". Nothing in the docs or README names the lock file or says to delete it. Meanwhile `--dry-run` reports `add: planned` with no mention of the unfinished transaction. The documented recovery step ("read the reported transaction recovery.json") cannot be followed because that file is never written, and no `recover` command exists.
- How verified: reproduced. Copied an initialized `fixtures/next` project (`t3`) and removed `lucide-react` from its `package.json`. Put a stub `pnpm.cjs` (`setTimeout(()=>{},60000)`) first on `PATH` and ran `node packages/cli/dist/main.js add dialog --cwd t3 --yes`, killing it with `kill -9` after 6 s. Afterwards `t3` contained `.ombelle-operation.lock`, `.ombelle-transactions/<uuid>/{2.bak,plan.json}`, `src/components/ui/dialog.tsx`, and a lock recording dialog. `add input --cwd t3 --yes [--json]` then returned exit 4 with the message above.
- Suggested change: catch SIGINT/SIGTERM during apply and run the same rollback; write the journal (`recovery.json` with intent) before the first rename; record the PID in the lock, detect a dead owner, and offer documented recovery (restore from `.bak` and release the lock) instead of a bare refusal; document the lock and transaction folder.
- Effort: M

### CLI-03 A CRLF checkout makes every managed file an unresolvable conflict
- Severity: should-fix
- Where: packages/cli/src/plan/components.ts:31-37, 232-252; packages/cli/src/plan/theme.ts:241-252; packages/cli/src/plan/recipe.ts:106-117; packages/cli/src/plan/component-preset.ts:135-153; resolution refusal at packages/cli/src/plan/components.ts:173-183
- What happens: the lock records hashes of the LF bytes the CLI wrote. Git for Windows' default `core.autocrlf=true`, which is the system setting on this machine, checks the same files out with CRLF. Any teammate on Windows who clones the project then hits a hash mismatch on the shared `lib/utils.ts` and `styles/ui-style.css`, which are part of every `add`. Every `add` exits 4 with "Existing source requires an explicit migration", and `theme add` exits 4 with "Style rules were edited or have no provenance". `--overwrite` is refused for managed files, and the docs name no migration route, so the only fix is converting files by hand or editing hashes in the lock.
- How verified: reproduced. Copied an initialized project (`t1` to `t2`), converted `src/lib/utils.ts`, `src/styles/ui-style.css`, `src/components/ui/button.tsx` and `src/ombelle-examples/button.tsx` to CRLF with `sed -i 's/$/\r/'`, then ran `add input --cwd t2 --dry-run` (exit 4, conflicts on utils and ui-style), `theme add t2/ui-preset.json --cwd t2 --dry-run` (exit 4), and `add input --cwd t2 --dry-run --overwrite src/lib/utils.ts --overwrite src/styles/ui-style.css` (exit 2, "doesn't match a file Ombelle can resolve"). `git config --system core.autocrlf` printed `true`.
- Suggested change: compare ownership hashes on line-ending-normalized text (or record both forms), and preserve the file's existing line-ending style when rewriting it. Alternatively, write a `.gitattributes` entry for managed paths during `init`.
- Effort: S

### CLI-04 `add`, recipes and themes write into a case-mismatched directory without a conflict
- Severity: should-fix
- Where: packages/cli/src/plan/components.ts:186-263 (no case check); packages/cli/src/plan/recipe.ts:89-126; packages/cli/src/plan/theme.ts:235-259; compare packages/cli/src/plan/component-preset.ts:113-153, which calls `findCaseInsensitivePathMismatch` (packages/cli/src/project/paths.ts:55-84)
- What happens: on NTFS or APFS, if `src/Components/UI/` already exists, `add button` writes `src/Components/UI/button.tsx` and records `src/components/ui/button.tsx` in the lock. The app builds locally, but on a case-sensitive CI or deployment host the `@/components/ui/button` import and the lock path both point at a directory that does not exist. Only the component-preset planner detects this.
- How verified: reproduced. Copied a fresh fixture (`t8`), created `src/Components/UI/other.tsx`, ran `init --preset examples/preset.example.json --cwd t8 --yes`, then `add button --cwd t8 --yes` (exit 0). `ls t8/src` showed only `Components`; the file landed in `src/Components/UI/button.tsx`; the lock key is `"src/components/ui/button.tsx"`.
- Suggested change: run the existing `findCaseInsensitivePathMismatch` check in `fileChange` (or in every planner) and report a conflict, as the component-preset planner already does.
- Effort: S

### CLI-05 Theme plans never show the CSS diff, so existing token values are replaced unseen
- Severity: should-fix
- Where: packages/cli/src/format.ts:32-117 (human output lists only `action path`); packages/cli/src/format.ts:2-31 (JSON has only `afterContent`); packages/cli/src/plan/theme.ts:206-226; docs/05-cli-specification.md:131; docs/10-installation-and-theme-merging.md:69 (step 6)
- What happens: the docs say a theme merge may replace tokens "after showing their before and after values" and promise to "Show the exact CSS diff". The plan actually prints `update app/globals.css`, and the JSON carries only the new file text. On first adoption, every existing declaration of a managed token (such as a shadcn project's `--primary`, or values the user customized) is overwritten without a conflict (`existedBefore: true`). Once the apply succeeds the transaction folder is deleted, so the old values survive only in version control. A user who reviews `--dry-run` and then passes `--yes` cannot see what they are replacing.
- How verified: read end to end; observed in the `theme add` and `init` runs on `sh1`, `t1` and `t4` (human output shows only `update <css>`).
- Suggested change: add a per-declaration before/after list (selector, property, old value, new value) to both the human and JSON plans, at least for tokens that existed before.
- Effort: S

### CLI-06 The theme merge ignores `:root` and `.dark` nested in `@layer` and appends duplicates
- Severity: should-fix
- Where: packages/cli/src/plan/theme.ts:140-164 (matches only top-level `css.nodes`); docs/10-installation-and-theme-merging.md:66 (step 3: "including supported nesting inside layers … request a specific target instead of appending overrides blindly")
- What happens: a stylesheet that defines tokens in `@layer base { :root {…} .dark {…} }` (the common Tailwind v3-era shadcn layout) gets a second, unlayered `:root` and `.dark` block appended. The unlayered copy wins, so rendering changes, but the user's layered definitions remain as dead duplicates. The docs promise either an in-place edit or a refusal.
- How verified: reproduced. Fresh fixture `t4` with globals.css `@charset "utf-8"; @import "tailwindcss"; @layer base { :root { --background:#000; --primary:red } .dark { --background:#111 } }`, then `init --preset examples/preset.example.json --cwd t4 --yes`. The result has `:root` at lines 5 and 13, `.dark` at lines 9 and 42, and five `--background` declarations.
- Suggested change: find candidate blocks inside `@layer` too. Edit in place when exactly one effective block exists, and refuse with `UNSUPPORTED_PROJECT` when blocks exist both layered and unlayered; otherwise correct the docs.
- Effort: M

### CLI-07 The package-manager rules in the docs differ from the code
- Severity: should-fix
- Where: packages/cli/src/project/inspect.ts:91-107; docs/05-cli-specification.md:99; docs/10-installation-and-theme-merging.md:56-60; docs/foundation-local-usage.md:29
- What happens: the docs say the runner user agent is a fallback when no project evidence exists, and that "conflicting evidence requires an explicit selection". The code never reads the user agent: a project with no lockfile and no `packageManager` field is refused, even for a theme-only `init` that never runs a manager. Two lockfiles are refused even with `--package-manager` (line 92 is unconditional). And `--package-manager` must equal the lockfile's manager in every case, so the selection can only side with the lockfile against `package.json.packageManager`. Following the documented remedy leaves users stuck on exit 3.
- How verified: reproduced. `t14` (no lockfile, no `packageManager`, `npm_config_user_agent=pnpm/…`): `init … --dry-run` gives exit 3. `t15` (pnpm-lock.yaml plus package-lock.json): `init … --dry-run --package-manager pnpm` gives exit 3, "align manager evidence and its single lockfile".
- Suggested change: either implement the documented fallback and explicit override (and skip manager detection for plans with no dependency work), or rewrite the three docs to state the strict rule.
- Effort: S

### CLI-08 Dependency installs are killed after a fixed 120 seconds
- Severity: should-fix
- Where: packages/cli/src/apply/manager.ts:202-235 (`timeout: 120000`)
- What happens: the package manager gets 120 s, a limit nobody can change, before Node sends it SIGTERM. A cold `npm install` in a large Next.js app on a slow link, or a Windows machine scanning with Defender, can exceed that. The install is killed partway through `node_modules` and the manager lockfile, the CLI reports `DEPENDENCY_FAILURE` (exit 6), and the source rollback runs. Retrying hits the same wall, and there is no flag or environment variable to raise it.
- How verified: read end to end.
- Suggested change: remove the hard timeout (Ctrl-C is the user's control) or make it configurable, and when a timeout fires, name it in the error.
- Effort: S

### CLI-09 Exit codes and JSON shapes drift from the spec in failure paths scripts will hit
- Severity: nice-to-have
- Where: packages/cli/src/main.ts:35-45, 195-198, 390-416; packages/cli/src/snapshots/transport.ts:58-79
- What happens: (a) a nonexistent `--cwd` raises a raw `ENOENT … realpath` that main maps to `INTERNAL_ERROR`, exit 1, though the spec reserves 1 for unexpected failures and lists 2 or 3 for bad input. The same goes for any `EACCES`/`EPERM` read and for a malformed ancestor `package.json` read by `assertStandaloneProject`. (b) `UNSUPPORTED_RELEASE` (a snapshot from a newer schema or release) maps to 3, "unsupported project configuration", though it is about the input. (c) Exit 4 arrives in two JSON shapes: `{status:"conflict", changes, warnings}` for plan conflicts, and `{status:"error", error:{code:"FILE_CONFLICT"}}` for lock or precondition failures. The spec does not document the second shape.
- How verified: (a) reproduced with `add button --cwd ./does-not-exist --dry-run --json` (`INTERNAL_ERROR`, exit 1); (b) and (c) read end to end, and (c) was also observed in CLI-02.
- Suggested change: wrap the project-root and filesystem errors in `UNSUPPORTED_PROJECT`/`INVALID_DATA`, and document both exit-4 shapes and the release code before freezing them at 1.0.
- Effort: S

### CLI-10 A file that is not valid UTF-8 gets a false "File changed after planning"
- Severity: nice-to-have
- Where: packages/cli/src/plan/components.ts:31-34 and packages/cli/src/plan/theme.ts:94, 278 (hash of the UTF-8-decoded string) versus packages/cli/src/project/fingerprint.ts:8 and packages/cli/src/apply/transaction.ts:78-91 (hash of raw bytes)
- What happens: planning hashes the decoded text, in which invalid bytes become U+FFFD. Apply hashes raw bytes. A `globals.css` with one Windows-1252 byte in a comment therefore always fails with `FILE_CONFLICT: File changed after planning`, exit 4, which tells the user someone edited the file when nobody did.
- How verified: reproduced. Fresh fixture `t6` with globals.css `/* caf\xe9 */\n@import "tailwindcss";`, then `init --preset examples/preset.example.json --cwd t6 --yes` gives exit 4 with that message.
- Suggested change: hash raw bytes in both places, and reject non-UTF-8 targets with a precise `INVALID_DATA`.
- Effort: S

### CLI-11 Import detection misses `@import url(...)` and prepends above `@charset`
- Severity: nice-to-have
- Where: packages/cli/src/plan/theme.ts:260-273
- What happens: the existing-import check strips only bare quotes, so `@import url("../styles/ui-style.css")` (or one carrying a `layer()` or media suffix) is not recognized, and a duplicate `@import` is prepended. The spec says "Do not append duplicate imports" (docs/05-cli-specification.md:129). The new import is also always prepended, which puts it above an existing `@charset`. `@charset` is then no longer first, so browsers ignore it.
- How verified: reproduced. `t5` globals.css `@import url("../styles/ui-style.css"); @import "tailwindcss";` after `init` contains both imports. `t4` (CLI-06) shows `@import "../styles/ui-style.css";` above `@charset "utf-8";`.
- Suggested change: parse `url()` and strip modifiers when comparing, and insert after any `@charset` (and after leading `@layer` statements).
- Effort: S

### CLI-12 Switching families leaves orphaned token declarations that are no longer tracked
- Severity: nice-to-have
- Where: packages/cli/src/plan/theme.ts:165-178 (only font tokens are removed), 313-314 (records replaced by the new set)
- What happens: going from a liquid-glass preset to a stable one (allowed when no glass-styled components are installed) leaves all 16 `--glass-*` declarations in `globals.css` and drops their records from the lock. Switching back then treats them as user-owned (`existedBefore: true`).
- How verified: reproduced. Fresh `t13`: `init --preset packages/catalog/src/presets/liquid-glass.json --cwd t13 --yes`, then `theme add examples/preset.example.json --cwd t13 --yes`. `grep -c -- --glass` counts 16 in globals.css and 0 in the lock.
- Suggested change: remove declarations the previous lock managed when their value is still unedited (generalize the font-token rule), or at least list them in a notice.
- Effort: S

### CLI-13 The docs say `add button --preset` accepts only local files; the code resolves hosted codes
- Severity: nice-to-have
- Where: docs/10-installation-and-theme-merging.md:46 ("This command accepts local files only; remote and saved preset codes are not resolved"); packages/cli/src/main.ts:143, 183-194, 324-327; the usage string at main.ts:47-49 still says `add button --preset <local.json>`
- What happens: `add button --preset ps_…@1` contacts the snapshot origin and records `componentPresetSources`. The docs contradict that, as does docs/05-cli-specification.md:185, which says resolution is implemented.
- How verified: reproduced. `add button --preset ps_0123…@1 --snapshot-origin http://127.0.0.1:47150 --preset-hash <64×a> --cwd t1 --dry-run` against a 503 stub gives `RESOLUTION_FAILURE`, exit 5, proving it fetched.
- Suggested change: update docs/10 and the usage string.
- Effort: S

### CLI-14 A dependency failure leaves `package.json` and the manager lockfile unrestored, though both were fingerprinted
- Severity: nice-to-have
- Where: packages/cli/src/apply/transaction.ts:128-138, 152-177; packages/cli/src/project/inspect.ts:50, 73-77 (both are already preconditions)
- What happens: when the manager exits non-zero after modifying `package.json` or the lockfile, the CLI restores only the files it planned, reports `sourceRestored: true`, and leaves the manager's partial edits. The spec asks to "report exactly which source and lockfile changes were restored" (docs/05-cli-specification.md:137). Package-state rollback is explicitly not promised (docs/05-cli-specification.md:177), hence nice-to-have. But backing up two files the CLI already reads would cover the most common damage.
- How verified: reproduced. `t16`, with `lucide-react` removed and a stub `pnpm.cjs` that writes `{"broken":true}` to package.json and exits 1, then `add dialog --cwd t16 --yes --json`: exit 6, `recovery.sourceRestored: true`, lock hash unchanged, `package.json` left as `{"broken":true}`.
- Suggested change: back up `package.json` and the detected lockfile with the other `.bak` files, restore them on dependency failure, and list them in `recovery.json`.
- Effort: S

### CLI-15 Rollback leaves created directories, and a failed `recovery.json` write hides the original error
- Severity: nice-to-have
- Where: packages/cli/src/apply/transaction.ts:119 (`mkdir -p` never undone), 174-177 (an unguarded `writeFile` inside `catch`), 193-196 (`finally` close and unlink can also throw)
- What happens: a rolled-back first `add` leaves empty `components/ui/` and `ombelle-examples/` directories. If writing `recovery.json` fails (for example ENOSPC, which is also a likely reason the apply failed), that error replaces the original. `error.recovery` is then lost and the CLI reports `INTERNAL_ERROR` without the transaction path.
- How verified: read end to end.
- Suggested change: track created directories and remove them when empty; guard the `recovery.json` write and always surface the original cause plus the transaction path.
- Effort: S

### CLI-16 Common `tsconfig.json` shapes are rejected
- Severity: nice-to-have
- Where: packages/cli/src/project/inspect.ts:48-57, 139-163
- What happens: `tsconfig.json` goes through `JSON.parse`, so comments or trailing commas (both valid JSONC that TypeScript accepts) fail with `INVALID_DATA: Invalid JSON`, exit 2. `paths` inherited through `extends` is not followed (`Ambiguous or missing import alias`, exit 3). These refusals are safe but block plain projects, and the error does not say JSONC is unsupported.
- How verified: read end to end.
- Suggested change: parse tsconfig as JSONC and follow `extends` for `compilerOptions.paths`/`baseUrl`, or document the restriction in the error's next action.
- Effort: S

## Unverified

- Whether Yarn Berry's `--mode=skip-build` (packages/cli/src/apply/manager.ts:176-178) also skips the root project's own `postinstall`/`prepare`. To settle it: in a Yarn 4 consumer with a root `postinstall` that writes a sentinel file, run an `add` that installs a dependency and check whether the sentinel appears.
- Whether `HTTPS_PROXY` is honoured. The transport uses `http(s).get` with the default agent (packages/cli/src/snapshots/transport.ts:11-17), which on Node 24 follows proxy variables only when `NODE_USE_ENV_PROXY=1` is set; the docs do not mention it. To settle it: resolve a code behind an authenticating proxy with and without that variable.
- Windows `EPERM`/`EBUSY` from `fs.rename` when antivirus or a dev server briefly holds the target (packages/cli/src/apply/transaction.ts:121). There is no retry, so it would roll back with exit 1. To settle it: hold a target open with a share-deny handle during apply.
- Behaviour under a truly full disk: whether rollback `writeFile`s (non-atomic truncate-and-write, transaction.ts:163) can leave a restored file truncated. To settle it: apply on a small full volume.
- POSIX symlink escapes. `safePath` resolves the realpath of the nearest existing ancestor (packages/cli/src/project/paths.ts:31-50), and a junction escape was refused (below), but symbolic links could not be created without administrator rights here. To settle it: rerun the junction case with `ln -s` on Linux or macOS.

## Looked at and found sound

- Plan/apply separation: a local `init` dry-run and an `add dialog input tabs` dry-run leave every file's SHA-256 unchanged (reproduced on `t11` and `t12`). Network access happens only when a code is given, and it is reported as `networkAccess`. Snapshot cache writes happen only after apply (main.ts:369-387). `prepareManager` and Bun's settings probe run only inside `applyPlan`.
- Concurrency and staleness: the lock is taken with `open(..., 'wx')`; preconditions and every planned file's hash are rechecked under the lock and again before each write (transaction.ts:60-113); duplicate destinations are rejected case-insensitively.
- Dependency-failure recovery: exit 6, source and lock restored byte for byte, `recovery.json` written with `packageStateMayHaveChanged: true` (reproduced on `t16`).
- Path containment: `safePath` rejects `..`, absolute and drive-letter paths, UNC, `:`, NUL, reserved device names and trailing dots or spaces, and checks the realpath of the nearest existing ancestor. Alias targets that escape are refused through the same check. A junction from `src/components` to a directory outside the project was refused with `UNSUPPORTED_PROJECT` exit 3 (reproduced on `t10`). Lock artifact keys are only looked up, never used as write targets.
- Conflict handling: an unowned file is a conflict that `--yes` does not override; `--overwrite` is refused for managed files; a case-variant `Button.tsx` is detected as a conflict and replaced only with an explicit `--overwrite` (reproduced on `t9`). Edited managed tokens, including `!important` changes, conflict (theme.ts:193-205). A UTF-8 BOM in globals.css is preserved (reproduced on `t7`).
- Theme idempotence: a second `theme add` with the same preset plans `noop` for the CSS and the style file (reproduced on `t4`).
- Remote input, against a local stub: HTTP 302 is not followed, and 503, a body over 128 KiB, a `text/html` content type and a hung body (aborted at 10 s) all give `RESOLUTION_FAILURE` exit 5. Plain HTTP to a non-loopback origin gives `INVALID_DATA` exit 2. `--offline` with no cache gives exit 5. Custom origins require a pinned 64-hex hash, and responses are verified and their id/revision matched before use (snapshots/input.ts, recipe-input.ts, transport.ts).
- Lifecycle scripts: every install path passes a scripts-off flag (npm and pnpm `--ignore-scripts`, Yarn 1 `--ignore-scripts`, Yarn 2+ `--mode=skip-build`, Bun `--ignore-scripts`). Every spawn uses `shell: false` with argument arrays, and dependency names and versions are pattern-checked before spawn (manager.ts:158-201, bun.ts:461-463).
- Scope isolation: recipe and component-preset plans write only their own files, the shared utility (with ownership checks) and the lock, never `ui-preset.json`, the config or global CSS. `add` and `theme add` carry `recipes`, `componentPresets` and their sources through `baseLock`. Global `theme add` drops and re-attaches only `presetSource`.
- Known gaps in docs/web-alpha-readiness.md: gap 3 and PR11 say `add <component>` conflicts on shadcn's `lib/utils.ts` and that the test removes the file. That no longer holds: the CLI adopts it (`Notice: adopt lib/utils.ts (generated by shadcn)`, reproduced on `sh1`) and `tests/integration/shadcn-theme-merge.test.ts:161-163` asserts the adoption. The exact React 19.3.1 requirement still holds (inspect.ts:114-117).
