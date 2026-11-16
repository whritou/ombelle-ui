# Deferred component findings (#139)

Date: 2026-11-15. Source issue: [#139](https://github.com/whritou/ombelle-ui/issues/139).

| Finding | Resolution |
| --- | --- |
| Folded Breadcrumb items without links disappear | Both menus include text-only items as disabled entries in trail order. |
| Popover and Progress miss fragment-wrapped parts | Both editions descend through nested React fragments. |
| Explicit ProgressLabel ID breaks the accessible name | Progress references the supplied label ID, falling back to its generated ID. |
| Preset confirmation text blanks during closing | Open state is separate from the last confirmation payload, which remains available during exit. |
| DialogBody misses text-node edits | Both observers include subtree and character-data mutations. |
| Sheet snap points changed after mount retain stale height | A changed point sequence reseeds the height; equivalent arrays preserve interaction state. |
| Base Slider overwrites Field control ID | Native IDs remain owned by Base UI; the output links to the actual inputs after mounting. Server markup preserves Field's label association. |
| Indeterminate ring has an empty number span | Both editions omit the number element until value text exists. |
| Tooltip and compiler key maps can drift | Parameterized parity tests cover aliases, glyphs, letters and named keys across all three implementations. |

Verification on Windows, Node 24.19.0 and pnpm 11.25.0:

- Package build passed; schema/catalog output regenerated from source.
- Seven focused unit files: 231 tests passed.
- Generated-source type checks and stable-family artifact checks: 29 tests passed.
- Both affected Playwright suites in Microsoft Edge: 85 tests passed (5.1 minutes).
- Preview regeneration and the full workspace typecheck passed.
- The intentional source corrections update 25 of the 895 stable artifact hashes.

The earlier deferred lists in `variants-075.md` and `variants-076.md` describe
their original review dates; this record supersedes those listed findings.

Final full-suite review also refreshed the older style-baseline Dialog hashes in
all three recorded families. Only Dialog source changed there, matching the
reviewed subtree/character-data observer correction. The six affected compiler
files passed all 70 tests with Node 24.19.0 after this update.
