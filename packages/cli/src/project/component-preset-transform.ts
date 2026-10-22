import path from 'node:path'
import {
  FoundationError,
  type Artifact,
  type ProjectContext,
} from '@ombelle/contracts'
import { rewriteModuleSpecifiers } from '@ombelle/compiler'
import { portable } from './paths.js'

export type ComponentPresetTransformContext = Pick<
  ProjectContext,
  'componentsDir' | 'sourceDir' | 'utilsFile' | 'uiAlias' | 'utilsAlias'
>

const componentArtifact =
  /^scoped-presets\/([a-zA-Z0-9_-]+)\/r([1-9]\d*)\/(button\.(?:tsx|css))$/i
const exampleArtifact =
  /^examples\/scoped-presets\/([a-zA-Z0-9_-]+)\/r([1-9]\d*)\.tsx$/i

function scopedImportAlias(
  specifier: string,
  context: ComponentPresetTransformContext,
): string {
  if (specifier === '@/lib/utils') return context.utilsAlias
  const prefix = '@/components/ui/scoped-presets/'
  if (specifier.startsWith(prefix))
    return context.uiAlias + '/presets/' + specifier.slice(prefix.length)
  return specifier
}

export async function transformComponentPresetArtifact(
  context: ComponentPresetTransformContext,
  artifact: Artifact,
): Promise<{ path: string; content: string }> {
  let target: string
  if (artifact.logicalPath === 'lib/utils.ts' && artifact.kind === 'utility') {
    target = context.utilsFile
  } else {
    const component = componentArtifact.exec(artifact.logicalPath)
    const example = exampleArtifact.exec(artifact.logicalPath)
    if (
      component &&
      ['component', 'style'].includes(artifact.kind) &&
      ((artifact.kind === 'component' &&
        component[3]!.toLowerCase() === 'button.tsx') ||
        (artifact.kind === 'style' &&
          component[3]!.toLowerCase() === 'button.css'))
    ) {
      target = path.join(
        context.componentsDir,
        'presets',
        component[1]!,
        'r' + component[2],
        component[3]!,
      )
    } else if (example && artifact.kind === 'usage') {
      target = path.join(
        context.sourceDir,
        'ombelle-examples',
        'presets',
        example[1]!,
        'r' + example[2] + '.tsx',
      )
    } else {
      throw new FoundationError(
        'INVALID_DATA',
        'Unexpected component preset artifact',
        artifact.logicalPath,
      )
    }
  }
  return {
    path: portable(target),
    content:
      artifact.kind === 'style'
        ? artifact.content
        : await rewriteModuleSpecifiers(artifact.content, (specifier) =>
            scopedImportAlias(specifier, context),
          ),
  }
}
