# Font import spike

Date: 2026-11-14. Question: does a bare Fontsource `@import` inside `ui-tokens.css` build under each package manager in the Vite and Next fixtures? This is the gate for approach A in `docs/superpowers/specs/2026-11-14-font-pairs-design.md`.

## Environment

- Windows 11, Node 24.19.0, npm 11.19.0, pnpm 11.25.0 (through Corepack), Yarn Classic 1.22.22 (through `npx`), Bun 1.4.4 (through `npx`).
- Fixtures: `fixtures/vite` (Vite 8.3.4, Tailwind 4.3.3) and `fixtures/next` (Next 16.4.2, Tailwind 4.3.3), copied to a temporary directory outside the repository with `packageManager` removed for every manager except pnpm.
- Package: `@fontsource-variable/inter` 5.3.0 (OFL-1.1), added with an exact version and lifecycle scripts disabled.
- Each project had `src/index.css` containing `@import 'tailwindcss';` and `@import './ui-tokens.css';`, and `src/ui-tokens.css` whose first line was `@import '@fontsource-variable/inter';` followed by `:root{--font-family:'Inter Variable',sans-serif}`.

## Result

| Framework | npm | pnpm | Yarn Classic | Bun |
|---|---|---|---|---|
| Vite | pass | pass | pass | pass |
| Next | pass | pass | pass | pass |

A pass means the build exited 0, the built CSS contained an `@font-face` for `Inter Variable`, and `.woff2` files were emitted (7 per build: one per unicode subset).

## Not covered

- Yarn modern (4.x) and Yarn Plug'n'Play were not run. The existing consumer matrix has a `pnp-vite` fixture, so a Plug'n'Play row should be checked in Task 8 if time allows, or recorded as unverified.
- Only the build was checked. No page was loaded in a browser to confirm the font renders.
- Only the variable build of one font was tried. Static Fontsource packages (for example `@fontsource/space-mono/400.css`) use a different file layout and are covered only by the later registry and consumer tests.
