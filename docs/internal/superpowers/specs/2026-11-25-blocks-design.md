# Blocks: composed sections you browse in every style and install with `ombelle add`

Blocks are the first work after 1.0.0 (published 24 November 2026). A block is a composed section built only from catalog components: a sign-in form, a settings form, a pricing section, a dashboard overview. Each block renders in all eight style families and both editions, appears on the website with a family switcher, and installs into a project with `ombelle add <block-id>` as managed source tracked in the lock. The work targets CLI 1.1.0, a minor release under the 1.x public contract.

## Intent

The product definition (`docs/01-product-requirements.md`) has always ordered the work as components, then composed blocks, then agent guidance. The delivery plan (`docs/07-delivery-plan.md`, "After web alpha") names the first four blocks and two rules: blocks reuse component ids and the project preset, and example-only authentication and data flows are clearly marked so mock UI never looks like a backend integration.

The user's own framing (25 November 2026): they want templates of the app's components in different styles, like shadcn's blocks. People should be able to **browse every block in every style on the site and install it with `ombelle add`**.

Ombelle's advantage over shadcn's blocks is the reason to build this: a shadcn block looks one way, while an Ombelle block follows the project preset, so the same `login-01` is a Papier sign-in in one project and a Neo-brutalism sign-in in another, and the site can show both side by side.

Decisions taken in brainstorming (25 November 2026):

- **Both browse and install.** Blocks are a site gallery and an installable catalog item, not one or the other.
- **Managed blocks (approach A).** Block files are compiled per family and edition and recorded in the lock like component files: `update` refreshes an unedited block, an edited one conflicts with the usual `--overwrite` route, and `doctor` sees it.
- **Example-only actions show an example notice** rather than doing nothing (see "What a block is").
- **CLI 1.1.0 ships before the site's block pages** (see "Documentation and release").

## Goals, non-goals, anti-goals

- **Goals:**
  - Four blocks — `login-01`, `settings-01`, `pricing-01`, `dashboard-01` — in all eight families, both editions, light and dark, that pass the specimen audit and the accessibility target in `docs/03-components-styles-accessibility.md`.
  - `ombelle add <block-id>` installs the block and every catalog component it needs in one plan and one transaction, with dry-run, `--json` and conflict handling unchanged.
  - `update`, `doctor` and `diff` treat installed block files like other managed files.
  - A `/blocks` gallery and a page per block on the website, with a family switcher, light/dark, a width switcher, the source and the install command.
  - A lock written by CLI 1.1 stays readable by every 1.x CLI, and block records survive a 1.0 CLI rewriting the lock.
- **Non-goals:**
  - Full app templates (several pages, routing, an app shell around them). They can come later as presets plus blocks plus Sidebar.
  - More than one variant per block (`login-02` and so on) in this release.
  - Real auth, data fetching, payments or server actions in any block.
  - Recipes or component presets for blocks (`add --recipe` for a block, scoped presets).
  - Changing the preset editor scenes in `apps/preview/src/scenes/`. Blocks may borrow their content, but the scenes stay as they are.
  - A shadcn-registry `registry:block` export.
  - React Native.
- **Anti-goals:**
  - Any change to the bytes of an existing component's default output, its specimens or its stable hashes. A block may only use props components already have.
  - A block that looks like it signs someone in, saves settings or charges a card. Every example-only flow says so in the file and does nothing on submit beyond preventing the default.
  - Overwriting or blocking on a component the user edited. Installing a block never fails because the user changed their Button.
  - Breaking a 1.x guarantee: no `lockVersion` bump, no renamed diagnostic codes, no change to how a 1.0 CLI reads the lock.
  - Horizontal page scroll at 320px or a lost keyboard path in any block.

## Constraints from the 1.x contract

From `docs/1.0-public-contract.md` and the current code:

- **Lock.** A 1.x CLI must read every 1.x lock. `inspect.ts` checks only `lockVersion === 1`, that `artifacts` is an object and that `managedDeclarations` is an array; it does not validate the lock against `schemas/project-lock.schema.json`. But `baseLock()` in `packages/cli/src/plan/components.ts` rebuilds the lock from a fixed field list, so **a new top-level lock field is dropped** the next time a 1.0 CLI runs `add`, `update`, `theme add` or `init`. Records inside `artifacts` are spread whole and survive, with an unknown `kind` passed through unchecked.
- **Diagnostics.** Codes and exit codes are stable; new codes and notices may be added. `UNKNOWN_COMPONENT` keeps its name.
- **CLI grammar.** New commands or operand types are additive in a minor release. The current `add` refuses any operand that is not a component id, before it inspects the project (`assertKnownComponentIds`, `main.ts`).
- **Installed bytes** may change in a minor release; `update` refreshes unedited files.

