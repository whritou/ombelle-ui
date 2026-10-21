# Minimalist foundation support evidence

21 October 2026. The complete local foundation gate passed on Windows with Node **24.21.0**, pnpm **11.25.0**, npm **11.19.0**, Yarn Classic **1.22.22**, modern Yarn **4.18.1**, Bun **1.4.3**, and Microsoft Edge Chromium **155.0.4283.62**. CI retains its Node **24.19.0**, bundled Chromium, and 25-minute budget. This final local run took **16 minutes 15 seconds**; it does not establish a hosted CI result or duration.

The retained [machine-readable summary](minimalist-style-run.json) records source revision `dbd4f8867404f4100513910cc0c95d41791f02a7` with `workingTreeDirty: false`, including the final review fix. This evidence document and report were refreshed afterward. Measured versions, times, hashes, statuses, and contrast values are unchanged. Runtime identities and source hashes are shared by reference; identical app measurements are grouped. Individual font samples are summarized by actual before/after size pairs and counts, retaining all four layouts and all ten app/mode outcomes.

The original full sanitized local report is preserved outside Git at `.artifacts/minimalist-style-run.full.json`; the summary records its SHA-256 and size. CI archives each hosted run's own complete reports and measurements in its `foundation-evidence` artifact, separately from this recorded local run. Referenced logs, full reports, and browser images are local/CI outputs, not embedded files in the committed summary.

All nine gate stages passed: **72 unit tests, 114 integration tests, 48 browser tests, and 34 consumer production builds and audits**, with zero failures, skips, or flaky browser outcomes. The finalized consumer matrix has exactly **15 minimalist cases** and retains all nineteen previous cases. Source hashes confirm installed artifacts match the canonical compiler output. Flat and neo-brutalism baseline artifact hashes remain unchanged.

| Minimalist consumers | Cases | Measured coverage |
| --- | ---: | --- |
| npm / pnpm, Vite and Next.js | 4 | Frozen install, CLI init/add/fresh-process preset reuse, source parity, production audit, Node build, browser |
| Yarn Classic Vite, modern Next.js, PnP Vite | 3 | Frozen install, CLI preset reuse, source parity, production audit, Node build |
| Bun, Vite / Next.js × text / binary lock × Node / Bun CLI | 8 | Frozen install, CLI preset reuse, source parity, whole-graph audit, Node build |

Yarn/Bun rows are not browser-tested. Bun audits all dependencies, including production; other managers audit production dependencies. All framework builds use Node. Theme-only CLI regressions cover all four managers, preserving existing shadcn source/configuration and lock bytes, dry-run, repeat/no-op, later component additions, local-edit conflicts, and custom dark selectors. Theme merging changes tokens and saved defaults; it does not rewrite upstream component styling.

## Rendered states and review attribution

Automated browser checks cover preview plus npm/pnpm Vite/Next.js in light and dark modes. Minimalist state images and normalized DOM match across all five apps. Dialog image comparisons check actual overlay background/opacity, then isolate rounded edges against an opaque black backdrop: native translucent compositing produced 32 corner pixels differing by one channel value. This normalization does not establish pixel parity of the composited page behind the overlay.

Ten actual app/mode measurement rows cover enabled text/state contrast (at least 4.5:1), applicable control boundaries and focus (at least 3:1), invalid-field association, disabled activation, all six Button variants/four sizes, opaque Dialog text, initial focus/trapping/Escape/return, axe checks with Dialog closed/open, reduced motion with a 150ms positive control, and forced colors. The summary groups these into two identical-per-mode results while retaining each app's membership and every contrast value. Disabled contrast is exempt; decorative `border` is distinct from the required `input` boundary token. Ghost/link controls rely on their text rather than an unnecessary boundary.

Each raw row includes four **synthetic 200% font-enlargement** scenarios: 1100/320 CSS pixels with Dialog closed/open. Before/after computed font sizes prove text, native inputs, and portal Dialog content actually double; assertions check wrapping, reachable controls, focus clipping, and horizontal overflow. The summary preserves the size-pair distribution, total samples, and input/Dialog sample counts for each scenario; the original run contains 1,720 samples across the ten app/mode rows. This is not native browser text zoom.

The implementation agent visually inspected default light/dark pages beside flat, both minimalist state fixtures, the dark long Dialog, and the final light/dark state images after the placeholder fix. Minimalist has neutral actions, restrained borders/radius, clear surface separation, and no offset shadows. No human or screen-reader review is claimed. The approved nineteen-color palettes required no adjustment; fixes added distinct dark-secondary hover feedback, wrapping/growth for enlarged controls, correct accessible fixture button names, and explicit full-opacity muted placeholder text.

## Final review and regression

One fresh whole-branch review found no critical issues and one important default-placeholder contrast defect. Tailwind's translucent placeholder default measured about 3.37:1 in light mode. A new rendered pseudo-element regression first reproduced the failure; an evidence regression also reproduced acceptance of missing placeholder samples. The fix uses the existing `muted-foreground` token at full opacity. All ten final app/mode rows now retain normal and focused placeholder contrast: approximately **7.24:1 light** and **12.04:1 dark**, above 4.5:1. Focused regressions, types, and the complete nine-stage gate passed after the fix. There was no second reviewer pass.

One minor preview convenience remains deferred: choosing the Light/Dark header link drops `states=1`, closing the expanded state fixture. Direct URLs with `&states=1` continue to work; this does not affect installed component behavior.

## Repeatable human review checklist — pending

1. Open `/minimalist/?mode=light&states=1` and the dark equivalent. Compare ordinary, hover, pressed, focused, invalid, and disabled states; confirm labels, error text, boundaries, and focus remain clear.
2. Use Tab/Shift+Tab and Enter/Space. Verify disabled controls are skipped and never activate; inspect the associated invalid-field message and reading order.
3. Open the long Dialog by keyboard. Check its name/description, initial Accept focus, forward/backward containment, scrolling to Close, Escape, and focus return to the trigger.
4. Use the browser's actual 200% text zoom and repeat at 320 CSS pixels. Check all content and both Dialog controls remain reachable without horizontal scrolling or clipped focus. The automated synthetic result does not complete this item.
5. Repeat with OS reduced motion and forced colors, NVDA/Chrome on Windows, and VoiceOver/Safari on macOS; record actual versions and observations. Broader browsers and mobile assistive technology remain pending.

Support is limited to foundation **Button, Dialog, and Input** in the documented environments. It does not mark the twelve-component alpha catalog stable, certify arbitrary preset overrides or consuming applications, complete F09 manual acceptance, or make liquid glass available. Workspaces, public distribution, and Bun-exclusive framework builds retain their existing unsupported/unverified boundaries.
