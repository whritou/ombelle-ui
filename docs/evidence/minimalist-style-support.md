# Minimalist foundation support evidence

21 October 2026. The complete local foundation gate passed on Windows with Node **24.21.0**, pnpm **11.25.0**, npm **11.19.0**, Yarn Classic **1.22.22**, modern Yarn **4.18.1**, Bun **1.4.3**, and Microsoft Edge Chromium **155.0.4283.62**. CI retains its Node **24.19.0**, bundled Chromium, and 25-minute budget. This local run took **17 minutes 3 seconds**; it does not establish a hosted CI result or duration.

The retained [machine-readable run](minimalist-style-run.json) records source revision `9f5145da08c57392dbb965b31c25e13a9cc97ab6` with `workingTreeDirty: false`. This evidence document and report were added afterward. Executable paths are reduced to filenames and relative log separators normalized; measured versions, times, hashes, statuses, and font samples are unchanged. Referenced `.artifacts` logs and browser images are local/CI outputs, not embedded files in this report.

All nine gate stages passed: **72 unit tests, 114 integration tests, 48 browser tests, and 34 consumer production builds and audits**, with zero failures, skips, or flaky browser outcomes. The finalized consumer matrix has exactly **15 minimalist cases** and retains all nineteen previous cases. Source hashes confirm installed artifacts match the canonical compiler output. Flat and neo-brutalism baseline artifact hashes remain unchanged.

| Minimalist consumers | Cases | Measured coverage |
| --- | ---: | --- |
| npm / pnpm, Vite and Next.js | 4 | Frozen install, CLI init/add/fresh-process preset reuse, source parity, production audit, Node build, browser |
| Yarn Classic Vite, modern Next.js, PnP Vite | 3 | Frozen install, CLI preset reuse, source parity, production audit, Node build |
| Bun, Vite / Next.js × text / binary lock × Node / Bun CLI | 8 | Frozen install, CLI preset reuse, source parity, whole-graph audit, Node build |

Yarn/Bun rows are not browser-tested. Bun audits all dependencies, including production; other managers audit production dependencies. All framework builds use Node. Theme-only CLI regressions cover all four managers, preserving existing shadcn source/configuration and lock bytes, dry-run, repeat/no-op, later component additions, local-edit conflicts, and custom dark selectors. Theme merging changes tokens and saved defaults; it does not rewrite upstream component styling.

## Rendered states and review attribution

Automated browser checks cover preview plus npm/pnpm Vite/Next.js in light and dark modes. Minimalist state images and normalized DOM match across all five apps. Dialog image comparisons check actual overlay background/opacity, then isolate rounded edges against an opaque black backdrop: native translucent compositing produced 32 corner pixels differing by one channel value. This normalization does not establish pixel parity of the composited page behind the overlay.

Ten actual app/mode measurement rows retain enabled text/state contrast (at least 4.5:1), applicable control boundaries and focus (at least 3:1), invalid-field association, disabled activation, all six Button variants/four sizes, opaque Dialog text, initial focus/trapping/Escape/return, axe checks with Dialog closed/open, reduced motion with a 150ms positive control, and forced colors. Disabled contrast is exempt; decorative `border` is distinct from the required `input` boundary token. Ghost/link controls rely on their text rather than an unnecessary boundary.

Each row includes four **synthetic 200% font-enlargement** scenarios: 1100/320 CSS pixels with Dialog closed/open. Before/after computed font sizes prove text, native inputs, and portal Dialog content actually double; assertions check wrapping, reachable controls, focus clipping, and horizontal overflow. This is not native browser text zoom.

The implementation agent visually inspected default light/dark pages beside flat, both minimalist state fixtures, and the dark long Dialog. Minimalist has neutral actions, restrained borders/radius, clear surface separation, and no offset shadows. No human or screen-reader review is claimed. The approved nineteen-color palettes required no adjustment; fixes added distinct dark-secondary hover feedback, wrapping/growth for enlarged controls, and correct accessible fixture button names.

## Repeatable human review checklist — pending

1. Open `/minimalist/?mode=light&states=1` and the dark equivalent. Compare ordinary, hover, pressed, focused, invalid, and disabled states; confirm labels, error text, boundaries, and focus remain clear.
2. Use Tab/Shift+Tab and Enter/Space. Verify disabled controls are skipped and never activate; inspect the associated invalid-field message and reading order.
3. Open the long Dialog by keyboard. Check its name/description, initial Accept focus, forward/backward containment, scrolling to Close, Escape, and focus return to the trigger.
4. Use the browser's actual 200% text zoom and repeat at 320 CSS pixels. Check all content and both Dialog controls remain reachable without horizontal scrolling or clipped focus. The automated synthetic result does not complete this item.
5. Repeat with OS reduced motion and forced colors, NVDA/Chrome on Windows, and VoiceOver/Safari on macOS; record actual versions and observations. Broader browsers and mobile assistive technology remain pending.

Support is limited to foundation **Button, Dialog, and Input** in the documented environments. It does not mark the twelve-component alpha catalog stable, certify arbitrary preset overrides or consuming applications, complete F09 manual acceptance, or make liquid glass available. Workspaces, public distribution, and Bun-exclusive framework builds retain their existing unsupported/unverified boundaries.
