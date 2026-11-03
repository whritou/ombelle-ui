import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  compile,
  compileButtonPreset,
  compileRecipe,
} from '../packages/compiler/src/index.ts'
import {
  supportedComponentIds,
  supportedStyleFamilies,
} from '../packages/contracts/src/index.ts'
import { recipeFixtures } from '../fixtures/shared/recipes.ts'

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../packages/compiler/test/fixtures/stable-family-hashes.json',
)

export async function stableArtifactHashes(): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const family of supportedStyleFamilies) {
    const preset = JSON.parse(
      await fs.readFile(
        path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          '../packages/catalog/src/presets/' + family + '.json',
        ),
        'utf8',
      ),
    )
    const add = (
      kind: string,
      artifacts: readonly { logicalPath: string; sha256: string }[],
    ) => {
      for (const a of artifacts)
        hashes[`${family}/${kind}/${a.logicalPath}`] = a.sha256
    }
    add(
      'compile',
      (
        await compile({
          preset,
          componentIds: supportedComponentIds,
          catalogRelease: '0.1.0',
          compilerVersion: '0.1.0',
        })
      ).artifacts,
    )
    add(
      'component-preset',
      (await compileButtonPreset({ preset, darkSelector: '.dark' })).artifacts,
    )
    for (const recipe of recipeFixtures().filter(
      (r) => r.presetRef.id === 'builtin-' + family,
    ))
      add(
        'recipe',
        (await compileRecipe({ recipe, darkSelector: '.dark' })).artifacts,
      )
  }
  return Object.fromEntries(
    Object.entries(hashes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hashes = await stableArtifactHashes()
  await fs.mkdir(path.dirname(fixturePath), { recursive: true })
  await fs.writeFile(fixturePath, JSON.stringify(hashes, null, 2) + '\n')
  console.log(`wrote ${Object.keys(hashes).length} hashes to ${fixturePath}`)
}
