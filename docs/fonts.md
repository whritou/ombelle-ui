# Fonts

Presets choose a body font (`fontFamilyId`), a display font (`headingFontFamilyId`) and a code font (`monoFontFamilyId`). The three system stacks (`system-sans`, `system-serif`, `system-mono`) stay the defaults. Every other font below is self-hosted through a pinned [Fontsource](https://fontsource.org) package, so nothing is requested from a third-party host. All fonts are licensed under the SIL Open Font License 1.1 (OFL-1.1).

Roles: a font with `display` can be a heading font, `body` a body font, `mono` a code font. Bricolage Grotesque, Michroma and Young Serif are display-only. The registry lives in `packages/catalog/src/fonts.ts`.

| Id | Label | Roles | Licence | Package | Version |
|---|---|---|---|---|---|
| `dm-sans` | DM Sans | display, body | OFL-1.1 | `@fontsource-variable/dm-sans` | 5.3.0 |
| `geist` | Geist | display, body | OFL-1.1 | `@fontsource-variable/geist` | 5.3.0 |
| `geist-mono` | Geist Mono | mono | OFL-1.1 | `@fontsource-variable/geist-mono` | 5.3.0 |
| `space-grotesk` | Space Grotesk | display, body | OFL-1.1 | `@fontsource-variable/space-grotesk` | 5.3.0 |
| `work-sans` | Work Sans | display, body | OFL-1.1 | `@fontsource-variable/work-sans` | 5.3.0 |
| `space-mono` | Space Mono | mono | OFL-1.1 | `@fontsource/space-mono` | 5.3.0 |
| `bricolage-grotesque` | Bricolage Grotesque | display | OFL-1.1 | `@fontsource-variable/bricolage-grotesque` | 5.3.0 |
| `figtree` | Figtree | display, body | OFL-1.1 | `@fontsource-variable/figtree` | 5.3.0 |
| `inter-tight` | Inter Tight | display, body | OFL-1.1 | `@fontsource-variable/inter-tight` | 5.3.0 |
| `inter` | Inter | display, body | OFL-1.1 | `@fontsource-variable/inter` | 5.3.0 |
| `jetbrains-mono` | JetBrains Mono | mono | OFL-1.1 | `@fontsource-variable/jetbrains-mono` | 5.3.0 |
| `fraunces` | Fraunces | display, body | OFL-1.1 | `@fontsource-variable/fraunces` | 5.3.0 |
| `instrument-sans` | Instrument Sans | display, body | OFL-1.1 | `@fontsource-variable/instrument-sans` | 5.3.0 |
| `ibm-plex-mono` | IBM Plex Mono | mono | OFL-1.1 | `@fontsource/ibm-plex-mono` | 5.3.0 |
| `dm-mono` | DM Mono | mono | OFL-1.1 | `@fontsource/dm-mono` | 5.3.0 |
| `young-serif` | Young Serif | display | OFL-1.1 | `@fontsource/young-serif` | 5.3.0 |
| `nunito` | Nunito | display, body | OFL-1.1 | `@fontsource-variable/nunito` | 5.3.0 |
| `michroma` | Michroma | display | OFL-1.1 | `@fontsource/michroma` | 5.3.0 |
| `exo-2` | Exo 2 | display, body | OFL-1.1 | `@fontsource-variable/exo-2` | 5.3.0 |
| `share-tech-mono` | Share Tech Mono | mono | OFL-1.1 | `@fontsource/share-tech-mono` | 5.3.0 |

## Fonts each style starts with in the editor

The preset editor gives each style these fonts when it is chosen (`styleFamilyFonts` in `packages/catalog/src/fonts.ts`). A font you pick yourself overrides the style's and stays when you switch style; Reset in a picker returns it to the style's font. Built-in presets and the CLI do not use this table, so existing installs are unchanged.

| Style | Body | Display | Code |
|---|---|---|---|
| Flat | DM Sans | same as body | Geist Mono |
| Minimalist | Geist | same as body | Geist Mono |
| Neo-brutalism | Work Sans | Space Grotesk | Space Mono |
| Ombelle | Figtree | Bricolage Grotesque | Geist Mono |
| Liquid glass | Inter | Inter Tight | JetBrains Mono |

Licences and versions were read from the npm registry on 2026-11-14 (`npm view <package> version license`).
