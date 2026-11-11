import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, scopeRecipeGlassFilter, scopeRecipeTemplate, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import type { Edition } from '@ombelle/contracts'
import {
  supportedStyleFamilies,
  styleFamilies,
  supportedComponentIds,
  componentsWithStyleSupport,
} from '@ombelle/contracts'
import { writePreviewRecipes } from '../tests/helpers/recipe-fixture.js'
import { writePreviewComponentPresets } from '../tests/helpers/component-preset-fixture.js'
import { writePresetGallery } from './generate-preset-gallery.js'
import { writeAuditPages } from './generate-audit.js'
import { generateWwwUi } from './generate-www-ui.js'
type PreviewFamily = (typeof supportedStyleFamilies)[number] | 'liquid-glass'
async function writeFamily(family: PreviewFamily) {
  const glass = family === 'liquid-glass'
  const preset = JSON.parse(
    await fs.readFile(
      'packages/catalog/src/presets/' + family + '.json',
      'utf8',
    ),
  )
  const result = await compile({
    preset,
    componentIds: glass
      ? componentsWithStyleSupport('liquid-glass', ['experimental'])
      : supportedComponentIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const root = 'apps/preview/src/generated/' + family,
    transforms: Record<string, { canonicalHash: string; previewHash: string }> =
      {}
  for (const artifact of result.artifacts) {
    const dest = path.join(root, artifact.logicalPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    let content = artifact.content
    if (artifact.kind === 'component')
      content = content.replaceAll('@/lib/utils', '../../lib/utils')
    if (artifact.kind === 'usage')
      content = content.replaceAll('@/components/ui', '../components/ui')
    await fs.writeFile(dest, content)
    transforms[artifact.logicalPath] = {
      canonicalHash: artifact.sha256,
      previewHash: await sha256(content),
    }
  }
  await fs.writeFile(root + '/manifest.json', JSON.stringify(result, null, 2))
  if (!glass) await writePreviewRecipes(root)
  await fs.writeFile(
    root + '/transforms.json',
    JSON.stringify(transforms, null, 2),
  )
  const scenario = (await fs.readFile(
    glass ? 'fixtures/shared/glass-scenario.tsx' : 'fixtures/shared/scenario.tsx',
    'utf8',
  ))
    .replaceAll('STYLE_FAMILY', family)
    .replaceAll('GLASS_UNAVAILABLE', componentsWithStyleSupport(family, ['unavailable']).join(','))
    .replaceAll('@/components/ui', './components/ui')
  await fs.writeFile(root + '/scenario.tsx', scenario)
  if (!glass) {
    await fs.writeFile(
      root + '/badge-fixture.tsx',
      (await fs.readFile('fixtures/shared/badge-fixture.tsx', 'utf8')).replaceAll(
        '@/components/ui',
        './components/ui',
      ),
    )
    await writePreviewComponentPresets(root)
    await fs.writeFile(
      root + '/card-fixture.tsx',
      (await fs.readFile('fixtures/shared/card-fixture.tsx', 'utf8')).replaceAll(
        '@/components/ui',
        './components/ui',
      ),
    )
    await fs.writeFile(
      root + '/forms-fixture.tsx',
      (await fs.readFile('fixtures/shared/forms-fixture.tsx', 'utf8')).replaceAll(
        '@/components/ui',
        './components/ui',
      ),
    )
    await fs.writeFile(
      root + '/state-fixture.tsx',
      (await fs.readFile('fixtures/shared/state-fixture.tsx', 'utf8')).replaceAll(
        '@/components/ui',
        './components/ui',
      ),
    )
    await fs.copyFile(
      'fixtures/shared/state-fixture.css',
      root + '/state-fixture.css',
    )
    for (const id of ['checkbox', 'switch', 'tabs', 'tooltip'])
      await fs.writeFile(
        root + '/' + id + '-fixture.tsx',
        (await fs.readFile('fixtures/shared/' + id + '-fixture.tsx', 'utf8'))
          .replaceAll('@/components/ui', './components/ui'),
      )
  }
  await fs.writeFile(
    root + '/preview.css',
    '@import "../../base.css";\n@import "./styles/ui-tokens.css";\n@import "./styles/ui-style.css";\n@source "./components";\n@source "./scenario.tsx";\n',
  )
  await fs.writeFile(
    root + '/entry.tsx',
    glass
      ? "import './preview.css'\nimport manifest from './manifest.json'\nconst hash = async (content: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))),byte=>byte.toString(16).padStart(2,'0')).join('')\n;(window as any).__artifactHashes = manifest.artifacts.map(artifact => hash(artifact.content))\nexport {default} from './scenario'\n"
      : "import './preview.css'\nimport manifest from './manifest.json'\nimport recipes from './recipes-manifest.json'\nconst hash = async (content: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))),byte=>byte.toString(16).padStart(2,'0')).join('')\n;(window as any).__artifactHashes = manifest.artifacts.map(artifact => hash(artifact.content))\n;(window as any).__recipeArtifactHashes = Object.fromEntries(Object.entries(recipes).map(([id,result])=>[id,result.artifacts.map(artifact=>hash(artifact.content))]))\nexport {default} from './scenario'\n",
  )
}
for (const family of supportedStyleFamilies) await writeFamily(family)
// Components with a Base UI template, rendered per edition for the parity test.
async function writeEdition(family: (typeof styleFamilies)[number], edition: Edition) {
  const catalog = getCatalog('0.1.0')
  const ported = supportedComponentIds
  const result = await compile({
    preset: JSON.parse(await fs.readFile('packages/catalog/src/presets/' + family + '.json', 'utf8')),
    componentIds: ported,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    edition,
  })
  const root = 'apps/preview/src/generated/editions/' + family + '-' + edition
  await fs.rm(root, { recursive: true, force: true })
  for (const artifact of result.artifacts) {
    if (artifact.kind === 'usage') continue
    const dest = path.join(root, artifact.logicalPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(
      dest,
      artifact.kind === 'component'
        ? artifact.content.replaceAll('@/lib/utils', '../../lib/utils')
        : artifact.content,
    )
  }
  const scenario = 'fixtures/shared/edition-scenario' + (edition === 'base' ? '-base' : '') + '.tsx'
  await fs.writeFile(
    root + '/scenario.tsx',
    (await fs.readFile(scenario, 'utf8')).replaceAll('@/components/ui', './components/ui'),
  )
  await fs.writeFile(
    root + '/preview.css',
    // The audit pages render specimens from ../../audit/*.json, whose layout classes Tailwind must see.
    '@import "../../../base.css";\n@import "./styles/ui-tokens.css";\n@import "./styles/ui-style.css";\n@source "./components";\n@source "./scenario.tsx";\n@source "../../audit";\n',
  )
  await fs.writeFile(root + '/entry.tsx', "import './preview.css'\nexport { default } from './scenario'\n")
}
for (const family of styleFamilies)
  for (const edition of ['radix', 'base'] as const) await writeEdition(family, edition)
await writeFamily('liquid-glass')
await fs.writeFile(
  'apps/preview/src/generated/editor-buttons.ts',
  `// Generated by scripts/generate-preview.ts from catalog release 0.1.0.\nexport const editorButtons = {\n${[...supportedStyleFamilies, 'liquid-glass'].map((family) => `  '${family}': () => import('./${family}/components/ui/button'),`).join('\n')}\n} as const\n`,
)
await writePresetGallery('apps/preview/src/generated/preset-gallery')
await writeAuditPages('apps/preview/src/generated/audit')
// The website editor's catalog components, for its dev server, build, typecheck and tests.
await generateWwwUi()
const recipeComponents = supportedComponentIds.filter(id => id !== 'button')
const recipeDirectory = 'apps/preview/src/generated/catalog-recipes'
const recipeCatalog = getCatalog('0.1.0')
await fs.mkdir(recipeDirectory, { recursive: true })
await fs.writeFile(`${recipeDirectory}/liquid-glass-filter.tsx`, scopeRecipeGlassFilter(recipeCatalog.glassFilter))
for (const id of recipeComponents)
  await fs.writeFile(`${recipeDirectory}/${id}.tsx`,
    scopeRecipeTemplate(recipeCatalog.templates[id], '../flat/lib/utils.js'))
await fs.writeFile(`${recipeDirectory}/index.ts`,
  `export const scopedCatalogComponents = {\n${recipeComponents.map(id => `  '${id}': () => import('./${id}'),`).join('\n')}\n} as const\n`)
