# Local playground evidence

Generated from actual harness run summaries and browser results.

Environment: Node v24.19.0, pnpm 11.25.0, Windows. Browser: installed Edge.

| Project | Framework version | Components | Build | Browser |
| --- | --- | --- | --- | --- |
| next-fresh | 16.4.2 | 57 | passed | passed |
| next-shadcn | 16.4.3 | 57 | passed | passed |
| vite-fresh | 8.3.4 | 57 | passed | passed |
| vite-shadcn | 8.3.5 | 57 | passed | passed |

All baseline hashes matched after uninstall; both original shadcn Buttons remained byte-identical. Clean retained reports and baselines. Reinstall/build completed, leaving the projects installed.

Earlier failed attempts remain in the machine-readable record and original reports. They exposed the workspace-ancestor restriction, missing bundled Chromium, substring permalink filtering, initial build-config tracking, and a dev-server regression. Later runs verify the corrected behavior.

Focused checks: 14 Vitest tests passed and repository TypeScript checks passed. This is not the complete foundation gate.

Run identities, versions, restoration counts and failure details are in [local-playground-run.json](local-playground-run.json). User commands are in [the playground guide](../local-playground.md).
