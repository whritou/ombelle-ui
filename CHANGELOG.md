# Changelog

## 0.3.0 — 4 November 2026

- Publish `@ombelle-ui/cli@0.3.0` to npm; website commands use `npx @ombelle-ui/cli@0.3.0`.
- Align all six workspace packages at 0.3.0. Schema 1.0 and catalog/compiler compatibility 0.1.0 are unchanged; recipe schema 1.0 gains an optional field.
- Add optional Button recipe color overrides: `overrides.colors.{light,dark}.{background,foreground,border}`, mapped onto the tokens the chosen variant reads, with the preset color syntax and bounds. CLI 0.2.1 rejects recipes that use them; install those with 0.3.0.
- Add hover and pressed states to flat and neo-brutalism Buttons, and hover to inactive Tabs triggers in the three stable families. Catalog 0.1.0 bytes change in place for those families' `ui-style.css`, `tabs.css` and scoped Button CSS; see `intentionalChanges` in the compiler style baseline.
- Website: Get code publishes the current draft and shows a one-line command for pnpm, npm, Yarn or Bun; publication quotas rise to 30 attempts per minute, 200 per client and 5,000 globally per UTC day.
- Website: full-width preset editor with one-click accent and base color schemes, sliders for numeric design values, a compact liquid-glass strip, and Button editor color controls. The Button editor no longer has a forced-state selector because previews respond to the pointer directly.

- Fix `theme add`, `init` and `add` rejecting projects created by `shadcn init` with pnpm. The settings-only `pnpm-workspace.yaml` it writes (`packages: []`) in the app root is no longer treated as a workspace. Workspaces that declare packages, and any `pnpm-workspace.yaml` in a parent directory, are still rejected.
- Fix Tailwind v4 detection for bare major ranges such as `tailwindcss: "^4"`, which shadcn templates declare.
- Add genuine `shadcn init` Vite and Next.js fixtures and an integration test of the theme-only merge on them.
- Add the experimental `liquid-glass` style family for Button, Badge, Card, Dialog, Tabs and Tooltip, with a built-in preset (blur 12px, opacity 0.87), opaque fallbacks, and a compile-time contrast bound that rejects a `glassOpacity` below the smallest passing value with `INVALID_DATA`. Flat, minimalist and neo-brutalism output is byte-identical.
- Refuse the six form controls with a glass preset: compile and CLI planning fail with `STYLE_UNAVAILABLE` (exit 2) before any write, and `--yes` does not bypass it. Plan and dry-run output for experimental entries add a `Notice:` line and a `notices` JSON array, which is empty for stable families.
- Offer liquid glass in the preset editor with transparency, blur and opacity controls, a limitations panel, and a live contrast readout that blocks export and publication; the Button editor shows the experimental notice beside its export. The snapshot service accepts glass presets once redeployed.
- Make liquid glass look like glass: the backdrop filter now compresses the backdrop with `contrast()` and `brightness()`, and the contrast bound models that filter exactly, so the built-in preset drops from opacity 0.87 to 0.5 (light needs 0.5, dark 0.28) while keeping 4.5:1 over any backdrop. Add a specular sheen (inside the bound), a two-sided edge light and inner depth shadows. New preset fields `glassSaturation`, `glassBackdropContrast`, `glassBackdropTone`, `glassSheen` and `glassRim` are editable in the preset editor; `glassBlurPx` now reaches 40 and `glassOpacity` starts at 0.25. Nested glass drops its filter and uses a separately bounded `--glass-nested-opacity`. The built-in glass palette's muted tokens change to reach these opacities.
- Render the preset editor's liquid glass preview over a bluebell wood photo, and make every family's preview follow the site's light or dark theme.
- Add a liquid-glass browser spec (24 preview and 16 consumer cases) and pnpm Vite and Next.js glass consumers, raising the consumer matrix to 36 and the browser contract to 402 cases. See [liquid glass evidence](docs/evidence/liquid-glass.md) for what ran.

## 0.2.1 — 2 November 2026

- Fix the standalone installer doing nothing when run through a package-manager bin symlink. On Linux and macOS, `npx`, `npm exec` and Bun exited 0 without output with `@ombelle-ui/cli@0.2.0`; Windows shims and direct `node dist/main.js` were unaffected.
- Align all six workspace packages at 0.2.1. Schema 1.0 and catalog/compiler compatibility 0.1.0 are unchanged.
- Show `npx @ombelle-ui/cli@0.2.1` commands on published preset and recipe pages after verifying real production codes.
- Show the same npx runner in the editor export panels for downloaded preset and recipe JSON files.

## 0.2.0 — 2 November 2026

- `@ombelle-ui/cli@0.2.0` was published to npm on 2 November 2026. Use 0.2.1 or later: 0.2.0 does not run through POSIX bin symlinks.
- Align all six workspace packages at 0.2.0 and prepare the standalone installer as `@ombelle-ui/cli@0.2.0` under the project's reserved npm organization.
- Add immutable hosted preset and Button recipe codes, shared Postgres/SQLite publication quotas, and guarded code installation with saved provenance.
- Add explicit editor publication, recovery, share pages and isolated production previews for Vercel.
- Preserve schema 1.0 and catalog/compiler compatibility 0.1.0, existing generated output, project defaults and installer transaction safeguards.
- Public npm publication and Vercel launch remain pending their measured acceptance checks. Earlier entries below describe documentation revisions, not published package versions.

## Unreleased — 23 October 2026

- Add Badge with native span props/ref, default/destructive variants, and flat/minimalist/neo brutalist styling.
- Generate and install independently owned colocated Badge CSS, retaining the existing shared style pack and component bytes.
- Add Badge examples to the generated preview and consumer flow, with API and installation documentation.

## Unreleased — 21 October 2026

- Add local Button recipe installation with separate source, scoped light/dark CSS, saved props/content, and accessible loading behavior.
- Preserve project presets, ordinary components, and recipe provenance through later additions and compatible theme changes; retain conflict and transaction safeguards.

- Define `add button --preset <code-or-file>` as component-scoped preset selection, preserving project defaults, global styling, and other installed components.
- Use the same immutable preset reference for a scoped component or a project-wide `theme add`; saved codes are argument values, not flag names.
- Retain local JSON as an offline product workflow and distinguish presets from recipes that also save props, content, and overrides.
- Specify Button-first scope, provenance, conflict handling, editor export, and validation requirements. These commands remain planned; the current CLI rejects `--preset` on `add`.

## Version 0.2 on 19 October 2026

- Make npm, pnpm, Yarn and Bun mandatory for the first release.
- Add an existing-shadcn installation path using `theme add <preset>` and a direct merge into the configured global CSS file.
- Preserve upstream initialization, aliases, component source, unrelated CSS and the project's package manager and lockfile.
- Save the resolved preset during theme application so future library components inherit it.
- Add package-runner examples, a registry theme example, CSS before and after examples, and release criteria for the merge behavior.
- Distinguish a compatible token update from a full visual-family conversion that needs component changes.

The updated commands and guarantees remain development requirements, not an implemented CLI.
