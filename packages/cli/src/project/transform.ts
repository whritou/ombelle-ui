import path from 'node:path'
import type { Artifact, ProjectContext } from '@ombelle/contracts'
import { portable } from './paths.js'
export function transformArtifact(
  context: ProjectContext,
  artifact: Artifact,
): { path: string; content: string } {
  const target =
    artifact.kind === 'component'
      ? path.join(context.componentsDir, path.basename(artifact.logicalPath))
      : artifact.kind === 'utility'
        ? context.utilsFile
        : artifact.logicalPath === 'styles/ui-style.css'
          ? context.styleFile
          : path.join(
              context.sourceDir,
              'ombelle-examples',
              path.basename(artifact.logicalPath),
            )
  return {
    path: portable(target),
    content: artifact.content
      .replaceAll('@/lib/utils', context.utilsAlias)
      .replaceAll('@/components/ui', context.uiAlias),
  }
}
