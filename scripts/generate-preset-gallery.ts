import fs from 'node:fs/promises'
import path from 'node:path'
import {
  compile,
  rewriteModuleSpecifiers,
  sha256,
  stripStylesheetImports,
} from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { componentsWithStyleSupport, styleFamilies } from '@ombelle/contracts'

export type PresetSourceManifest = {
  catalogRelease: '0.1.0'
  compilerVersion: '0.1.0'
  sources: Record<string, { canonicalHash: string; transformedHash: string }>
}
export async function transformGallerySource(
  source: string,
  logicalPath: string,
  styles: Set<string>,
): Promise<string> {
  const directory = path.posix.dirname(logicalPath)
  const allowed = [...styles]
    .filter((style) => path.posix.dirname(style) === directory)
    .map((style) => './' + path.posix.basename(style))
  source = await stripStylesheetImports(source, allowed)
  return rewriteModuleSpecifiers(source, (specifier) =>
    specifier === '@/lib/utils' ? '../../lib/utils' : specifier,
  )
}
export async function writePresetGallery(root: string): Promise<void> {
  const catalog = getCatalog('0.1.0')
  // Every family, liquid glass included, compiles the components it supports.
  // The first (flat) result covers all twelve and supplies the gallery source.
  const results = await Promise.all(
    styleFamilies.map((family) =>
      compile({
        preset: catalog.presets[family],
        componentIds: componentsWithStyleSupport(family, [
          'stable',
          'experimental',
        ]),
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      }),
    ),
  )
  const result = results[0]
  // Glass-only supporting files, absent from the stable families by design.
  const glassOnly = new Set(['components/ui/liquid-glass-filter.tsx'])
  const sources = result.artifacts.filter(
    (item) => item.kind === 'component' || item.kind === 'utility',
  )
  for (const family of results)
    for (const artifact of family.artifacts)
      if (glassOnly.has(artifact.logicalPath) && !sources.some((source) => source.logicalPath === artifact.logicalPath))
        sources.push(artifact)
  const styles = new Set(
    result.artifacts
      .filter((item) => item.kind === 'style')
      .map((item) => item.logicalPath),
  )
  const manifest: PresetSourceManifest = {
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    sources: {},
  }
  for (const family of results)
    for (const artifact of family.artifacts)
      if (
        (artifact.kind === 'component' || artifact.kind === 'utility') &&
        !sources.some((source) => source.logicalPath === artifact.logicalPath)
      )
        throw new Error('Gallery source is missing: ' + artifact.logicalPath)
  for (const artifact of sources) {
    // A family that cannot style a component omits its source; any family
    // that includes it must ship the same reviewed bytes.
    if (
      !results.every((r, index) => {
        const match = r.artifacts.find(
          (a) => a.logicalPath === artifact.logicalPath,
        )
        return match
          ? match.sha256 === artifact.sha256
          : glassOnly.has(artifact.logicalPath) ||
              componentsWithStyleSupport(styleFamilies[index], ['unavailable'])
                .length > 0
      })
    )
      throw new Error(
        'Gallery source differs between families: ' + artifact.logicalPath,
      )
    const transformed = await transformGallerySource(
      artifact.content,
      artifact.logicalPath,
      styles,
    )
    const destination = path.join(root, artifact.logicalPath)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, transformed)
    manifest.sources[artifact.logicalPath] = {
      canonicalHash: artifact.sha256,
      transformedHash: await sha256(transformed),
    }
  }
  const fixture = await fs.readFile(
    new URL('../fixtures/shared/preset-gallery.tsx', import.meta.url),
    'utf8',
  )
  await fs.writeFile(
    path.join(root, 'gallery.tsx'),
    await rewriteModuleSpecifiers(fixture, (s) =>
      s.replace(/^@\/components\/ui\//, './components/ui/'),
    ),
  )
  await fs.copyFile(
    new URL('../fixtures/shared/preset-gallery.css', import.meta.url),
    path.join(root, 'layout.css'),
  )
  const mappings = Object.entries(result.theme.theme)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value};`)
    .join('')
  await fs.writeFile(
    path.join(root, 'tailwind.css'),
    `@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));\n@source "./components";\n@source "./gallery.tsx";\n@theme inline {${mappings}}\n`,
  )
  await fs.writeFile(
    path.join(root, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
  await fs.writeFile(
    path.join(root, 'manifest.ts'),
    'export default ' + JSON.stringify(manifest, null, 2) + ' as const\n',
  )
  // Vite reads these exact transformed bytes at build time. The runtime hashes
  // the same raw files before acknowledging a preview, rather than trusting a
  // manifest containing unverified transformed hashes.
  await fs.writeFile(
    path.join(root, 'sources.ts'),
    `export const gallerySources = {\n${sources.map((a) => `  '${a.logicalPath}': () => import('./${a.logicalPath}?raw').then(m => m.default),`).join('\n')}\n}\n`,
  )
}
