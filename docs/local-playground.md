# Local four-project playground

Run from the Ombelle checkout with Node 24.19.0 and pnpm 11.25.0:

```powershell
pnpm playground setup
pnpm playground status
pnpm playground dev --project vite-fresh
```

Setup builds the local CLI, creates four standalone apps, installs the Ombelle preset and every supported catalog component, generates working pages, and builds each app. The projects are next-fresh, next-shadcn, vite-fresh and vite-shadcn. A failed row does not prevent independent rows from running. Failed prerequisites skip dependent work; the command returns nonzero if any requested work fails.

## Location and prerequisites

The default root is a stable directory named ombelle-playground-<checkout-hash> under your operating system's temporary directory. Status and each run print absolute project/report paths. It is reused across invocations; ordinary setup never replaces existing projects. OS cleanup may remove temporary files. For a permanent location, pass the same explicit root to every command:

```powershell
pnpm playground setup --root D:/Playgrounds/ombelle
pnpm playground dev --root D:/Playgrounds/ombelle --project next-shadcn
```

Keep the root outside any npm/pnpm workspace. The installer rejects applications with workspace ancestors even when the application declares an empty workspace itself. The initial proposed .artifacts location proved incompatible in real CLI verification; the stable external root preserves installer protections.

Real dependency installation needs registry access. Dependency lifecycle scripts are disabled. Browser verification uses Playwright Chromium when installed, falls back to installed Microsoft Edge on Windows when bundled Chromium is absent, or uses the explicit OMBELLE_BROWSER_CHANNEL override. This script uses the local built CLI, not a published package or hosted registry.

Scaffolds come from fixtures/next, fixtures/vite and the genuine Radix shadcn fixtures in fixtures/shadcn. They are not downloaded from the latest upstream scaffolding commands. Setup pins supported React declarations, gives each app an independent empty pnpm workspace, removes preinstalled UI dependencies from fresh rows, and replaces shadcn Next's remote Google-font layout with a local system-font layout. Original shadcn Button source remains unchanged and appears beside Ombelle's Button.

## Commands

All commands accept --root <directory> and --project <id|all>. Selection defaults to all four, except dev, which requires a single ID.

| Command | Behavior |
| --- | --- |
| setup | Create apps, baseline dependencies/snapshots, install preset/components, generate pages and build. Refuse existing app roots. |
| install | Install or reinstall Ombelle in prepared apps. Accept --preset <local-json>. |
| add button card | Plan and apply component additions, refresh gallery and build. |
| theme --preset ./examples/preset.example.json | Plan/apply a global preset and build. |
| dev --project vite-fresh | Run a foreground development server; stop with Ctrl+C or another terminal's stop command. |
| stop | Stop recorded servers through authenticated local control endpoints. Never terminate a process based only on a saved PID. |
| build | Build existing selected apps. |
| verify | Build and temporarily serve production apps; run browser checks and save screenshots. |
| status | Print project paths, installation state, URLs and whether server control state is recorded. |
| report | Regenerate Markdown from saved JSON evidence. |
| uninstall | Restore the pre-Ombelle baseline and reconcile dependencies. |
| clean | Delete owned project folders, retaining reports and baseline backups. |
| help | Print command syntax. |

Ports are 4401 (next-fresh), 4402 (next-shadcn), 4403 (vite-fresh), 4404 (vite-shadcn), all on loopback. Occupied ports cause failure rather than termination of unrelated programs. There is one active invocation per root; to stop a foreground dev command from another terminal, use the stop command, which communicates with that server's control endpoint.

## Explore the pages

The home view links the searchable component gallery, dashboard and settings form. Gallery sections render installed examples for every catalog ID, with permalinks such as ?view=gallery&component=button#component-button. Search filters by component name. Light/dark controls change the installed theme.

The dashboard includes interactive review progress, tabs, cards, badges and a table. Settings uses installed form components and a confirmation dialog with visible saved feedback. These are local state demonstrations; they do not send data to a backend.

## Reports and recovery

Every invocation writes <root>/runs/<timestamp-id>/report.md, summary.json, events.jsonl and per-step records. Process steps also write command, result, stdout and stderr files under the same step index. Installation identity JSON includes component/preset provenance from the local lock. Verify adds light/dark gallery, dashboard and settings screenshots plus browser results.

Passed, failed, skipped, running and interrupted steps remain distinct. Reports update as work completes and survive uninstall/clean. An incomplete previous invocation is marked interrupted on the next run. After a process crash, a dead-owner invocation lock is reclaimed; an uncertain live PID is treated conservatively.

Installation/build/startup operations have timeouts. Logs capture exact failures and return codes rather than reporting that a generated app necessarily works. Focused unit tests are separate from real build/browser evidence.

Uninstall is a playground baseline restoration, not a general public CLI uninstall command. It checks all affected files before writing, refuses edited managed files, preserves unrelated added files, keeps recovery copies and restores source, configuration, manifests and lockfiles. Repeated uninstall is a no-op apart from dependency reconciliation. Dependency restoration can fail after files were restored; the report identifies that incomplete state.

Clean explicitly deletes selected owned apps, including local edits, after checking markers, path containment and server shutdown. Use uninstall to retain apps. Baselines remain outside app folders; a new setup after clean archives the previous baseline. Treat these projects as disposable fixtures and keep important application work elsewhere.

Measured development results are recorded in [playground evidence](evidence/local-playground.md).
