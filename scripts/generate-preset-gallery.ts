import fs from 'node:fs/promises'
import path from 'node:path'
import {
  compile,
  rewriteModuleSpecifiers,
  sha256,
  stripStylesheetImports,
} from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import {
  supportedComponentIds,
  supportedStyleFamilies,
} from '@ombelle/contracts'

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
  const results = await Promise.all(
    supportedStyleFamilies.map((family) =>
      compile({
        preset: catalog.presets[family],
        componentIds: supportedComponentIds,
        catalogRelease: '0.1.0',
        compilerVersion: '0.1.0',
      }),
    ),
  )
  const result = results[0],
    sources = result.artifacts.filter(
      (item) => item.kind === 'component' || item.kind === 'utility',
    )
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
  for (const artifact of sources) {
    if (
      !results.every(
        (r) =>
          r.artifacts.find((a) => a.logicalPath === artifact.logicalPath)
            ?.sha256 === artifact.sha256,
      )
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
