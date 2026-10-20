# Bun consumer and CLI runtime support

Date: 20 October 2026

Status: Proposed written specification. The user approved the task scope; this document requires review before implementation planning.

## 1. Intent

Complete the remaining Bun portion of F11 for developers installing editable Ombelle components into existing React Vite and Next.js applications. npm, pnpm, and Yarn support already exists. Bun users need the same manager preservation, saved presets, source ownership, and recovery behavior, including when the Ombelle CLI itself runs under Bun.

Keep the repository managed by pnpm. Retain the current exact React/ReactDOM 19.3.1 and Tailwind v4 consumer baseline. This change does not expand the catalog, introduce the editor, or publish the private CLI.

## 2. Scope and boundaries

Include Bun project detection, an exact-dependency adapter, existing text and binary Bun lockfiles, execution of the built CLI under Node and Bun, isolated consumer fixtures, CI, and measured support documentation.

Preserve the established init, add, and theme add flows. Include explicit manager selection, fresh-process preset reuse, dry-run behavior, idempotence, edited-source conflicts, stale metadata, lifecycle suppression, and dependency failure recovery.

Exclude workspace-wide installation, automatic lockfile migration, changing a project's manager, arbitrary shell launchers, framework or React upgrades, new style families, public registry/package publication, and running the entire repository toolchain or consumer frameworks exclusively under Bun. Consumer production builds may use their established Node toolchain; evidence must distinguish the CLI runtime from the build runtime.

## 3. Detection and project ownership

- Extend the shared PackageManager contract and explicit selection flag to include bun.
- Recognize valid bun@<semver> packageManager declarations and supported integrity suffixes consistently with the existing managers. Reject malformed declarations before writes.
- Recognize a unique bun.lock or bun.lockb as Bun evidence when no declaration is present. Treat both Bun files present together, or a Bun file alongside another manager's lockfile, as ambiguous. Explicit selection must not silently resolve multiple lockfiles.
- Preserve the existing explicit-choice rule: a disagreement with packageManager can be overridden only when the unique existing lockfile belongs to the selected manager, with the disagreement visible in the plan. Never invoke Bun against a foreign lockfile as a conversion mechanism.
- Select the project manager from project evidence or a consistent explicit choice, independently of the CLI runner. Preserve saved auto configuration and reject a conflicting saved manager.
- Record Bun in plans, JSON output, new Ombelle configuration, and recovery messages. Record the selected Bun lockfile path as installation metadata rather than inferring it later from the launching runtime.

All inspection and writes remain inside the explicitly targeted application. Governing workspace ownership that cannot be handled within this boundary must fail with a diagnostic before mutation.

## 4. Lockfiles and configuration

Preserve an existing bun.lock as text and an existing bun.lockb as binary. Dependency additions may update the owned lockfile, but must retain its format and filename and must not create the alternative Bun format or npm, pnpm, or Yarn lockfiles. A Bun declaration without a lockfile may create bun.lock only when a real dependency change is required. Init or theme-only operations with no dependency work must not create a lockfile.

Read and fingerprint binary lockfiles as bytes. The current UTF-8 text inspection path is not an adequate integrity check for bun.lockb. Validate all recognized lockfile presence/absence preconditions immediately before application, including the alternative Bun lockfile, and reject metadata changes after planning.

Track project bunfig.toml as a precondition alongside existing package metadata and .npmrc. Do not rewrite user configuration to force installation behavior. Inherited settings must not silently turn the operation into a dry run, lockfile-only update, disabled save, foreign lockfile emission, or unintended format conversion. Override supported settings through the invocation or reject the incompatible setting before source writes. Test these cases with the pinned Bun release rather than assuming flags take precedence uniformly.

The implementation plan must select and verify an available exact Bun release that supports the promised lockfile behavior. If legacy-format preservation cannot be achieved with that release, surface the incompatibility for a written design revision; do not implement migration as a substitute.

## 5. Executable and runtime boundary

Bun is a native executable. Resolve a real bun/bun.exe from a documented explicit executable path, the current executable when the CLI is verifiably running under Bun, or PATH. Do not interpret a native binary as a JavaScript entry. Check the selected executable's version before source mutation when dependency installation is needed. Reject missing, unsupported, or unresolvable launchers with setup guidance.

Keep executable resolution separate from operation argument construction. The prepared command must represent the actual executable and argument prefix so native Bun and existing Node-hosted package-manager scripts can coexist. Invoke argument arrays with shell disabled, the target app as cwd, bounded execution time, and existing output/error handling. Do not evaluate .cmd, PowerShell, or shell script contents as programs.

