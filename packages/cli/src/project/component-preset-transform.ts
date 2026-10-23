import path from 'node:path'
import {
  FoundationError,
  type Artifact,
  type ProjectContext,
} from '@ombelle/contracts'
import { rewriteModuleSpecifiers, recipeImportAlias } from '@ombelle/compiler'
import { portable, safePath } from './paths.js'

export async function transformComponentPresetArtifact(
  context: ProjectContext,
  artifact: Artifact,
): Promise<{ path: string; content: string }> {
  // Validate before joining so normalization cannot hide traversal segments.
  await safePath(context.root, artifact.logicalPath)
  let target: string
  if (artifact.logicalPath === 'lib/utils.ts' && artifact.kind === 'utility')
    target = context.utilsFile
  else if (
    artifact.logicalPath.startsWith('scoped-presets/') &&
    ['component', 'style'].includes(artifact.kind)
  )
    target = path.join(
      context.componentsDir,
      'presets',
      artifact.logicalPath.slice('scoped-presets/'.length),
    )
  else if (
    artifact.logicalPath.startsWith('examples/scoped-presets/') &&
    artifact.kind === 'usage'
  )
    target = path.join(
      context.sourceDir,
      'ombelle-examples/presets',
      artifact.logicalPath.slice('examples/scoped-presets/'.length),
    )
  else
    throw new FoundationError(
      'INVALID_DATA',
      'Unexpected component preset artifact',
      artifact.logicalPath,
    )
  await safePath(context.root, target)
  return {
    path: portable(target),
    content:
      artifact.kind === 'style'
        ? artifact.content
        : await rewriteModuleSpecifiers(artifact.content, (specifier) => {
            const prefix = '@/components/ui/scoped-presets/'
            if (specifier.startsWith(prefix))
              return (
                context.uiAlias + '/presets/' + specifier.slice(prefix.length)
              )
            return recipeImportAlias(
              specifier,
              context.utilsAlias,
              context.uiAlias,
            )
          }),
  }
}
