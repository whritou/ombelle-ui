import { familyAccessibilityCaveat, officialSnapshotOrigin, type StyleFamily } from '@ombelle/contracts'
import { compareVersions, publishedInstaller } from '../../snapshots/install-command'
import { blockDocs, blockGlassAvailable } from '../blocks/catalog'
import { componentDocs, glassOnSite } from '../components/catalog'
import { componentCategories } from '../components/component-names'
import { familyHeadings, siteStableFamilies } from '../families'

export type CatalogEntry = {
  id: string
  kind: 'component' | 'block'
  name: string
  description: string
  category?: string
  components?: string[]
  exampleOnly?: string[]
  installable: boolean
  minimumCli?: string
  glass: boolean
  docs: { html: string; markdown: string }
}

export type AgentCatalog = {
  catalogVersion: 1
  cliPackage: string
  cliVersion: string
  installCommand: string
  docs: { llms: string; llmsFull: string; agentsGuide: string }
  skills: { install: string }
  families: { id: string; name: string; accessibilityCaveat: string | null }[]
  components: CatalogEntry[]
  blocks: CatalogEntry[]
}

/** Blocks need CLI 1.1.0 (docs/05-cli-specification.md, "Blocks"). */
const blocksMinimumCli = '1.1.0'

type Installer = { packageName: string; version: string }

function family(id: StyleFamily, name: string) {
  return { id, name, accessibilityCaveat: familyAccessibilityCaveat(id) }
}

/** The machine-readable catalog an agent reads before choosing what to install. */
export function buildAgentCatalog(installer: Installer = publishedInstaller): AgentCatalog {
  const origin = officialSnapshotOrigin
  const categoryOf = new Map(componentCategories.flatMap((category) => category.ids.map((id) => [id, category.title] as const)))

  const components: CatalogEntry[] = componentDocs.map((doc) => ({
    id: doc.id,
    kind: 'component',
    name: doc.name,
    description: doc.description,
    ...(categoryOf.has(doc.id) ? { category: categoryOf.get(doc.id) } : {}),
    installable: !doc.minimumCli || compareVersions(installer.version, doc.minimumCli) >= 0,
    ...(doc.minimumCli ? { minimumCli: doc.minimumCli } : {}),
    glass: glassOnSite(doc.id),
    docs: { html: `${origin}/components/${doc.id}`, markdown: `${origin}/components/${doc.id}.md` },
  }))

  const blocks: CatalogEntry[] = blockDocs.map((doc) => ({
    id: doc.id,
    kind: 'block',
    name: doc.title,
    description: doc.description,
    components: doc.components,
    exampleOnly: doc.exampleOnly,
    installable: compareVersions(installer.version, blocksMinimumCli) >= 0,
    minimumCli: blocksMinimumCli,
    glass: blockGlassAvailable(doc),
    docs: { html: `${origin}/blocks/${doc.id}`, markdown: `${origin}/blocks/${doc.id}.md` },
  }))

  return {
    catalogVersion: 1,
    cliPackage: installer.packageName,
    cliVersion: installer.version,
    installCommand: `npx ${installer.packageName}@${installer.version}`,
    docs: { llms: `${origin}/llms.txt`, llmsFull: `${origin}/llms-full.txt`, agentsGuide: `${origin}/docs/agents` },
    skills: { install: 'npx skills add whritou/ombelle-ui' },
    families: [...siteStableFamilies.map((id) => family(id, familyHeadings[id])), family('liquid-glass', 'Liquid glass')],
    components,
    blocks,
  }
}

