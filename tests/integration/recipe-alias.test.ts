import { expect, it } from 'vitest'
import {
  compileRecipe,
  rewriteModuleSpecifiers,
  recipeImportAlias,
} from '@ombelle/compiler'
import { createProject } from '../helpers/projects.js'
import { inspectProject } from '../../packages/cli/src/project/inspect.js'
import { transformRecipeArtifact } from '../../packages/cli/src/project/recipe-transform.js'
import fs from 'node:fs/promises'
import example from '../../examples/recipe.example.json'
it('rewrites import specifiers without changing saved text or module-like Unicode lines', async () => {
  const root = await createProject('vite')
  try {
    const context = await inspectProject(root)
    context.uiAlias = '~/ui'
    context.utilsAlias = '~/helpers/cn'
    const content =
      'Open @/lib/utils and @/components/ui\u2028import { cn } from "@/lib/utils"'
    const result = await compileRecipe({ recipe: { ...example, content } })
    for (const artifact of result.artifacts.filter(
      (a) => a.kind === 'component' || a.kind === 'usage',
    )) {
      const output = await transformRecipeArtifact(context, artifact)
      expect(output.content).toContain('Open @/lib/utils and @/components/ui')
      expect(output.content).toContain('import { cn } from "@/lib/utils"')
      if (artifact.kind === 'component')
        expect(output.content).toMatch(/from ['"]~\/helpers\/cn['"]/)
      else expect(output.content).toMatch(/from ['"]~\/ui\/recipes\//)
      const preview = await rewriteModuleSpecifiers(
        artifact.content,
        (specifier) =>
          recipeImportAlias(
            specifier,
            '../../../../../lib/utils',
            '../../../components/ui',
          ),
      )
      expect(preview).toContain('Open @/lib/utils and @/components/ui')
      expect(preview).toContain('import { cn } from "@/lib/utils"')
      expect(preview).toMatch(/from ['"]\.\.\//)
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
