import type { StyleFamily } from '@ombelle/contracts'
import { getCatalogPresets, offeredGlassPresetOrder } from '@ombelle/catalog/presets'
import { paletteSchemes } from '../../preset-editor/schemes'
import { componentDocs } from '../../site/components/catalog'
import { familyList, siteStableFamilies } from '../../site/families'
import { Landing } from '../../site/home/landing'
import type { LandingData } from '../../site/home/landing-state'
import type { LandingPalette } from '../../site/home/landing-theme'
import { catalog09Components, managerRunner, publishedInstaller } from '../../snapshots/install-command'

export const metadata = {
  title: 'Ombelle UI — Your components. Your style.',
  description:
    `Editable, accessible React components on shadcn and Radix UI for Vite and Next.js with Tailwind v4, in ${familyList()} styles with persistent project presets.`,
}

/** The colours the landing page reads from a palette, in the order LandingPalette documents. */
const paletteKeys = ['background', 'foreground', 'card', 'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'muted', 'mutedForeground', 'border'] as const

// Everything the page shows about the catalog is resolved here, on the server,
// so the client bundle carries the values and not the editor code that owns them.
const families: StyleFamily[] = [...siteStableFamilies, 'liquid-glass']
const { startingPresets } = getCatalogPresets('0.1.0')
const data: LandingData = {
  families,
  palettes: Object.fromEntries(siteStableFamilies.map((family) => [
    family,
    paletteSchemes(family).map((scheme): LandingPalette => ({
      name: scheme.label,
      light: paletteKeys.map((key) => scheme.light[key] ?? ''),
      dark: paletteKeys.map((key) => scheme.dark[key] ?? ''),
    })),
  ])),
  // The family base is the page's "Liquid glass" default, so only the named presets are listed.
  glassPresets: offeredGlassPresetOrder.filter((id) => id !== 'builtin-liquid-glass').map((id) => {
    const preset = startingPresets[id]
    return { name: preset.name, blurPx: preset.design.glassBlurPx ?? 0, opacity: preset.design.glassOpacity ?? 1 }
  }),
  components: componentDocs.map((doc) => ({ name: doc.name, fresh: catalog09Components.has(doc.id) })),
  componentCount: componentDocs.length,
  runners: { npm: managerRunner('npm'), pnpm: managerRunner('pnpm'), yarn: managerRunner('yarn'), bun: managerRunner('bun') },
  cliVersion: publishedInstaller.version,
}

export default function HomePage() {
  return <Landing data={data} />
}
