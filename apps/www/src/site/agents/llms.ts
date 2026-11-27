import { accessibilityCaveatLabel, officialSnapshotOrigin } from '@ombelle/contracts'
import { blockDocs } from '../blocks/catalog'
import { componentDocs } from '../components/catalog'
import { documentationGuides } from '../docs/navigation'
import { publishedInstaller } from '../../snapshots/install-command'
import { buildAgentCatalog, type CatalogEntry } from './catalog-json'
import { blockMarkdown, componentMarkdown, guideMarkdown } from './markdown'
import { agentRulesMarkdown } from './rules'

type Installer = { packageName: string; version: string }

/** One llmstxt.org link line: the description, then the CLI gate or glass caveat when the entry has one. */
function entryLine(entry: CatalogEntry): string {
  const notes = [
    entry.installable ? '' : `(needs CLI ${entry.minimumCli})`,
    entry.glass ? accessibilityCaveatLabel : '',
  ].filter(Boolean)
  return `- [${entry.name}](${entry.docs.markdown}): ${[entry.description, ...notes].join(' ')}`
}

/** The index coding agents read first, in the llmstxt.org format. */
export function llmsTxt(installer: Installer = publishedInstaller): string {
  const origin = officialSnapshotOrigin
  const catalog = buildAgentCatalog(installer)
  const guides = documentationGuides.map((guide) => `- [${guide.title}](${origin}/docs/${guide.slug}.md): ${guide.description}`)
  return [
    '# Ombelle UI',
    '',
    '> Ombelle UI is a catalog of accessible React components and blocks. A CLI installs reviewed source into the developer\'s project, themed by a preset code (`ps_…@1`) from the preset editor.',
    '',
    `Install command: \`${catalog.installCommand}\`. Install the Ombelle agent skills: \`${catalog.skills.install}\``,
    '',
    '## Install rules',
    '',
    agentRulesMarkdown(installer),
    '',
    '## Guides',
    '',
    ...guides,
    '',
    '## Components',
    '',
    ...catalog.components.map(entryLine),
    '',
    '## Blocks',
    '',
    ...catalog.blocks.map(entryLine),
    '',
    '## Optional',
    '',
    `- [llms-full.txt](${catalog.docs.llmsFull}): every guide, component and block page in one file`,
    `- [Catalog JSON](${origin}/api/v1/catalog): machine-readable catalog with install state and docs links`,
    `- [Preset JSON schema](${origin}/schemas/preset-1.0.json): the schema of the preset JSON file`,
    '',
  ].join('\n')
}

/** Every guide, component and block page as markdown, after the index. */
export function llmsFullTxt(installer: Installer = publishedInstaller): string {
  return [
    llmsTxt(installer).trimEnd(),
    '',
    ...documentationGuides.flatMap((guide) => [guideMarkdown(guide.slug), '']),
    ...componentDocs.flatMap((doc) => [componentMarkdown(doc, installer), '']),
    ...blockDocs.flatMap((doc) => [blockMarkdown(doc, installer), '']),
  ].join('\n')
}
