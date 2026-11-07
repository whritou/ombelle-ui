import path from 'node:path'
import type { Artifact, ProjectContext } from '@ombelle/contracts'
import { portable } from './paths.js'
import { besideDirectory } from './beside.js'
/** Component id of a component, component stylesheet or usage artifact. */
const artifactComponent = (artifact: Artifact) =>
  path.basename(artifact.logicalPath).replace(/\.(tsx|css)$/, '')
export function transformArtifact(
  context: ProjectContext,
  artifact: Artifact,
  beside: ReadonlySet<string> = new Set(),
): { path: string; content: string } {
  const component =
    artifact.kind === 'component' ||
    (artifact.kind === 'style' &&
      artifact.logicalPath.startsWith('components/ui/'))
  const id = artifactComponent(artifact)
  const target = component
    ? path.join(
        context.componentsDir,
        ...(beside.has(id) ? [besideDirectory] : []),
        path.basename(artifact.logicalPath),
      )
    : artifact.kind === 'utility'
      ? context.utilsFile
      : artifact.logicalPath === 'styles/ui-style.css'
        ? context.styleFile
        : path.join(
            context.sourceDir,
            'ombelle-examples',
            path.basename(artifact.logicalPath),
          )
  let content = artifact.content
  if (artifact.kind === 'usage' && beside.has(id))
    content = content.replaceAll(
      "'@/components/ui/" + id + "'",
      "'@/components/ui/" + besideDirectory + '/' + id + "'",
    )
  return {
    path: portable(target),
    content: content
      .replaceAll('@/lib/utils', context.utilsAlias)
      .replaceAll('@/components/ui', context.uiAlias),
  }
}
