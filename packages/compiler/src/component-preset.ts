import {
  FoundationError,
  isStyleFamily,
  validatePreset,
  type Artifact,
  type ComponentPresetCompileResult,
} from '@ombelle/contracts'
import { getCatalog, getTemplate } from '@ombelle/catalog'
import { format } from 'prettier/standalone'
import typescript from 'prettier/plugins/typescript'
import estree from 'prettier/plugins/estree'
import cssPlugin from 'prettier/plugins/postcss'
import { canonicalize } from './canonicalize.js'
import { sha256 } from './hash.js'
import { resolvePreset } from './resolve.js'
import {
  compileScopedButtonStyles,
  validateComponentPresetDarkSelector,
} from './recipe-styles.js'
import { renderScopedButton } from './recipe-source.js'

export async function compileButtonPreset(input: {
  preset: unknown
  darkSelector?: string
}): Promise<ComponentPresetCompileResult> {
  const raw = validatePreset(input.preset)
  const catalog = getCatalog(raw.catalogRelease)
  const preset = await resolvePreset(raw, catalog)
  const darkSelector = validateComponentPresetDarkSelector(
    input.darkSelector ?? '.dark',
  )
  const provenance = {
    catalogRelease: catalog.release,
    compilerVersion: raw.compilerVersion,
  }
  const scope = await sha256(
    canonicalize({ presetHash: preset.hash, ...provenance }),
  )
  const template = getTemplate(catalog, 'button')
  if (!isStyleFamily(preset.data.styleFamily))
    throw new FoundationError(
      'INVALID_DATA',
      'Style family is not available in the foundation',
      '/styleFamily',
    )
  const base = 'scoped-presets/' + preset.data.id + '/r' + preset.data.revision
  const examplePath =
    'examples/scoped-presets/' +
    preset.data.id +
    '/r' +
    preset.data.revision +
    '.tsx'
  const drafts: Omit<Artifact, 'sha256'>[] = [
    {
      logicalPath: base + '/button.tsx',
      kind: 'component',
      content: renderScopedButton({
        template: template.content,
        componentName: 'Button',
        propsTypeName: 'ButtonProps',
        scope,
        slot: 'scoped-button',
        scopeAttribute: 'data-ombelle-scope',
        defaultVariant:
          preset.data.componentDefaults?.button?.variant ?? 'default',
        defaultSize: preset.data.componentDefaults?.button?.size ?? 'default',
      }),
    },
    {
      logicalPath: base + '/button.css',
      kind: 'style',
      content: compileScopedButtonStyles({
        familyCss:
          catalog.styles[
            preset.data.styleFamily as keyof typeof catalog.styles
          ],
        preset,
        overrides: {},
        scope,
        darkSelector,
        slot: 'scoped-button',
        scopeAttribute: 'data-ombelle-scope',
        scopeLabel: 'component-preset',
      }),
    },
    {
      logicalPath: examplePath,
      kind: 'usage',
      content: `import { Button } from '@/components/ui/${base}/button'\nexport function Example(){return <Button>Save</Button>}`,
    },
    { logicalPath: 'lib/utils.ts', kind: 'utility', content: catalog.utility },
  ]
  const artifacts: Artifact[] = []
  for (const draft of drafts.sort((a, b) =>
    a.logicalPath < b.logicalPath ? -1 : 1,
  )) {
    const content = await format(draft.content, {
      parser: draft.kind === 'style' ? 'css' : 'typescript',
      plugins: [typescript, estree, cssPlugin],
      endOfLine: 'lf',
      singleQuote: true,
      semi: false,
    })
    artifacts.push({ ...draft, content, sha256: await sha256(content) })
  }
  return {
    artifacts,
    dependencies: template.dependencies.filter(
      (dependency) => dependency.name !== '@radix-ui/react-slot',
    ).sort((a, b) => (a.name < b.name ? -1 : 1)),
    preset,
    scope,
    darkSelector,
    provenance,
  }
}
