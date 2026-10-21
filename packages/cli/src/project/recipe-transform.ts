import path from 'node:path'
import {
  FoundationError,
  type Artifact,
  type ProjectContext,
} from '@ombelle/contracts'
import { portable } from './paths.js'
export function transformRecipeArtifact(
  context: ProjectContext,
  artifact: Artifact,
): { path: string; content: string } {
  let target: string
  if (artifact.logicalPath === 'lib/utils.ts') target = context.utilsFile
  else if (
    artifact.logicalPath.startsWith('recipes/') &&
    ['component', 'style'].includes(artifact.kind)
  )
    target = path.join(context.componentsDir, artifact.logicalPath)
  else if (
    artifact.logicalPath.startsWith('examples/recipes/') &&
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
    content: artifact.content
      .replaceAll('@/lib/utils', context.utilsAlias)
      .replaceAll('@/components/ui', context.uiAlias),
  }
}
