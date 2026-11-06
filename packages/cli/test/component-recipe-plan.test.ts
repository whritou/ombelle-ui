import { expect, it } from 'vitest'
import { compileComponentRecipe } from '@ombelle/compiler'
import type { ProjectContext } from '@ombelle/contracts'
import badge from '../../../examples/component-recipe.badge.json'
import { transformRecipeArtifact } from '../src/project/recipe-transform.js'

it('rejects an artifact outside the canonical 2.0 recipe revision directory', async () => {
  const result = await compileComponentRecipe({ recipe: badge })
  const source = result.artifacts.find(artifact => artifact.kind === 'component')!
  const context = { componentsDir: 'src/components/ui', utilsAlias: '@/lib/utils', uiAlias: '@/components/ui' } as ProjectContext
  await expect(transformRecipeArtifact(context, {
    ...source, logicalPath: 'recipes/CATALOG_BADGE/r1/badge.tsx',
  }, result.recipe.data)).rejects.toMatchObject({ code: 'INVALID_DATA' })
})

it('refuses a relative import outside the private recipe directory', async () => {
  const result = await compileComponentRecipe({ recipe: badge })
  const source = result.artifacts.find(artifact => artifact.kind === 'component')!
  const context = { componentsDir: 'src/components/ui', utilsAlias: '@/lib/utils', uiAlias: '@/components/ui' } as ProjectContext
  await expect(transformRecipeArtifact(context, {
    ...source, content: "import '../host.tsx'\n" + source.content,
  }, result.recipe.data)).rejects.toMatchObject({ code: 'INVALID_DATA' })
})
