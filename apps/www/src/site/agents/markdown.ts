import { Fragment, type ReactElement, type ReactNode } from 'react'
import TurndownService from 'turndown'
import { officialSnapshotOrigin, styleSupport } from '@ombelle/contracts'
import { compareVersions, publishedInstaller } from '../../snapshots/install-command'
import { blockGlassAvailable, type BlockDoc } from '../blocks/catalog'
import { componentDoc, componentInstallable, glassOnSite, type ComponentDoc } from '../components/catalog'
import { familyList } from '../families'
import { documentationGuides, type GuideSlug } from '../docs/navigation'
import { guideSections } from '../docs/guides'
import { CodeBlock, CodeBlockCommand } from '../../generated/ui/components/ui/code-block'

type Installer = { packageName: string; version: string }

const blocksMinimumCli = '1.1.0'
const glassNotice = 'Liquid glass: available. Accessibility not guaranteed. In a liquid glass project the plan adds a notice, because text contrast depends on the background behind the glass.'

function footer(): string {
  return [
    '---',
    '',
    `For agents: install with the published CLI, never by hand-copying source. The full install rules are at ${officialSnapshotOrigin}/llms.txt.`,
  ].join('\n')
}

const fence = (code: string, language = '') => '```' + language + '\n' + code.replace(/\n$/, '') + '\n```'

/** The component page as markdown, matching the HTML page's installation, usage and API sections. */
export function componentMarkdown(doc: ComponentDoc, installer: Installer = publishedInstaller): string {
  const cli = `npx ${installer.packageName}@${installer.version}`
  const installable = !doc.minimumCli || compareVersions(installer.version, doc.minimumCli) >= 0
  const glass = styleSupport(doc.id, 'liquid-glass')
  const lines = [
    `# ${doc.name}`,
    '',
    doc.description,
    '',
    '## Installation',
    '',
    'Run in a project initialized with an Ombelle preset (see [Get started](/docs/getting-started.md)). The component uses the saved project preset. Run the command from your app folder; it shows the changes and asks before writing.',
    '',
  ]
  if (installable) {
    lines.push(fence(`${cli} add ${doc.id}`, 'sh'), '')
    if (doc.client) lines.push('This is a client component.', '')
    lines.push(
      glassOnSite(doc.id)
        ? glassNotice
        : `With the published CLI, add ${doc.id} is refused with STYLE_UNAVAILABLE in a liquid glass project.`,
      '',
    )
  } else {
    lines.push(`Requires CLI ${doc.minimumCli}. The live preview uses the current catalog.`, '')
  }
  lines.push('## Usage', '', fence(doc.usage, 'tsx'), '')
  if (doc.note) lines.push(doc.note, '')
  lines.push(
    '## API and states',
    '',
    `- API: ${doc.api}`,
    `- Minimum states: ${doc.states}`,
    `- Native basis: ${doc.basis}`,
    `- Styles: Stable in ${familyList()}, light and dark. Liquid glass: ${glass === 'unavailable' ? 'not available' : 'stable, accessibility not guaranteed'}.`,
    '',
    footer(),
    '',
  )
  return lines.join('\n')
}

