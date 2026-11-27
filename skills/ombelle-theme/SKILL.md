---
name: ombelle-theme
description: Use when the user asks to change, switch or apply an Ombelle theme or preset in a project that already uses Ombelle UI, to restyle installed components, to add a component-only preset, or to see which preset the project has saved.
---

# Change an Ombelle theme or preset

Presets set colours, tokens, fonts and the style family. Follow the install loop from the `ombelle-install` skill: `--dry-run --json`, show the plan, `--yes` only when no warning has `resolutions`, stop and ask on `FILE_CONFLICT`, finish with `doctor --json`.

## Get the CLI version

Read `cliVersion` from `https://ombelle-ui.vercel.app/api/v1/catalog`. If that URL is unreachable, use the version on `https://ombelle-ui.vercel.app/docs/getting-started`. Write it wherever a command says `<version>`.

## Get a preset

Lead with a preset code (`ps_…@1`); a preset JSON file the developer already has is the alternative. If they have neither, ask and point them to `https://ombelle-ui.vercel.app/editor/preset`. Never write preset JSON yourself.

## See what is saved

```bash
npx @ombelle-ui/cli@<version> preset show --json
```

This prints the saved preset, its hash, whether it matches the lock and where it came from. Read-only.

## Choose the command

| Goal | Command | What changes |
| --- | --- | --- |
| New palette and tokens only | `theme add` | Global stylesheet and `ui-style.css`; component source is untouched. |
| Switch the whole preset, restyling installed components | `preset apply` | Theme plus every installed component, recompiled. |
| One Button with its own look, project preset unchanged | `add button --preset` | A separate scoped Button; Radix edition only. |

`theme add` across a style-family switch (for example flat to liquid glass) fails with `STYLE_UNAVAILABLE` when installed components carry the old family's styles. Use `preset apply` then, and tell the developer it restyles those components.

Dry run first:

```bash
npx @ombelle-ui/cli@<version> theme add <code> --dry-run --json
```

```bash
npx @ombelle-ui/cli@<version> preset apply <preset> --dry-run --json
```

After the developer accepts the plan, apply it:

```bash
npx @ombelle-ui/cli@<version> preset apply <code> --yes
```

A component-only preset for one Button:

```bash
npx @ombelle-ui/cli@<version> add button --preset <code> --dry-run --json
```

`theme add` and `preset apply` take the preset as an operand, not `--preset`. Edited managed files conflict with `FILE_CONFLICT`; stop and ask, as in `ombelle-install`. Finish with `doctor --json`.

If the preset uses liquid glass, say `Accessibility not guaranteed` and relay the plan's notices (`GLASS_ACCESSIBILITY_CAVEAT`, and `GLASS_FILTER_MOUNT`, which asks the developer to mount `LiquidGlassFilter` once in the root layout).
