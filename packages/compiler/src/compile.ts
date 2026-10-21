import {
  FoundationError,
  type ComponentId,
  type CompileResult,
  type Artifact,
  type ThemeData,
  isStyleFamily,
} from '@ombelle/contracts'
import { getCatalog, getTemplate } from '@ombelle/catalog'
import { format } from 'prettier/standalone'
import typescript from 'prettier/plugins/typescript'
import estree from 'prettier/plugins/estree'
import postcss from 'prettier/plugins/postcss'
import { resolvePreset } from './resolve.js'
import { sha256 } from './hash.js'
const variable = (key: string) =>
  '--' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
export async function compile(input: {
  preset: unknown
  componentIds: readonly ComponentId[]
  catalogRelease: string
  compilerVersion: string
}): Promise<CompileResult> {
  if (input.compilerVersion !== '0.1.0')
    throw new FoundationError(
      'UNSUPPORTED_RELEASE',
      'Unsupported compiler version',
      '/compilerVersion',
    )
  const catalog = getCatalog(input.catalogRelease),
    preset = await resolvePreset(input.preset, catalog)
  const family = preset.data.styleFamily
  if (!isStyleFamily(family)) throw new FoundationError('INVALID_DATA', 'Style family is not available in the foundation', '/styleFamily')
  const theme: ThemeData = { light: {}, dark: {}, theme: {} }
  for (const mode of ['light', 'dark'] as const)
    for (const [key, value] of Object.entries(preset.data.modes[mode]))
      theme[mode][variable(key)] = value
  const d = preset.data.design
  Object.assign(theme.light, {
    '--radius': d.radiusRem + 'rem',
    '--border-width': d.borderWidthPx + 'px',
    '--shadow-x': d.shadowOffsetXPx + 'px',
    '--shadow-y': d.shadowOffsetYPx + 'px',
    '--control-height': d.density === 'compact' ? '2.25rem' : '2.5rem',
    '--font-family':
      d.fontFamilyId === 'system-serif'
        ? 'Georgia, serif'
        : d.fontFamilyId === 'system-mono'
          ? 'monospace'
          : 'Arial, sans-serif',
    '--motion-duration': d.motion === 'reduced' ? '0ms' : '150ms',
  })
  for (const key of Object.keys(preset.data.modes.light))
    theme.theme['--color-' + variable(key).slice(2)] =
      'var(' + variable(key) + ')'
  const block = (selector: string, values: Record<string, string>) =>
    selector +
    '{' +
    Object.keys(values)
      .sort()
      .map((k) => k + ':' + values[k] + ';')
      .join('') +
    '}'
  const drafts: {
    logicalPath: string
    kind: Artifact['kind']
    content: string
  }[] = [
    {
      logicalPath: 'styles/ui-tokens.css',
      kind: 'style',
      content:
        block(':root', theme.light) +
        block('.dark', theme.dark) +
        block('@theme inline', theme.theme),
    },
    {
      logicalPath: 'styles/ui-style.css',
      kind: 'style',
      content: catalog.styles[family],
    },
  ]
  const dependencies = new Map<string, string>()
  const ids = [...new Set(input.componentIds)].sort()
  for (const id of ids) {
    const template = getTemplate(catalog, id)
    let content = template.content.replaceAll("'./utils.js'", "'@/lib/utils'")
    if (id === 'button')
      content = content
        .replace(
          "variant = 'default'",
          "variant = '" + preset.data.componentDefaults!.button!.variant + "'",
        )
        .replace(
          "size = 'default'",
          "size = '" + preset.data.componentDefaults!.button!.size + "'",
        )
    drafts.push({
      logicalPath: template.logicalPath,
      kind: 'component',
      content,
    })
    const usage =
      id === 'dialog'
        ? "import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'\nexport function Example(){return <Dialog><DialogTrigger>Open dialog</DialogTrigger><DialogContent><DialogTitle>Example dialog</DialogTitle><DialogDescription>Review this example.</DialogDescription></DialogContent></Dialog>}"
        : id === 'button'
          ? "import { Button } from '@/components/ui/button'\nexport function Example(){return <Button>Save</Button>}"
          : 'import { Input } from \'@/components/ui/input\'\nexport function Example(){return <label>Email<Input id="email" type="email" /></label>}'
    drafts.push({
      logicalPath: 'examples/' + id + '.tsx',
      kind: 'usage',
      content: usage,
    })
    for (const dep of template.dependencies)
      dependencies.set(dep.name, dep.version)
  }
  if (ids.length)
    drafts.push({
      logicalPath: 'lib/utils.ts',
      kind: 'utility',
      content: catalog.utility,
    })
  const artifacts: Artifact[] = []
  for (const draft of drafts.sort((a, b) =>
    a.logicalPath < b.logicalPath ? -1 : 1,
  )) {
    const content = await format(draft.content, {
      parser: draft.logicalPath.endsWith('.css') ? 'css' : 'typescript',
      plugins: [typescript, estree, postcss],
      endOfLine: 'lf',
      singleQuote: true,
      semi: false,
    })
    artifacts.push({ ...draft, content, sha256: await sha256(content) })
  }
  return {
    artifacts,
    dependencies: [...dependencies]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([name, version]) => ({ name, version })),
    preset,
    theme,
    provenance: {
      catalogRelease: input.catalogRelease,
      compilerVersion: input.compilerVersion,
    },
  }
}