/** The block page as markdown. */
export function blockMarkdown(doc: BlockDoc, installer: Installer = publishedInstaller): string {
  const cli = `npx ${installer.packageName}@${installer.version}`
  const installable = compareVersions(installer.version, blocksMinimumCli) >= 0
  const lines = [
    `# ${doc.title}`,
    '',
    doc.description,
    '',
    '## Installation',
    '',
    'Run in a project initialized with an Ombelle preset (see [Get started](/docs/getting-started.md)). The block uses the saved project preset. Run the command from your app folder; it shows the changes and asks before writing.',
    '',
  ]
  if (installable) {
    lines.push(
      fence(`${cli} add ${doc.id}`, 'sh'),
      '',
      `Adds \`components/blocks/${doc.id}.tsx\` and \`${doc.id}.css\` beside your components folder, and the components the block uses. A component you already installed and edited is kept as it is. Blocks need ${installer.packageName} ${blocksMinimumCli} or later.`,
      '',
      blockGlassAvailable(doc)
        ? glassNotice
        : `${doc.title} is not available in liquid glass; the CLI refuses it in glass projects.`,
      '',
    )
  } else {
    lines.push(`Requires CLI ${blocksMinimumCli}. The live preview uses the current catalog.`, '')
  }
  lines.push(
    '## Components it installs',
    '',
    ...doc.components.map((id) => `- [${componentDoc(id)?.name ?? id}](/components/${id}.md)`),
    '',
    '## Example only',
    '',
    'These flows show a notice instead of contacting a server. Replace them with your own calls.',
    '',
    ...doc.exampleOnly.map((flow) => `- ${flow}`),
    '',
    footer(),
    '',
  )
  return lines.join('\n')
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const voidTags = new Set(['br', 'hr', 'img'])

/**
 * Renders a guide's React content to HTML without react-dom/server, which Next.js refuses in route modules.
 * Guides use plain elements, the `Command` helper, and the code blocks; a code block becomes a marker the
 * turndown rules turn into a fenced block, so no client component is ever rendered.
 */
function toHtml(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return escapeHtml(String(node))
  if (Array.isArray(node)) return node.map(toHtml).join('')
  const element = node as ReactElement<Record<string, unknown> & { children?: ReactNode }>
  const { type, props } = element
  if (type === Fragment) return toHtml(props.children)
  if (type === CodeBlockCommand) return `<pre data-md="command">${escapeHtml(String(props.args))}</pre>`
  if (type === CodeBlock) return `<pre data-md="code" data-title="${escapeHtml(String(props.title ?? ''))}">${escapeHtml(String(props.code))}</pre>`
  if (typeof type === 'function') return toHtml((type as (props: unknown) => ReactNode)(props))
  if (typeof type !== 'string') throw new Error('Unsupported element in a guide.')
  const href = typeof props.href === 'string' ? ` href="${escapeHtml(props.href)}"` : ''
  return voidTags.has(type) ? `<${type}${href}>` : `<${type}${href}>${toHtml(props.children)}</${type}>`
}

function turndown(): TurndownService {
  const service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' })
  const marker = (node: HTMLElement, kind: string) => node.getAttribute?.('data-md') === kind
  // A command has one tab per package manager on the page; agents get the npm command.
  service.addRule('command', {
    filter: (node) => marker(node, 'command'),
    replacement: (_content, node) => `

${fence(`npx ${(node.textContent ?? '').trim()}`, 'sh')}

`,
  })
  service.addRule('code', {
    filter: (node) => marker(node, 'code'),
    replacement: (_content, node) => {
      const title = (node as HTMLElement).getAttribute('data-title') ?? ''
      return `

${fence(node.textContent ?? '', /.tsx$/.test(title) ? 'tsx' : '')}

`
    },
  })
  // Definition lists become bullets: the term in bold, then its definition.
  service.addRule('definitionTerm', { filter: 'dt', replacement: (content) => `\n- **${content.trim()}**: ` })
  service.addRule('definitionDetail', { filter: 'dd', replacement: (content) => `${content.trim()}\n` })
  service.addRule('definitionList', { filter: 'dl', replacement: (content) => `\n\n${content.trim()}\n\n` })
  return service
}

/** A guide page as markdown: every section's content under its heading, with commands as plain text. */
export function guideMarkdown(slug: GuideSlug): string {
  const guide = documentationGuides.find((item) => item.slug === slug)
  if (!guide) throw new Error(`Unknown guide: ${slug}`)
  const service = turndown()
  const sections = guideSections[slug].map((section) => {
    const html = toHtml(section.content)
    return `## ${section.title}\n\n${service.turndown(html).trim()}`
  })
  return [`# ${guide.title}`, '', guide.description, '', ...sections.flatMap((section) => [section, '']), footer(), ''].join('\n')
}
