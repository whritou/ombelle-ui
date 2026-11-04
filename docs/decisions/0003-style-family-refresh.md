# Style family refresh decision

4 November 2026. Release 0.4.0 refreshes the flat, minimalist and neo-brutalism style families (flat: tone surfaces, filled fields and a forced-colors boundary; minimalist: hairlines and underlined fields; neo-brutalism: key-press depth and stickers). Liquid glass is unchanged.

Catalog 0.1.0 bytes change in place. The refresh does not bump the catalog or compiler compatibility version (both stay 0.1.0, schema 1.0), so the same catalog version now produces different bytes for `styles/ui-style.css`, `components/ui/*.css` and the scoped Button preset and recipe `button.css` of those three families. This follows the 0.3.0 precedent, which changed the same files in place for hover and pressed states. Each change is declared under `intentionalChanges` in `packages/compiler/test/fixtures/style-baseline.json`, and the baseline test fails on any change that is not declared there.

Existing installs keep their files. Nothing rewrites a project's installed CSS or component source. A project picks up the refresh only when `theme add` or `add` is rerun against it, and the usual modified-file conflict checks apply to files the user edited.

Recipe IDs and revisions stay immutable. Hosted presets and Button recipes published before this release keep their codes, IDs and revisions; the stored data is unchanged and only the catalog bytes compiled from it differ. Output compiled with a published code before and after the upgrade can therefore differ in CSS.

Hashes that changed in the baseline fixture (flat and neo-brutalism entries; the fixture holds no minimalist entry):

| Family | Item | Before | After |
| --- | --- | --- | --- |
| flat | presetHash | `5ff15eb2735326caa531570abf3bb701cc2ad8e054ce90b2940888bed4bd6038` | `7f67582cf9993de917f699fe5068e45a9b888b2d763e65009597ee3e6d9258b4` |
| flat | `styles/ui-style.css` | `c3ecbc2cad02de499c1c46707d38ce2f3ba333ffcdfded5d44b925efcb370f22` | `8203b58b1156166faa88dc6c7a292f830b030aad28bfb60dd5e909da3759a1b4` |
| flat | `styles/ui-tokens.css` | `f8bc2d493d0143755c1db5580ffeadeb225446d5e13ce96faaf0e6e834d334ef` | `d2b679dd9426b1ad277b2777d42323fe8cd009ae59dd724e23af56133b67aacc` |
| neo-brutalism | presetHash | `d4408485d0042453f1b9ba3b2e4340fc9b23ea38f973b49603b76f1b4c9c6fac` | `185439ee3afd7328de82b5cc6de82bb74673c949337f1fac46be55c9dd0d4eff` |
| neo-brutalism | `styles/ui-style.css` | `77f61473299549a3ec932755ff95fd0b305c27ff300e8dfd6f834e211cfb9c89` | `a6736537fe17ae56301e105729486c915954e00f6ed776d7916da9433a4534b4` |
| neo-brutalism | `styles/ui-tokens.css` | `74d62a415f3def94c2ec24001158efe6423dff557150d2295ab857dfa1c4622d` | `bba39121b70d2c5b6c788b6041e89a137961cccd6f3132d543d3d5b22f299b1c` |

The three `intentionalChanges` entries added for this refresh cover the `flat`, `minimalist` and `neo-brutalism` families, each for `styles/ui-style.css`, `components/ui/*.css` and the scoped Button preset and recipe `button.css`, citing `docs/superpowers/plans/2026-11-04-editor-and-style-family-refresh.md`.

Verification at release preparation (4 November 2026, Windows 11, Node 24.19.0, pnpm 11.25.0 through corepack): `pnpm check:foundation` was not completed. It stopped at its `test:integration` step after `build:packages` and `test:unit` passed (91 files, 903 tests). The integration run had 30 failures that are environmental: no native Bun executable on this machine (`Cannot resolve a supported native bun executable`), `tar` cannot read a path on the D: drive (`Cannot connect to D: resolve failed`), and the upstream shadcn probe cannot find `pnpm` on PATH. The 36-consumer matrix, the browser contract and the evidence files were therefore not run or regenerated, and no evidence file changed. The gate must be rerun on a machine with Bun, npm, Yarn, registry access and browsers before the 0.4.0 evidence claims are extended.
