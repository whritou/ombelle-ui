import fs from 'node:fs/promises'
import path from 'node:path'
import type { Artifact } from '@ombelle/contracts'
import { compileRecipe, sha256 } from '@ombelle/compiler'
import { recipeFixtures } from '../../fixtures/shared/recipes.js'
let bank: Promise<Map<string, Artifact>> | undefined
export function recipeReferenceBank(): Promise<Map<string, Artifact>> {
  return (bank ??= Promise.all(
    recipeFixtures().map((recipe) => compileRecipe({ recipe })),
  ).then(
    (results) =>
      new Map(
        results.flatMap((r) =>
          r.artifacts.map((a) => [a.logicalPath, a] as const),
        ),
      ),
  ))
}
export async function writePreviewRecipes(root: string): Promise<void> {
  const manifests: Record<string, unknown> = {},
    transforms: Record<string, unknown> = {}
  for (const recipe of recipeFixtures()) {
    const result = await compileRecipe({ recipe })
    manifests[recipe.id] = result
    for (const artifact of result.artifacts) {
      if (artifact.kind === 'utility') continue
      const target = path.join(
        root,
        artifact.kind === 'usage'
          ? artifact.logicalPath
          : 'components/ui/' + artifact.logicalPath,
      )
      const relative = (dest: string) => {
        const p = path
          .relative(path.dirname(target), dest)
          .split(path.sep)
          .join('/')
        return p.startsWith('.') ? p : './' + p
      }
      const content = artifact.content
        .replaceAll('@/lib/utils', relative(path.join(root, 'lib/utils')))
        .replaceAll(
          '@/components/ui',
          relative(path.join(root, 'components/ui')),
        )
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, content)
      transforms[artifact.logicalPath] = {
        canonicalHash: artifact.sha256,
        previewHash: await sha256(content),
      }
    }
  }
  await fs.writeFile(
    path.join(root, 'recipes-manifest.json'),
    JSON.stringify(manifests, null, 2),
  )
  await fs.writeFile(
    path.join(root, 'recipes-transforms.json'),
    JSON.stringify(transforms, null, 2),
  )
  await fs.writeFile(
    path.join(root, 'recipe-fixture.tsx'),
    (
      await fs.readFile('fixtures/shared/recipe-fixture.tsx', 'utf8')
    ).replaceAll('@/components/ui', './components/ui'),
  )
}
