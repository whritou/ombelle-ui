# Installed usage example layout

The installer copies the compiler's usage examples into the application's ombelle-examples directory. Those files are demonstrations, including the layout around independent samples. They must not rely on a gallery host adding gaps.

Each component owns its internal spacing. Applications own the spacing between independent components. A component therefore does not get a global margin merely because two examples happened to touch. The compact Install and History examples opt out of grid stretching; the Website group remains flexible to demonstrate a field composition. Button groups retain their family-specific joins, borders and gaps; avatar groups retain overlap; segmented controls retain their internal grouping.

The shared examples now provide explicit grid/flex containers for 27 example compositions: separate alerts/cards/progress bars, label/control fields, distinct button groups, avatars versus avatar groups, badges, calendar/date picker, chips, code blocks, color pickers, skeletons, sliders, spinner text and toggles. This applies to every family, including Organic and experimental liquid glass, in both primitive editions. Progress uses ProgressLabel for its own label spacing.

Toast examples use the icon provided by ToastClose rather than inserting a long visible label into its fixed-size icon slot. Its accessible name remains Dismiss notification. The Base UI ButtonGroup example uses the native render composition instead of Radix's asChild.

## Browser regression audit

From the repository with dependencies installed:

```powershell
pnpm build:packages
pnpm generate:usage-audit
pnpm test:usage-examples
```

Select an installed browser through OMBELLE_BROWSER_CHANNEL when bundled Playwright Chromium is absent. On the recorded Windows environment this was msedge.

The generator writes isolated pages under apps/preview/src/generated/usage-audit. The audit checks all seven families, both editions and both light/dark modes: 28 configurations. It measures separation between independent rendered samples, label/checkbox gaps, family-owned button-group spacing, compact group bounds that match visible controls, intentional avatar overlap, and accessible toast dismissal. It checks page errors and React composition errors. Full-page screenshots and JSON results are written to .artifacts/usage-examples.

This measures generated usage examples, complementing the specimen audit. The specimen audit renders different curated specimens and does not establish that installed usage examples have suitable surrounding layout.

The playground verify command also checks these example layouts in real installed apps. Existing installations retain their guarded source ownership; an updated compiler's examples can require an explicit migration. Do not disable installer conflicts to update them. For disposable playgrounds, uninstall restores their baseline and install regenerates examples from the current local compiler.