The built CLI JavaScript entry must run under both Node and Bun. Runtime tests must explicitly start it with the intended executable and verify that runtime identity; a launcher that delegates to Node is not evidence of Bun runtime compatibility. Do not rely on Bun's TypeScript loader to bypass the production build.

Running Ombelle under Bun must not silently change how npm, pnpm, or Yarn dependencies are installed. Their JavaScript launchers must continue to use a verified compatible runtime, with a clear preflight diagnostic if that runtime is unavailable. Cross-runner tests must cover this boundary.

## 6. Dependency operation and recovery

Install only reviewed exact production dependencies. Use Bun's supported add operation with exact-version saving and lifecycle scripts disabled, including project scripts and scripts on trusted dependencies. Do not alter trustedDependencies or use global/workspace installation. Version pinning and script suppression are mandatory outcomes, not assumptions about Bun defaults.

Only invoke the manager when dependency work exists. Dry runs, actual theme add calls, and repeated no-op additions must succeed without an available Bun executable. A successful dependency command must represent a real installed package and saved manifest/lock update; exit zero alone is insufficient regression evidence.

Keep existing source/config transactions and local-edit conflict protections. Fail executable/configuration preflight before source writes. If installation fails after source writes begin, restore staged source/configuration where safe and distinguish that result from uncertain dependency/cache/lockfile state. Name Bun and the actual lockfile in recovery guidance. Do not claim atomic rollback of external manager effects.

## 7. Required verification

Pin exact Node, Bun, and existing manager versions in the implementation plan, fixtures, CI, and evidence. Prove the Bun version is available before publishing install instructions. Keep existing npm, pnpm, and Yarn gates green.

| Consumer manager / lockfile | Frameworks | Built CLI runtime | Required proof |
| --- | --- | --- | --- |
| Bun / bun.lock | Vite and Next.js | Node and Bun | Four real consumer cases |
| Bun / bun.lockb | Vite and Next.js | Node and Bun | Four real consumer cases, binary format retained |
| npm, pnpm, Yarn | Existing supported fixtures | Bun | Real dependency smoke checks preserve the selected manager and its launcher runtime |

For each Bun consumer case, prepare an isolated fixture from a committed lockfile with frozen installation and scripts disabled. Init from a local preset, add Button/Dialog with at least one missing dependency, then add Input in a fresh CLI process without a preset flag. Verify exact production declarations, a physically installed required dependency, saved-preset identity, canonical generated source, preserved unrelated CSS, unchanged manager declaration, owned lockfile format, absence of foreign locks, and a production build.

Additional regressions must cover field-only and lock-only detection, conflicting evidence, binary-byte changes after planning, alternative lockfile appearance, changed bunfig.toml, executable/configuration preflight failure, paths with spaces, actual theme-only operations without a manager, no-op additions, dry-run non-mutation, edited component conflicts, install failure recovery, and lifecycle sentinel absence. Generated artifacts and relevant JSON results must agree across Node and Bun runtime runs.

CI must install the exact Bun release and execute the same fixture/gate commands used locally. Archive machine-readable runtime/version, lockfile, audit, build, and test outcomes linked to the source revision. Run production dependency audits after installing required component dependencies. Keep the existing browser parity matrix; this task's Bun coverage is real CLI installation, source parity, and consumer builds, without expanding browser claims.

## 8. Acceptance and handoff

The task is complete when all eight Bun consumer cases and cross-runner checks pass, scripts remain suppressed, lockfile format and local edits are preserved, existing manager gates remain green, and docs describe the exact verified versions/platforms and remaining exclusions. CI success must be observed on the final pushed revision before claiming hosted verification.

This approval stage permits the written specification only. After the user approves this document, invoke superpowers:writing-plans. Implementation starts after that plan is reviewed and an execution method is selected.

## References

- [Delivery plan](../../07-delivery-plan.md): F11 and the four-manager alpha gate.
- [Installation and theme merging](../../10-installation-and-theme-merging.md): manager and lockfile preservation contract.
- [Yarn evidence](../../evidence/yarn-consumer-support.md): existing manager baseline.
- [Bun lockfiles](https://bun.sh/docs/pm/lockfile): text/binary formats and migration behavior.
- [Bun add](https://bun.sh/docs/pm/cli/add): exact dependency saving and command controls.
- [Bun configuration](https://bun.sh/docs/runtime/bunfig): inherited/local configuration and lockfile options.
- [Bun executable invocation](https://bun.sh/docs/pm/bunx): shebang behavior and explicit Bun runtime execution.