## Approaches considered

1. **Managed blocks (picked).** Blocks are catalog entries compiled per family and edition, installed as managed files recorded in the lock, refreshed by `update` and checked by `doctor`. It keeps the promise that the preview, the installed source and later updates agree. Cost: catalog, compiler and CLI work, and care so a 1.0 CLI does not lose block records.
2. **Scaffold blocks.** Components install as managed files, but the block file is written once, not recorded, and never updated. Smallest build, no lock change. Rejected because accessibility fixes could never reach installed blocks, and `doctor` and `update` would not see them.
3. **Tailwind blocks as shadcn `registry:block` items.** Rejected: catalog components are styled by per-component CSS keyed on `data-slot`, not Tailwind classes. Tailwind layouts would sit outside the style families and the catalog style lint.

## Design

### What a block is

A block is a catalog entry with:

- **An id** of the form `<name>-<nn>`: `login-01`, `settings-01`, `pricing-01`, `dashboard-01`. Block ids and component ids share one namespace on the command line and must never collide (a contracts test enforces this).
- **A Radix template** `packages/catalog/src/blocks/<id>.tsx`, and a Base UI template `packages/catalog/src/blocks/base/<id>.tsx` only where the composition differs between editions (`asChild` versus `render`). This replaces the hard-coded string patches `compile.ts` uses for usage examples. (My call.)
- **One layout stylesheet** `packages/catalog/src/blocks/<id>.css`, shared by all families. It handles only layout: grid, gaps, widths and breakpoints. It uses preset tokens (spacing, radius, type scale) and never colour literals. The components inside carry each family's look. Per-family block CSS is allowed by the build but none is planned. (My call: eight sheets per block would cost far more and add little, since the components already change between families.)
- **Metadata** in `packages/catalog/src/blocks/index.ts`: `{ id, title, description, components: ComponentId[], exampleOnly: string[] }`. `components` is the full list of catalog components the block imports. A build check compares it with the template's `@/components/ui/<id>` imports, in both editions, and fails on any difference. `exampleOnly` lists the flows the block fakes (for example `"sign-in submit"`), and is shown on the site and in the file header.

Block templates import components through `@/components/ui/<id>`, like the usage examples, so `transformArtifact`'s alias rewriting applies unchanged. Block templates import only catalog components, `react` and `lucide-react` (no brand icons). Sample data lives in a single `const exampleData` at the top of the file.

Each block file starts with a short comment saying what it is, which parts are example-only and where to wire them up.

**Example-only actions show an example notice** (decided 25 November 2026). They never send anything anywhere, but they show the feedback a real app would, labelled as an example:

- Forms call `event.preventDefault()`, then show their feedback. `settings-01` Save shows a Toast: "Example only: nothing was saved". `login-01` submit shows its Alert: "Example only: this form doesn't sign anyone in". The alert appears on submit, not from a prop or a demo toggle.
- Confirm buttons close their dialog and show the same kind of Toast. For example, `settings-01` delete account says "Example only: no account was deleted".
- Plan buttons in `pricing-01` and menu items in `dashboard-01` show a Toast naming the action and saying nothing happened.
- The example handler sits in one small local function per block, such as `showExampleNotice()`, and the file comment marks it as the thing to replace. The wording says "Example only" every time.
- The specimen audit opens each block's overlays (the Toast after submit, the Alert Dialog, the Dropdown Menu) and checks them, within the CI time limit.

### The first four blocks

Each has one landmark or labelled region and a single `h2` heading (the host page owns its `h1`), works at 320px, and has a desktop layout from about 768px.

| Block | What it shows | Main components | Example-only |
| --- | --- | --- | --- |
| `login-01` | Centred sign-in card: email, password with show/hide, remember me, submit, forgot-password link, sign-up line, an error alert shown on demand | Card, Field, Input, Password Field, Checkbox, Button, Alert, Separator, Label | Sign-in submit, forgot password, sign-up link |
| `settings-01` | Account settings: Profile (name, email, bio, avatar), Notifications (switches and a radio group), Danger zone with a confirm dialog, grouped by Tabs on desktop and stacked on phones | Tabs, Card, Field, Input, Textarea, Select, Switch, Radio Group, Avatar, Button, Alert Dialog, Separator, Toast | Save, delete account |
| `pricing-01` | Three plans with a monthly/yearly toggle, a highlighted plan, feature lists and a comparison note | Toggle Group, Card, Badge, Button, Separator | Plan selection (no checkout) |
| `dashboard-01` | Overview content area: four stat cards, a usage meter, a recent-activity table with status badges, and a tabbed range (7 days / 30 days) | Card, Meter, Progress, Badge, Table, Tabs, Avatar, Button, Dropdown Menu | All data |

