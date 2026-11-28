// The npm manifest and README of the published `@ombelle-ui/cli`. `scripts/pack-cli.mjs` writes both into the
// release staging directory. Keywords and the README are what `npm search` and the registry page show, so they carry
// the names people and coding agents try first (`ombelle`, `ombelle-ui`), which are not the package name.
export const siteOrigin = 'https://ombelle-ui.com'
export const skillsSource = 'whritou/ombelle-ui'

export const cliKeywords = ['ombelle', 'ombelle-ui', 'react', 'components', 'tailwind', 'shadcn', 'cli', 'ui']

export function cliPublicManifest(name, version) {
  return {
    name, version,
    description: 'Ombelle UI CLI: the guarded installer for Ombelle UI. Adds reviewed React components, presets and recipes to a Vite or Next.js project as source you own',
    keywords: cliKeywords,
    repository: { type: 'git', url: 'git+https://github.com/whritou/ombelle-ui.git', directory: 'packages/cli' },
    homepage: siteOrigin,
    bugs: { url: 'https://github.com/whritou/ombelle-ui/issues' },
    type: 'module', license: 'MIT', bin: { ombelle: './dist/main.js' },
    engines: { node: '>=24.19.0 <27' },
    files: ['dist', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'README.md'],
    publishConfig: { access: 'public' },
  }
}

export function cliPublicReadme(name, version) {
  const run = `npx ${name}@${version}`
  return `# Ombelle UI CLI

\`${name}\` is the command-line installer for [Ombelle UI](${siteOrigin}). It is the only Ombelle installer on npm: \`ombelle\`, \`ombelle-ui\` and \`@ombelle/cli\` are not it.

Install reviewed React source using local JSON or immutable publication codes. Review with --dry-run before applying with --yes. Recipes preserve saved project defaults. Node 24.19.0 or newer, below 27, is required (Node 24 and 26 LTS).

Bare codes use ${siteOrigin}. Alternate origins require explicit content hashes. Offline pins cannot detect later withdrawals. See --help for supported inputs.

\`\`\`bash
${run} init --preset <ps_ code>@1 --dry-run --json
\`\`\`

## For AI coding agents

- Read ${siteOrigin}/llms.txt first. It lists the docs, the catalog JSON (${siteOrigin}/api/v1/catalog, with the current \`cliVersion\`) and a Markdown copy of every page.
- Install the agent skills: \`npx skills add ${skillsSource}\`. The \`ombelle-install\` skill holds the full rules and the diagnostic code table.
- Use the install loop. Agents have no TTY, so every write needs \`--yes\`, but only after a dry run:
  1. Run the writing command with \`--dry-run --json\`. It writes nothing.
  2. Show the developer the planned changes.
  3. Rerun it with \`--yes\` in place of \`--dry-run\` only when \`status\` is \`planned\`, the exit code is 0 and no warning has \`resolutions\`.
  4. On \`status: "conflict"\` (exit 4), stop and ask the developer. Never choose \`--overwrite\` or \`--beside\` yourself.
  5. Finish with \`doctor --json\`.

Never copy component source by hand or run \`shadcn add\` for Ombelle components, and never write preset JSON yourself: ask the developer for a preset code from ${siteOrigin}/editor/preset.
`
}
