import type { ReactNode } from 'react'
import { CodeBlock, CommandTabs } from '../components/code-block'
import { componentDocs } from '../components/catalog'
import { familyList } from '../families'
import { publishedInstaller } from '../../snapshots/install-command'
import type { GuideSlug } from './navigation'

type GuideSection = { id: string; title: string; content: ReactNode }
const release = `${publishedInstaller.packageName}@${publishedInstaller.version}`
const npx = `npx ${release}`
function Command({ args }: { args: string }) {
  return <div className="my-5"><CommandTabs release={release} args={args} /></div>
}

export const guideSections: Record<GuideSlug, GuideSection[]> = {
  'getting-started': [
    { id: 'requirements', title: '1. Prepare your app', content: <>
      <p>Use an existing Vite React TSX app or Next.js App Router TSX app with Tailwind CSS v4 already working. Run the installer with Node 24.19.0 or a newer Node 24 release. Open a terminal in the app folder containing <code>package.json</code>.</p>
      <p>The CLI supports npm, pnpm, Yarn, and Bun projects. It keeps the app’s package manager. Workspace projects and React Native are outside the current installer scope.</p>
      <p>Already have shadcn components? Follow <a href="/docs/installation#existing-projects">the existing-project instructions</a> to merge a theme and resolve component conflicts deliberately.</p>
    </> },
    { id: 'choose-preset', title: '2. Create a project preset', content: <>
      <ol><li>Open the <a href="/editor/preset">preset editor</a>. A fresh draft starts in Ombelle.</li><li>Choose a style family, edit light and dark colors, and adjust typography and shape.</li><li>Wait for the current draft to compile. Open <strong>More actions → Download JSON</strong> and save the file as <code>project-preset.json</code> in your app folder.</li></ol>
      <p>You can also use <strong>Get code</strong> to publish a preset, then use the exact <code>ps_…@1</code> code instead of the local JSON path in the next command. Publication is public and explicit; downloading needs no account or publication.</p>
    </> },
    { id: 'initialize', title: '3. Initialize Ombelle', content: <>
      <Command args="init --preset ./project-preset.json" />
      <p>Review the proposed configuration, token CSS, style CSS, and lock file, then accept the plan. The preset is saved as <code>ui-preset.json</code> and installation provenance as <code>ui-library.lock.json</code>. The CLI reports the actual paths it manages.</p>
      <p>To inspect the plan without writing files or installing dependencies, append <code>--dry-run</code>. You can add <code>--json</code> for machine-readable output.</p>
    </> },
    { id: 'add-components', title: '4. Add and use components', content: <>
      <Command args="add button card input label" />
      <p>Later additions use the saved project preset. Import the generated components using your configured aliases; the example below assumes <code>@/components/ui</code>.</p>
      <CodeBlock title="example.tsx" code={"import { Button } from '@/components/ui/button'\n\nexport function SaveAction() {\n  return <Button>Save changes</Button>\n}"} />
      <p>Start your app using its existing dev command. Check light and dark rendering, keyboard focus, and disabled or invalid states. The catalog's specimens for each built-in preset are checked automatically in Chromium for focus visibility, target size, forced colors and axe rules; your app still needs its own checks with your content and backdrop. Next.js interactive examples belong in a client component. Each <a href="/components">component reference</a> includes usage and its supported API.</p>
    </> },
    { id: 'next-steps', title: '5. Customize and keep your work', content: <>
      <p>Use <a href="/docs/presets">global presets</a> for shared project defaults and <a href="/docs/component-editor">component recipes</a> for an independently styled component. Generated source remains editable in your repository. Commit the generated files, saved preset, and lock file with your app.</p>
      <p>The editors save drafts in this browser. Download JSON for a portable backup; a local draft does not automatically appear in another browser or device.</p>
    </> },
  ],
  installation: [
    { id: 'commands', title: 'Command reference', content: <>
      <p>Run commands from your app folder. <code>PRESET</code> means a local JSON file or an exact published preset code; <code>RECIPE</code> means a local recipe JSON file or exact recipe code. Replace these placeholders before running a command.</p>
      <CodeBlock title="CLI commands" code={`${npx} init --preset PRESET\n${npx} add button dialog input\n${npx} theme add PRESET\n${npx} add --recipe RECIPE\n${npx} add button --preset PRESET`} />
      <p><code>init</code> sets up project defaults. <code>add</code> installs named components. <code>theme add</code> applies project tokens and style rules. <code>add --recipe</code> installs a separate scoped component. <code>add button --preset</code> installs a separate preset-scoped Button; this last form supports one Button at a time.</p>
    </> },
    { id: 'package-managers', title: 'Choose a runner and target folder', content: <>
      <Command args="init --preset ./project-preset.json" />
      <p>The runner downloads the installer; it does not change your app’s package manager. Yarn runner tabs use modern Yarn; Yarn Classic has no <code>dlx</code>. Use <code>npx</code> to run the installer for a Yarn Classic app. Modern Yarn may delay newly published versions according to its configured minimum release age.</p>
      <p>When invoking from another directory, use <code>--cwd ./path-to-app</code>. Local JSON paths resolve from the invoking directory, independently of <code>--cwd</code>. Quote paths containing spaces. Use <code>--package-manager npm|pnpm|yarn|bun</code> only when project detection needs an explicit choice.</p>
    </> },
    { id: 'existing-projects', title: 'Add Ombelle to an existing shadcn project', content: <>
      <ol><li>Download a preset JSON into the app folder.</li><li>Run the theme command below with <code>--dry-run</code> and inspect the changes.</li><li>Run it again without <code>--dry-run</code> and accept the plan.</li><li>Add the components you want. Resolve any existing source conflicts before applying.</li></ol>
      <Command args="theme add ./project-preset.json --dry-run" />
      <p>The theme command merges shared palette and tokens and saves the project preset. Existing components that read those variables can change appearance. It preserves existing component source; it does not rewrite that markup into a different component API.</p>
      <p>The installer detects Radix or Base UI from <code>components.json</code>. All {componentDocs.length} ordinary components support both editions. Base UI uses <code>render</code> for composition where Radix uses <code>asChild</code>. Recipes and preset-scoped Buttons currently require Radix. Once components are installed, switching the recorded edition requires an explicit migration.</p>
    </> },
    { id: 'conflicts', title: 'Keep an existing component or replace it', content: <>
      <p>If <code>button.tsx</code> already belongs to your app, the installer stops rather than silently replacing it. For an eligible source conflict, <code>--beside</code> preserves the original and installs Ombelle under the configured components directory’s <code>ombelle/</code> folder.</p>
      <Command args="add button --beside components/ui/button.tsx" />
      <p>With the default alias, import that separate Button from <code>@/components/ui/ombelle/button</code>. <code>--overwrite components/ui/button.tsx</code> explicitly replaces an eligible existing file. Use the exact conflicting path reported by the CLI. These resolutions do not bypass changes to an already Ombelle-owned file.</p>
    </> },
    { id: 'safe-updates', title: 'Plan changes and update safely', content: <>
      <ul><li><code>--dry-run</code> computes and prints a plan without writes.</li><li><code>--json</code> returns structured output; keep <code>--quiet</code> on the Yarn runner to avoid mixing runner output with JSON.</li><li><code>--yes</code> accepts a safe plan. It cannot bypass schema errors, incompatible projects, or modified-file conflicts.</li><li>Dependency installation disables lifecycle scripts. The apply transaction checks for stale inputs and supports recovery if applying fails.</li></ul>
      <p>When a command reports that managed shared style rules have changed, run <code>theme add</code> with the exact preset path it prints, review the plan, then retry the component addition. If you edited the managed file, reconcile it manually first. There is no general automatic source migration command.</p>
    </> },
  ],
  'style-families': [
    { id: 'families', title: 'Choose the visual foundation', content: <>
      <p>Stable families are {familyList()}. They share component APIs while providing their own tokens and style rules. Website pickers list Ombelle first and fresh playgrounds and editor drafts select it. A saved draft restores the family you previously chose.</p>
      <dl><dt>Ombelle</dt><dd>The product’s signature family, with rounded shapes, defined edges, and depth.</dd><dt>Minimalist</dt><dd>Restrained surfaces, quiet borders, and typography.</dd><dt>Neo-Brutalism</dt><dd>Strong borders, offset shadows, and pronounced contrast.</dd><dt>Flat</dt><dd>Color-led surfaces and reduced visual depth.</dd></dl>
      <p>Compare a real component in the <a href="/components">component playgrounds</a>, then check its states in both modes. Use the preset editor to tune the family to your brand.</p>
    </> },
    { id: 'changing-families', title: 'Change family without losing your intent', content: <>
      <ol><li>Open your preset draft and choose a family in <strong>Style family</strong>.</li><li>Review and confirm a change when prompted. Values you customized stay; unedited values take the new family’s defaults.</li><li>Inspect both palettes and the full gallery, then download or publish the current result.</li><li>Apply the preset with <code>theme add</code> to update project styling.</li></ol>
      <p>Changing a family in a playground or editor is a preview/draft operation. It changes your app only after you export and install it. Generated component APIs stay the same within their edition.</p>
    </> },
    { id: 'liquid-glass', title: 'Use experimental Liquid Glass', content: <>
      <p>Liquid Glass is experimental for all {componentDocs.length} components. Choose a glass starting preset, tint, and material settings in the preset editor, or use the glass controls in a component editor. Inspect transparency, blur, edges, depth, and motion over the provided preview backdrops.</p>
      <ol><li>Choose <strong>Liquid glass</strong> and a starting preset.</li><li>Check light/dark modes and every backdrop. Review the contrast readout and material settings.</li><li>Install the preset and components using the current CLI. Read the experimental notices in the plan.</li><li>Mount the generated <code>LiquidGlassFilter</code> once in your app’s root layout if using refraction in Chromium. Follow the import path printed by the CLI.</li></ol>
      <p>Blur and refraction depend on browser support; opaque fallbacks are provided. Automated token checks do not certify contrast over arbitrary real page content. Verify your final backdrop, focus, disabled states, reduced motion, and browser fallbacks.</p>
    </> },
    { id: 'modes', title: 'Light and dark are separate palettes', content: <>
      <p>A preset contains both light and dark colors. Switching the preview mode selects the palette to inspect; it does not replace the other palette. Match the exported CSS’s theme selectors in your application, and test any app-level theme switch with generated components.</p>
    </> },
  ],
  presets: [
    { id: 'scope', title: 'Choose the right scope', content: <>
      <dl><dt>Global preset</dt><dd>A style family, light/dark semantic colors, bounded design values, and supported component defaults saved for the project. Ordinary component additions inherit it.</dd><dt>Component recipe</dt><dd>One component’s content, props, preset reference, and supported overrides. It installs separately without changing saved project defaults.</dd><dt>Preset-scoped Button</dt><dd>A separate Button compiled from a whole preset. Use this when a Button needs its own preset rather than the project’s shared theme.</dd></dl>
      <p>A component recipe and a global preset have different JSON formats. Use <code>--recipe</code> for recipe exports and <code>--preset</code> for preset exports.</p>
    </> },
    { id: 'apply-globally', title: 'Apply a global preset', content: <>
      <ol><li>Build the theme in the <a href="/editor/preset">preset editor</a>.</li><li>Download <code>project-preset.json</code> into your app or publish it and copy the preset code.</li><li>Use <code>init --preset</code> for first setup or <code>theme add</code> for a configured app.</li><li>Review and accept the file plan; later <code>add</code> commands read the saved defaults.</li></ol>
      <Command args="theme add ./project-preset.json" />
      <p>Theme installation can affect existing components that use shared variables. It preserves existing component source, scoped recipes, and independently installed preset Buttons.</p>
    </> },
    { id: 'scoped-button', title: 'Apply a preset to one Button', content: <>
      <p>Initialize a supported Radix project first. Save a preset JSON in the invoking folder, then install a separate Button:</p>
      <Command args="add button --preset ./project-preset.json" />
      <p>The CLI prints the generated preset ID/revision directory, scoped CSS, and usage example. Import that generated Button to use it. Your ordinary Button, global theme, and future ordinary additions keep project defaults. Other component IDs are not supported by this command; use their <a href="/docs/component-editor">recipe editors</a> instead.</p>
    </> },
    { id: 'resolution', title: 'Token order and reproducible output', content: <>
      <p>Values resolve from foundation defaults through style-family defaults, project preset values, supported component defaults, scoped recipe values, and finally your component props and local source. Later layers affect only allowed values; validation and accessibility behavior are not arbitrary token overrides.</p>
      <p>Preset JSON includes <code>schemaVersion</code>, <code>id</code>, <code>name</code>, <code>revision</code>, <code>catalogRelease</code>, <code>compilerVersion</code>, <code>platform</code> (<code>react-web</code>), <code>styleFamily</code>, <code>modes</code>, <code>design</code>, and optional <code>componentDefaults</code>. Catalog and compiler references pin the compilation inputs. Unknown keys and values outside supported ranges fail validation.</p>
      <p>Keep installed IDs and revisions immutable. When changing an already installed scoped preset, increase its revision before reinstalling changed content. A published code always refers to one fixed snapshot; publish a new snapshot to share edits.</p>
    </> },
    { id: 'design-reference', title: 'Design value reference', content: <>
      <p>The current preset format is 1.0 with catalog/compiler compatibility 0.1.0. Colors are six-digit hex or numeric OKLCH. Each mode defines semantic roles such as background/foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, and ring; optional shadow color controls the family’s shadows.</p>
      <ul><li><code>fontFamilyId</code>: system-sans, system-serif, or system-mono.</li><li><code>radiusRem</code>: 0–2 rem. <code>borderWidthPx</code>: 0–4 px.</li><li><code>density</code>: comfortable or compact. Shadow X/Y offsets: −16–16 px.</li><li><code>motion</code>: full or reduced. <code>transparency</code>: auto or reduced.</li><li>Liquid Glass adds blur (0–40 px), opacity (0.25–1), saturation (1–2), backdrop contrast (0.3–1.6), backdrop tone (0–0.6), sheen/rim (0–1), and optional refraction, halo, depth, motion, and dispersion (0–1). Refraction width ranges from 0–0.3.</li></ul>
      <p>These are preset ranges; component recipe controls may expose a different supported subset. Use editor validation and the generated recipe JSON as the reference for that component.</p>
    </> },
  ],
  'preset-editor': [
    { id: 'start', title: '1. Open and name your draft', content: <>
      <p>Open the <a href="/editor/preset">global preset editor</a>. A fresh session starts with Ombelle; a valid saved draft restores automatically. Change the preset name in the top bar. Use <strong>More actions → ID &amp; revision…</strong> to edit its export identity.</p>
      <p>The browser stores the draft and undo/redo history locally. This editor’s storage is separate from component editor drafts. Download JSON when you want a portable copy.</p>
    </> },
    { id: 'customize', title: '2. Set family, colors, and design values', content: <>
      <ol><li>Choose a <strong>Style family</strong>. Confirm a family change when requested; custom values remain.</li><li>In <strong>Colors</strong>, pick a scheme or open a semantic color token to edit its light and dark values. Supported color values include hex and numeric OKLCH.</li><li>Adjust <strong>Typography &amp; shape</strong> for fonts, radius, density, and supported dimensions.</li><li>Adjust <strong>Depth &amp; motion</strong> for borders, shadows, and motion. Liquid Glass adds a material section and starting presets.</li><li>Use individual reset controls to restore inherited values. Undo and redo let you compare edits.</li></ol>
      <p><strong>More actions → Reset all tokens…</strong> returns colors and design values to the current family’s defaults while keeping the preset identity. Undo can restore the previous draft.</p>
    </> },
    { id: 'preview', title: '3. Inspect the preview and checks', content: <>
      <p>Switch <strong>Preview mode</strong> between Light and Dark, change <strong>Preview page</strong> to inspect the gallery and other scenes, and use <strong>Preview width</strong> to inspect narrow layouts. Glass previews also expose backdrop choices. Preview controls do not become preset settings.</p>
      <p>Open the review drawer to inspect checks. Resolve invalid fields and compilation errors before exporting. Contrast checks cover defined semantic token pairs; they do not replace testing real content, keyboard behavior, responsive layouts, or screen-reader interaction.</p>
    </> },
    { id: 'export', title: '4. Export and install', content: <>
      <ol><li>Wait for the current draft to compile successfully.</li><li>Choose <strong>More actions → Download JSON</strong>, or open <strong>Export</strong> in the review drawer and choose <strong>Download preset JSON</strong>.</li><li>For manual styling, choose <strong>Tailwind v4 token CSS</strong> and <strong>Family CSS</strong> in the Output selector. Copy both to apply the full family.</li><li>Install JSON with the CLI, or use <strong>Get code</strong> for a public shareable snapshot.</li></ol>
      <Command args="init --preset ./project-preset.json" />
      <p>For an existing initialized project, use <code>theme add ./project-preset.json</code>. An export is available only for the successfully compiled current draft; stale output cannot be exported.</p>
    </> },
    { id: 'recovery', title: 'Keep or recover your draft', content: <>
      <p>Reopening the editor in the same browser restores valid saved work. If a saved draft cannot be read, download the recovery data before starting again. Storage failures leave edits in memory; download an export before closing the tab. See <a href="/docs/troubleshooting#draft-recovery">draft recovery</a> for details.</p>
    </> },
  ],
  'component-editor': [
    { id: 'choose', title: '1. Choose a component', content: <>
      <p>Open the <a href="/editor/component">component editor</a> and pick one of the {componentDocs.length} catalog components. Each component has its own local draft. Fresh drafts start in Ombelle; a saved draft restores its own family and edits.</p>
      <p>A recipe is an independently installed instance, with content, props, and supported visual overrides. It does not replace your global preset. Ordinary component installation supports both Radix and Base UI; recipe installation currently supports Radix only.</p>
    </> },
    { id: 'customize', title: '2. Customize content and appearance', content: <>
      <ol><li>Choose a style family. Liquid Glass also offers a glass preset and material controls.</li><li>Edit the component’s content and props. Controls are specific to the selected component, including its parts and supported variants.</li><li>Adjust supported appearance values. Empty overrides inherit from the referenced preset; use resets to return to those values.</li><li>Use Undo and Redo to compare changes.</li></ol>
      <p>The Button editor includes text, variant, size, type, disabled/loading behavior, icons, colors for supported states, and bounded geometry and shadow controls. Other editors expose the props, content, and part styling supported by their component schema. The editor does not accept arbitrary executable JSX or CSS.</p>
    </> },
    { id: 'verify', title: '3. Check states and generated artifacts', content: <>
      <p>Inspect Light/Dark modes and Wide/Narrow previews. The Button editor also offers forced states such as hover, focus, active, disabled, and loading; these are preview controls. Interact with other components to check menus, dialogs, selection, and focus behavior.</p>
      <p>Open the <strong>Code</strong> panel to inspect generated usage, component source, scoped CSS, dependencies, and recipe JSON. If a field is invalid or compilation is pending, correct the error and wait for current output before downloading or publishing.</p>
    </> },
    { id: 'install', title: '4. Download or publish, then install', content: <>
      <ol><li>Choose <strong>More actions → Download recipe JSON</strong>, or use the JSON download offered by <strong>Get code</strong>.</li><li>Save the downloaded file in an initialized Radix app. Replace the example filename below with your download’s actual name.</li><li>Run <code>add --recipe</code>, review the plan, and accept it.</li><li>Use the generated usage example to import the new scoped component.</li></ol>
      <Command args="add --recipe ./my-recipe-r1.json" />
      <p>Use <strong>Get code</strong> if you want an exact public <code>rc_…@1</code> reference instead of a local file. A Button uses recipe schema 1.0; the other catalog components use schema 2.0. The current installer accepts both. Scoped source and styles install beside ordinary components, leaving global defaults intact.</p>
    </> },
    { id: 'revisions', title: 'Reset, revisions, and ownership', content: <>
      <p>Recipe IDs and revisions identify installed content. For changed content under an already installed identity, increase the JSON revision before reinstalling; some catalog identity controls are read-only in the editor. Modified installed source is protected by conflict checks.</p>
      <p><strong>Reset recipe</strong> is undoable. In the Button editor it restores starting content and props while keeping the current family and identity. Other component editors return to a fresh recipe for that component. Download a backup before resetting or clearing browser storage.</p>
    </> },
  ],
  'exports-and-sharing': [
    { id: 'formats', title: 'Choose an export format', content: <>
      <dl><dt>Preset JSON</dt><dd>A portable global theme for <code>init --preset</code>, <code>theme add</code>, or a preset-scoped Button.</dd><dt>Recipe JSON</dt><dd>A portable customized component for <code>add --recipe</code>.</dd><dt>Token CSS and family CSS</dt><dd>Palette/design variables and family style rules. Use both for the complete visual treatment; CSS alone does not create component source.</dd><dt>Generated source and usage</dt><dd>Inspect component TSX, scoped CSS, dependencies, and imports in the component editor’s Code panel.</dd></dl>
      <p>Downloads work without publication. Export buttons require successful compilation of the current draft. JSON is the portable install input; the browser’s saved draft envelope is recovery data, not a CLI preset or recipe.</p>
    </> },
    { id: 'publish', title: 'Publish an exact shareable code', content: <>
      <ol><li>Finish editing and wait for compilation.</li><li>Choose <strong>Get code</strong> and review the public publication information.</li><li>Publish explicitly. The service returns a preset <code>ps_…@1</code> or recipe <code>rc_…@1</code> reference and read-only share page.</li><li>Copy the command shown for your target: new project, existing project theme, scoped Button, or recipe.</li></ol>
      <p>Published content is publicly readable by exact reference. Do not put secrets in preset names or component content. Ombelle currently has no accounts or private sharing. Drafts stay local until you choose publication; visiting an editor does not publish them.</p>
      <p>A code is immutable: later edits do not update an existing share link. Publish the edited content again to get a new snapshot. The code-page revision identifies the stored snapshot; the export’s own ID and revision still matter for installation conflicts.</p>
    </> },
    { id: 'install-code', title: 'Install a published snapshot', content: <>
      <p>Use the exact full code from the share page. These placeholders must be replaced:</p>
      <CodeBlock title="Install a code" code={`${npx} init --preset PRESET_CODE\n${npx} theme add PRESET_CODE\n${npx} add button --preset PRESET_CODE\n${npx} add --recipe RECIPE_CODE`} />
      <p>Bare codes resolve at the official Ombelle service. The CLI validates the content and records its provenance. A withdrawn or unavailable snapshot can block a network install; preserve downloaded JSON when you need a local install path.</p>
    </> },
    { id: 'offline', title: 'Local files, custom origins, and offline use', content: <>
      <p>A local JSON export does not require the snapshot service; installing missing dependencies may still need package registry access. Prefix local filenames beginning with <code>ps_</code> or <code>rc_</code> with <code>./</code> to distinguish them from codes.</p>
      <p>For a custom snapshot service, the CLI requires both <code>--snapshot-origin</code> and an exact <code>--preset-hash</code> or <code>--recipe-hash</code>. HTTPS is required except for literal loopback HTTP. <code>--offline</code> also requires those explicit pins and a previously verified cache entry; it cannot discover later snapshot withdrawals. Use the service-provided full command and hash rather than guessing either value.</p>
      <p>If publication fails, keep your JSON export and retry using the editor’s recovery flow. A temporary sharing-service failure does not remove valid local exports. See <a href="/privacy">privacy and data retention</a> for storage details.</p>
    </> },
  ],
  troubleshooting: [
    { id: 'unsupported-project', title: 'The installer rejects my project', content: <>
      <ol><li>Check Node is 24.19.0 or newer Node 24 and the target is Vite React TSX or Next.js App Router TSX with Tailwind v4.</li><li>Run from the app’s package folder, or set <code>--cwd</code>. Workspace projects are unsupported.</li><li>Confirm local JSON paths resolve from the invoking directory, not from <code>--cwd</code>.</li><li>Check the detected edition. Recipes and preset-scoped Buttons require Radix, even though ordinary components also support Base UI.</li></ol>
      <p>Use <code>--dry-run --json</code> to inspect a failed plan. Unknown components or malformed inputs exit with code 2, unsupported projects/releases with 3, file conflicts with 4, snapshot resolution failures with 5, and dependency failures with 6.</p>
    </> },
    { id: 'file-conflicts', title: 'A file conflict blocks installation', content: <>
      <p>Read the reported path. App-owned components may be installed beside with <code>--beside</code> or explicitly replaced with <code>--overwrite</code>. Already modified Ombelle-owned source requires manual reconciliation; <code>--yes</code> cannot force it through.</p>
      <p>If the message asks to refresh shared styles, use <code>theme add</code> with the exact preset path shown, then retry. If an installed recipe ID/revision has different bytes, increase its revision instead of reusing an immutable identity. See <a href="/docs/installation#conflicts">conflict resolution</a>.</p>
    </> },
    { id: 'draft-recovery', title: 'My draft disappeared or needs recovery', content: <>
      <p>Drafts are local to the browser, site origin, and component/editor. Another browser, device, private session, or cleared site storage may have no saved draft. A fresh session starts in Ombelle; changing that default does not replace a previously saved Flat draft.</p>
      <ol><li>When recovery is offered, download the raw recovery copy first.</li><li>Use the editor’s start-new/reset action only after keeping those bytes. Component editors preserve a verified recovery archive before continuing.</li><li>For valid in-memory work when storage is unavailable, download JSON before closing the tab.</li></ol>
      <p>Recovery files preserve original bytes for investigation; they are not automatically installable JSON. Preset undo history is stored separately; if only history is invalid, the valid draft remains available. Component drafts restore independently of the global preset.</p>
    </> },
    { id: 'preview-and-export', title: 'Preview or export is unavailable', content: <>
      <ul><li>Resolve highlighted validation errors, including unsupported color values or design values outside their bounds.</li><li>Wait for compilation to finish. Stale or failed output cannot be downloaded or published.</li><li>If only the preview runtime fails, retry it. A successfully compiled current draft can still have a valid export.</li><li>If clipboard access fails, select and copy the export text manually or download JSON.</li><li>For Liquid Glass, check the actual backdrop, browser filter support, opaque fallback, and the generated filter component.</li></ul>
      <p>The editor’s light/dark, viewport, forced-state, and backdrop controls inspect the draft; they do not automatically configure your app’s runtime theme switch or responsive behavior.</p>
    </> },
    { id: 'sharing', title: 'A code cannot be published or installed', content: <>
      <p>Retry a failed publication from the editor and retain JSON as a backup. For installation, copy the complete code including <code>@1</code>, use a compatible current CLI, and verify the snapshot is available. Custom origins require the exact content hash; offline mode requires a verified cache entry and cannot detect later withdrawals.</p>
      <p>If dependency installation fails, check the detected package manager and its network access, then follow the CLI’s transaction/recovery message. Keep the error output and paths if you need help. Report reproducible problems through <a href="/security">support and security</a>, including framework, edition, CLI version, command, and sanitized error output.</p>
    </> },
  ],
}