`dashboard-01` is the content area only, without a Sidebar shell, so it drops into an existing layout. (My call: a shell block is a different product, closer to an app template.)

Content and layout start from the existing preset scenes (`sign-in.tsx`, `settings.tsx`, `dashboard.tsx` in `apps/preview/src/scenes/`). The scenes import from the preview's generated folder and use `scenes.css`, so blocks are rewritten as catalog sources, not moved.

### Catalog and compiler

- `scripts/sync-catalog.mjs` reads `packages/catalog/src/blocks/` and adds `blockTemplates`, `blockBaseTemplates` and `blockStyles` to `catalogData` in `generated.ts`.
- `packages/contracts` gains `supportedBlockIds` and `BlockId`, kept separate from `supportedComponentIds` so every list driven by component ids (specimens, consumers, audits) is unaffected unless it opts in.
- `scripts/catalog-style-lint.ts` gains a block rule: every selector in `blocks/<id>.css` must name a `data-block="<id>"` root or a `data-block-part` marker, and may not name a component slot. That keeps a block from restyling a component, which would break the family look.
- The compiler gains `compileBlock(input)`, which:
  - compiles the block's component list exactly as `compile()` would for those ids (same preset, family and edition), and
  - adds two artifacts of a new kind `block`: `blocks/<id>.tsx` (the edition's template) and `blocks/<id>.css`.
  - Output is deterministic, and `Artifact['kind']` becomes `'component' | 'style' | 'usage' | 'utility' | 'block'`. `schemas/project-lock.schema.json` gains the `block` kind.

### CLI

- **Grammar.** `add` and `update` accept block ids as well as component ids, mixed in one command: `ombelle add login-01`, `ombelle add button pricing-01`, `ombelle update dashboard-01`. `assertKnownComponentIds` becomes `assertKnownCatalogIds`. An unknown id still fails with `UNKNOWN_COMPONENT` (the stable code); the message becomes "Unknown component or block", and suggestions draw on both lists.
- **Where files go.** `transformArtifact` maps `kind: 'block'` to `<components-parent>/blocks/<file>`: with the default `src/components/ui`, that is `src/components/blocks/login-01.tsx` and `src/components/blocks/login-01.css`. Without this change the current mapping would flatten them into `ombelle-examples/`. (My call: shadcn installs blocks beside, not inside, the `ui` folder, and users expect the same.)
- **Planning `add <block>`.**
  - Every component in the block's list that is not installed is planned as `add <component>` would plan it today.
  - A component already installed and unedited follows today's `add` rules (noop, or refresh when the catalog changed it).
  - A component already installed and **edited** is left alone, with the notice `BLOCK_COMPONENT_EDITED` ("<path> was edited after install; login-01 uses it as is"). It is not a conflict. This is the one place block planning differs from `add <component>`.
  - A component file that exists but Ombelle never installed (for example shadcn's own `components/ui/button.tsx`) is a conflict, exactly as `add <component>` treats it today, offering `--overwrite <path>` or `--beside <path>`. The block does not silently import a foreign component, whose props may not match. (My call, from the builder check: it keeps today's safety rule. The "edited component" exception above covers only files Ombelle installed.)
  - A component installed beside an app-owned file (`placements[id] === 'beside'`, under `<components>/ombelle/`) is used from there: `transformArtifact` rewrites the block's `@/components/ui/<id>` import to the beside path, as it already does for usage examples. (My call.)
  - The block files follow the usual managed-file table: create, noop, refresh when unedited, conflict when edited or unmanaged. `--overwrite <path>` works for block files. `--beside` works for the component paths a block plan touches, and is refused for a block's own files. (My call.)
  - npm dependencies are the union of the components' dependencies, installed with lifecycle scripts disabled, as today.
- **Lock.** Block files are recorded only in `artifacts`, as `{ logicalPath: 'blocks/<id>.tsx', kind: 'block', sha256 }`. There is **no new top-level field**. Installed blocks are derived from `artifacts` the way `installedComponentIds` derives components from `components/ui/` paths. This is what keeps block records alive when a 1.0 CLI rewrites the lock.
- **`update`.** With no operands it refreshes installed components and installed blocks. With block operands it refreshes those blocks and their components, using the add rules above.
- **`doctor` and `diff`.** Block files are reported per file like other managed files. `doctor` also checks that each installed block's components are installed. A missing one is a warning naming `ombelle add <block>` as the fix.
- **Older CLIs.** A 1.0 CLI refuses `add login-01` with `UNKNOWN_COMPONENT`. In a project with blocks, a 1.0 CLI keeps the block records. Its `doctor` reports them as "no longer generated by the catalog", a warning and not a failure. Its `update` leaves them alone. The upgrade note and the block docs say to use CLI ≥ 1.1 in projects with blocks. A test pins this behaviour by running the 1.0 CLI against a lock written by 1.1.
- **`--json`.** No new fields are required. Block files appear in `changes[]` like any file. New notice codes are `BLOCK_COMPONENT_EDITED` and `BLOCK_COMPONENT_MISSING` (the doctor warning).

### Website

- **`/blocks`** lists the four blocks as cards. Each card shows a live preview in the current family, the title, the description and the components used.
- **`/blocks/[id]`**, statically generated from the block metadata, has:
  - a preview frame with family tiles (the same `offeredStyleFamilies()` switcher as component pages), light/dark, and a width switcher (phone 375 / tablet 768 / desktop);
  - tabs for Preview and Code. The code shows the block's `.tsx` and `.css` for the selected edition through the compiled Code Block;
  - the install command through `CodeBlockCommand` (`<release> add <id>`), the components it installs, and the example-only list.
- **Previews render in an iframe.** Blocks are page-sized, and the width switcher needs real viewport widths for their breakpoints. (My call, against the inline path components use.) `scripts/generate-www-previews.ts` compiles each block per family into `public/previews/<family>/blocks/` and adds a preview route that renders one block.
- The header's navigation gains a Blocks entry. Liquid glass blocks carry the same "accessibility not guaranteed" label as glass components.
- The site's own UI keeps the Ombelle family. Block previews are the only part of the site that switches family.

### Verification

- **Unit and contract tests:** block metadata matches template imports in both editions; block ids never collide with component ids; `compileBlock` is deterministic; the lint rule for block CSS; `transformArtifact` paths.
- **CLI integration tests:** `add login-01` on a fresh project; on a project with an edited Button (notice, no conflict); an edited block file (conflict, then `--overwrite`); `update` after a catalog change; `doctor` with a missing component; `--dry-run` writes nothing; mixed `add button pricing-01`; and the **1.0-CLI-on-1.1-lock** test.
- **Specimen audit:** `scripts/generate-audit.ts` adds a block section per block to `/audit/<family>/<edition>/`. The section-count assertion in `tests/e2e/specimen-audit.spec.ts` becomes components plus blocks. Blocks get the same checks (focus, clipping, overflow, label spacing, target size, forced colours, axe) at 320px and desktop width.
- **Consumers:** add `login-01` to the browser-tested npm and pnpm batches in `scripts/consumer-components.ts`, and all four blocks to the Base UI consumers (`prepare-base-consumers.ts`), so both editions build and render.
- **Site:** e2e checks for `/blocks` and one block page (family switch, width switch, code tab, copy install command), and the First Load JS budget in `scripts/check-www-budget.mjs` for the new routes.

### Documentation and release

- `docs/blocks/<id>.md` per block, plus a blocks section in `docs/05-cli-specification.md` (grammar, paths, the planning rule for edited components, older-CLI behaviour).
- `docs/1.0-public-contract.md`: block ids and `add <block>` join the stable grammar once released. Block bytes are installed bytes and may change in a minor release.
- `docs/01-product-requirements.md` and `docs/07-delivery-plan.md`: mark the four blocks as delivered.
- CHANGELOG under **Installed source**, **CLI**, **Contracts** and **Website**. CLI 1.1.0.

**Release order: CLI 1.1.0 first, then the site** (decided 25 November 2026).

1. **Track 1, catalog and CLI.** Contracts, catalog, compiler, CLI, audits, consumers and docs, released as `@ombelle-ui/cli` 1.1.0 on npm, with its evidence recorded the usual way.
2. **Track 2, website.** Branched from track 1 after 1.1.0 is published. It bumps `publishedInstaller` in `apps/www/src/snapshots/install-command.ts` to 1.1.0, then puts `/blocks`, the block pages and the header entry live. That way every install command shown works. No `installRules` notice is needed. The preview routes the audit uses live in `apps/preview` and ship with track 1.

## Left to the builder

- Exact copy, sample data and the visual details of each block, within the table above and each family's look.
- The block preview route's file layout in the preview app.
- How `compileBlock` shares code with `compile()`.
- How the block lint rule is written, and the exact notice wording.
- Whether the audit runs blocks in the same pages as components or in separate ones, as long as the CI time limit holds (see #198).
