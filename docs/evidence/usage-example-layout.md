# Usage example layout verification

Recorded on 16 November 2026 after rebasing onto main at 8dac8920 (Organic, PR #156).

The defect was in generated usage examples: independent samples were returned as unspaced fragments, and ToastClose was given the visible word Dismiss despite its fixed icon slot. A real browser reproduction measured zero pixels between the two Alert samples.

The fix adds explicit surrounding layout to 27 compositions and uses the default accessible ToastClose icon. It adapts the Base UI ButtonGroup trigger to render composition. It does not add component margins or change component/style artifacts: all 168 changed stable artifact hashes are usage examples only (28 examples across six stable families).

Validation:
- 78 focused Vitest tests passed: example structure across all families and editions, Toast contracts, stable artifact hashes, and playground tests.
- Repository TypeScript validation passed after refreshing dependencies and generated previews following the rebase.
- 28 browser cases passed in installed Edge: seven styles, Radix/Base UI, light/dark; zero failures/skips/flaky cases.
- Browser checks measured spacing between independent samples and label/control gaps, preserved group-owned button spacing and overlapping avatar groups, and verified named toast dismissal and no page/React composition errors.
- The four existing playgrounds were restored, reinstalled and production-built. The installed Vite playground passed its production browser verification with the expanded layout checks and was restarted for manual inspection.

Screenshots and full browser JSON remain in .artifacts/usage-examples. The compact recorded matrix is [usage-example-layout-run.json](usage-example-layout-run.json). Reproduction commands and the distinction between example layout and internal component spacing are documented in [usage examples](../components/usage-examples.md).

This is a focused usage-example audit, not the complete foundation gate or a new specimen audit. No component stylesheet or component template changed.

## Compact ButtonGroup regression

A follow-up screenshot exposed grid stretching: the Install group had about 726 px of empty trailing shadow. The Install and History example groups now opt out of stretch through example-local alignment; Website stays flexible. The browser audit additionally compares each compact group edge with its visible control bounds, accounting for its own padding and borders. All 28 style/edition/mode cases were rerun; 41 compiler/layout/hash checks and TypeScript validation passed. Component styles remain unchanged.
