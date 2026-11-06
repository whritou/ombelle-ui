import path from 'node:path'
import {
  FoundationError,
  type Artifact,
  type InstallableRecipe,
  type ProjectContext,
} from '@ombelle/contracts'
import { portable } from './paths.js'
import { rewriteModuleSpecifiers, recipeImportAlias } from '@ombelle/compiler'
export async function transformRecipeArtifact(
  context: ProjectContext,
  artifact: Artifact,
  recipe: InstallableRecipe,
): Promise<{ path: string; content: string }> {
  const { id, revision, component } = recipe
  const base = `recipes/${id}/r${revision}/`
  const filename = artifact.logicalPath.startsWith(base) ? artifact.logicalPath.slice(base.length) : ''
  let target: string
  if (artifact.logicalPath === 'lib/utils.ts' && artifact.kind === 'utility') target = context.utilsFile
  else if (
    (artifact.kind === 'component' && (filename === `${component}.tsx` ||
      (recipe.schemaVersion === '2.0' && /^[a-z][a-z0-9-]*\.tsx$/.test(filename)))) ||
    (artifact.kind === 'style' && filename === `${component}.css`)
  )
    target = path.join(context.componentsDir, artifact.logicalPath)
  else if (
    artifact.logicalPath === `examples/recipes/${id}/r${revision}.tsx` &&
    artifact.kind === 'usage'
  )
    target = path.join(
      context.sourceDir,
      'ombelle-examples',
      artifact.logicalPath.slice('examples/'.length),
    )
  else
    throw new FoundationError(
      'INVALID_DATA',
      'Unexpected recipe artifact',
      artifact.logicalPath,
    )
  return {
    path: portable(target),
    content:
      artifact.kind === 'style'
        ? artifact.content
        : await rewriteModuleSpecifiers(artifact.content, (specifier) =>
            recipeImportAlias(specifier, context.utilsAlias, context.uiAlias),
          ),
  }
}
