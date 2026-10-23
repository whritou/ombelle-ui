import fs from 'node:fs/promises'
import path from 'node:path'
import { compile, sha256 } from '@ombelle/compiler'
import {
  supportedStyleFamilies,
  supportedComponentIds,
} from '@ombelle/contracts'
import { writePreviewRecipes } from '../tests/helpers/recipe-fixture.js'
import { writePreviewComponentPresets } from '../tests/helpers/component-preset-fixture.js'
for (const family of supportedStyleFamilies) {
  const preset = JSON.parse(
    await fs.readFile(
      'packages/catalog/src/presets/' + family + '.json',
      'utf8',
    ),
  )
  const result = await compile({
    preset,
    componentIds: supportedComponentIds,
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
  await writePreviewRecipes(root)
  await fs.writeFile(
    root + '/transforms.json',
    JSON.stringify(transforms, null, 2),
  )
  const scenario = (await fs.readFile('fixtures/shared/scenario.tsx', 'utf8'))
    .replaceAll('STYLE_FAMILY', family)
    .replaceAll('@/components/ui', './components/ui')
  await fs.writeFile(root + '/scenario.tsx', scenario)
  await fs.writeFile(
    root + '/badge-fixture.tsx',
    (await fs.readFile('fixtures/shared/badge-fixture.tsx', 'utf8')).replaceAll(
      '@/components/ui',
      './components/ui',
    ),
  )
  await writePreviewComponentPresets(root)
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
  await fs.writeFile(
    root + '/preview.css',
    '@import "../../base.css";\n@import "./styles/ui-tokens.css";\n@import "./styles/ui-style.css";\n@source "./components";\n@source "./scenario.tsx";\n',
  )
  await fs.writeFile(
    root + '/entry.tsx',
    "import './preview.css'\nimport manifest from './manifest.json'\nimport recipes from './recipes-manifest.json'\nconst hash = async (content: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))),byte=>byte.toString(16).padStart(2,'0')).join('')\n;(window as any).__artifactHashes = manifest.artifacts.map(artifact => hash(artifact.content))\n;(window as any).__recipeArtifactHashes = Object.fromEntries(Object.entries(recipes).map(([id,result])=>[id,result.artifacts.map(artifact=>hash(artifact.content))]))\nexport {default} from './scenario'\n",
  )
}
