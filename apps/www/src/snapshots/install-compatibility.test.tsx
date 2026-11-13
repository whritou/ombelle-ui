import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog } from '@ombelle/catalog'
import { canonicalize, compile } from '@ombelle/compiler'
import type {
  ComponentRecipe,
  InstallableRecipeSnapshot,
  PresetSnapshot,
} from '@ombelle/contracts'
import { createCatalogDraft } from '../editor/catalog-draft'
import { installText } from '../editor/components/artifact-panel'
import { PublishedRecipe } from '../recipe-snapshots/components/published-recipe'
import { PublishedPreset } from './components/published-preset'
import { PresetExportPanel } from '../preset-editor/components/preset-export-panel'
import { createPresetDraft } from '../preset-editor/model'
import * as compatibility from './install-command'

const current = { version: '0.7.1' }
const next = { version: '0.7.2' }
const newComponents = [
  'input-group',
  'sheet',
  'alert-dialog',
  'breadcrumb',
  'pagination',
  'toast',
] as const
const addedProps = [
  ['badge', 'size', 'default'],
  ['badge', 'dot', false],
  ['card', 'appearance', 'default'],
  ['table', 'density', 'default'],
  ['table', 'striped', false],
  ['tabs', 'appearance', 'contained'],
] as const

function recipeSnapshot(recipe: ComponentRecipe): InstallableRecipeSnapshot {
  return {
    snapshotVersion: '2.0',
    id: 'rc_' + 'a'.repeat(32),
    revision: 1,
    recipe,
    recipeHash: 'b'.repeat(64),
    preset: getCatalog('0.1.0').presets.flat,
    presetHash: 'c'.repeat(64),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-11-08T12:00:00.000Z',
    validationStatus: 'draft',
  }
}

describe('published installer compatibility', () => {
  it.each(newComponents)('holds %s recipes until CLI 0.7.2', (component) => {
    const recipe = createCatalogDraft(component).recipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, current)).toBe(
      true,
    )
    expect(compatibility.componentRecipeInstallBlocked(recipe, next)).toBe(
      false,
    )
    expect(
      compatibility.installableRecipeInstallNotice(recipe, current),
    ).toContain('0.7.2')
    expect(
      compatibility.installableRecipeInstallNotice(recipe, next),
    ).toBeUndefined()
    expect(installText(recipe, current)).not.toContain('add --recipe')
    expect(installText(recipe, current)).toContain('0.7.2')
    expect(installText(recipe, next)).toContain('add --recipe')
  })

  it.each(addedProps)(
    'holds %s.%s even when the added value is a default or false',
    (component, key, value) => {
      const original = createCatalogDraft(component).recipe
      const props = { ...original.props } as Record<string, unknown>
      // Older immutable recipes omit all newly introduced fields.
      for (const [candidate, field] of addedProps)
        if (candidate === component) delete props[field]
      const legacy = { ...original, props } as ComponentRecipe
      const expanded = {
        ...legacy,
        props: { ...props, [key]: value },
      } as ComponentRecipe
      expect(compatibility.componentRecipeInstallBlocked(legacy, current)).toBe(
        false,
      )
      expect(
        compatibility.componentRecipeInstallBlocked(expanded, current),
      ).toBe(true)
      expect(compatibility.componentRecipeInstallBlocked(expanded, next)).toBe(
        false,
      )
      expect(installText(expanded, current)).not.toContain('add --recipe')
    },
  )

  it.each(['success', 'warning', 'info'] as const)(
    'holds Alert %s while preserving default and destructive support',
    (variant) => {
      const alert = createCatalogDraft('alert').recipe
      const expanded = {
        ...alert,
        props: { ...alert.props, variant },
      } as ComponentRecipe
      expect(
        compatibility.componentRecipeInstallBlocked(expanded, current),
      ).toBe(true)
      expect(compatibility.componentRecipeInstallBlocked(expanded, next)).toBe(
        false,
      )
      for (const legacyVariant of ['default', 'destructive'])
        expect(
          compatibility.componentRecipeInstallBlocked(
            {
              ...alert,
              props: { ...alert.props, variant: legacyVariant },
            } as ComponentRecipe,
            current,
          ),
        ).toBe(false)
    },
  )

  it('keeps original catalog recipe support gated at 0.6.0', () => {
    const recipe = createCatalogDraft('input').recipe
    expect(
      compatibility.componentRecipeInstallBlocked(recipe, { version: '0.5.0' }),
    ).toBe(true)
    expect(
      compatibility.componentRecipeInstallBlocked(recipe, { version: '0.6.0' }),
    ).toBe(false)
  })

  it.each([
    'success',
    'successForeground',
    'warning',
    'warningForeground',
    'info',
    'infoForeground',
  ])('holds optional semantic palette field %s in either mode', (field) => {
    for (const mode of ['light', 'dark']) {
      const preset = { modes: { [mode]: { [field]: '#14532D' } } }
      expect(compatibility.semanticPaletteInstallBlocked(preset, current)).toBe(
        true,
      )
      expect(compatibility.semanticPaletteInstallBlocked(preset, next)).toBe(
        false,
      )
    }
    expect(
      compatibility.semanticPaletteInstallBlocked(
        { modes: { light: { foreground: '#111111' } } },
        current,
      ),
    ).toBe(false)
  })

  it('offers a new published recipe command alongside JSON export and editor navigation', () => {
    const recipe = createCatalogDraft('breadcrumb').recipe
    const html = renderToStaticMarkup(
      <PublishedRecipe
        snapshot={recipeSnapshot(recipe)}
        origin="https://presets.example.test"
        name="Breadcrumb"
      />,
    )
    expect(html).toContain('npx @ombelle-ui/cli@0.7.5 add --recipe')
    expect(html).toContain('Copy install command')
    expect(html).toContain('Download recipe JSON')
    expect(html).toContain('aria-label="Recipe JSON"')
    expect(html).toContain('href="/editor/component/breadcrumb"')
  })

  it('keeps a legacy published recipe command available', () => {
    const recipe = createCatalogDraft('input').recipe
    const html = renderToStaticMarkup(
      <PublishedRecipe
        snapshot={recipeSnapshot(recipe)}
        origin="https://presets.example.test"
        name="Input"
      />,
    )
    expect(html).toContain(`npx @ombelle-ui/cli@${compatibility.publishedInstaller.version} add --recipe`)
    expect(html).toContain('Copy install command')
  })

  it('offers published semantic-palette preset commands and the JSON download', () => {
    const preset = structuredClone(getCatalog('0.1.0').presets.flat)
    preset.modes.dark.success = '#DCFCE7'
    preset.modes.dark.successForeground = '#14532D'
    const snapshot: PresetSnapshot = {
      snapshotVersion: '1.0',
      id: 'ps_' + 'a'.repeat(32),
      revision: 1,
      preset,
      presetHash: 'b'.repeat(64),
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      createdAt: '2026-11-08T12:00:00.000Z',
      validationStatus: 'draft',
    }
    const html = renderToStaticMarkup(
      <PublishedPreset
        snapshot={snapshot}
        origin="https://presets.example.test"
      />,
    )
    expect(html).toContain('npx @ombelle-ui/cli@0.7.5')
    expect(html).toContain('Download preset JSON')
    expect(html).toContain('id="snapshot-json"')
  })

  it('offers public install commands alongside local semantic-palette exports', async () => {
    const preset = structuredClone(getCatalog('0.1.0').presets.flat)
    preset.modes.light.info = '#DBEAFE'
    preset.modes.light.infoForeground = '#1E3A8A'
    const draft = createPresetDraft('flat')
    const result = await compile({
      preset,
      componentIds: ['button'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    const html = renderToStaticMarkup(
      <PresetExportPanel
        draft={draft}
        state={{
          status: 'compiled',
          stale: false,
          diagnostic: null,
          draftKey: canonicalize(draft),
          result,
        }}
        announce={() => {}}
        contrastWarning={false}
      />,
    )
    expect(html).toContain('data-testid="preset-install-command"')
    expect(html).not.toContain('data-testid="preset-install-held"')
    expect(html).toContain('0.7.5')
    expect(html).toContain(
      '<button type="button">Download preset JSON</button>',
    )
    expect(html).toContain('<button type="button">Copy export</button>')
    expect(html).toMatch(/&quot;info&quot;:&quot;#dbeafe&quot;/i)
  })
})

describe('0.7.3 variant recipes', () => {
  const v072 = { version: '0.7.2' }
  const v073 = { version: '0.7.3' }
  it.each([
    ['badge', { appearance: 'soft' }],
    ['badge', { variant: 'warning' }],
    ['alert', { dismissible: false }],
    ['alert', { layout: 'compact' }],
    ['card', { mode: 'static' }],
    ['avatar', { shape: 'square' }],
    ['avatar', { overflow: 0 }],
    ['accordion', { icon: 'family' }],
    ['accordion', { appearance: 'bordered' }],
  ] as const)('gates a %s recipe using %o at CLI 0.7.3', (component, props) => {
    const recipe = { component, props } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v072)).toBe(true)
    expect(compatibility.componentRecipeInstallBlocked(recipe, v073)).toBe(false)
  })

  it('leaves a plain badge recipe installable at 0.7.2', () => {
    const recipe = { component: 'badge', props: { variant: 'default' } } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v072)).toBe(false)
  })

  it('gates a link-destructive Button recipe at CLI 0.7.3', () => {
    const recipe = { props: { variant: 'link-destructive' } }
    expect(compatibility.buttonRecipeInstallBlocked(recipe, v072)).toBe(true)
    expect(compatibility.buttonRecipeInstallBlocked(recipe, v073)).toBe(false)
    expect(compatibility.buttonRecipeInstallBlocked({ props: { variant: 'link' } }, v072)).toBe(false)
  })
})


describe('0.7.3 variant recipes, batches 6b and 6c', () => {
  const v072 = { version: '0.7.2' }
  const v073 = { version: '0.7.3' }
  it.each([
    ['tabs', { appearance: 'pills' }], ['tabs', { counts: false }],
    ['table', { stickyHeader: true }], ['table', { sortable: false }], ['table', { actions: true }], ['table', { loading: true }],
    ['input', { size: 'sm' }], ['textarea', { size: 'default' }],
    ['input-group', { clearable: true }], ['input-group', { counter: true }],
    ['pagination', { layout: 'compact' }], ['pagination', { pageSize: true }],
    ['select', { multiple: true }], ['select', { icons: true }],
    ['toast', { mode: 'default' }], ['sheet', { handle: true }], ['sheet', { resizable: true }],
  ] as const)('gates a %s recipe using %o at CLI 0.7.3', (component, props) => {
    const recipe = { component, props } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v072)).toBe(true)
    expect(compatibility.componentRecipeInstallBlocked(recipe, v073)).toBe(false)
  })

  it('leaves underline Tabs installable at 0.7.2', () => {
    const recipe = { component: 'tabs', props: { appearance: 'underline' } } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v072)).toBe(false)
  })
})

describe('0.7.5 variant recipes, batch 4a', () => {
  const v074 = { version: '0.7.4' }
  const v075 = { version: '0.7.5' }
  it.each([
    ['checkbox', { option: 'row' }, {}], ['checkbox', {}, { description: 'x' }],
    ['switch', { size: 'default' }, {}],
    ['progress', { tone: 'success' }, {}], ['progress', { size: 'sm' }, {}],
    ['progress', { showLabel: false }, {}], ['progress', { showValue: true }, {}],
    ['popover', { arrow: false }, {}],
  ] as const)('gates a %s recipe using %o %o at CLI 0.7.5', (component, props, content) => {
    const recipe = { component, props, content } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v074)).toBe(true)
    expect(compatibility.componentRecipeInstallBlocked(recipe, v075)).toBe(false)
    expect(compatibility.installableRecipeInstallNotice({ ...recipe, schemaVersion: '2.0' } as never, v074)).toBe(compatibility.catalog075InstallNotice)
  })

  it.each(['checkbox', 'switch', 'progress', 'popover'])('leaves a %s recipe without new fields installable at 0.7.4', component => {
    const recipe = { component, props: {}, content: { label: 'Accept terms' } } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v074)).toBe(false)
  })
})

describe('0.7.5 variant recipes, batch 4b', () => {
  const v074 = { version: '0.7.4' }
  const v075 = { version: '0.7.5' }
  it.each([
    ['dialog', { size: 'default' }, {}], ['dialog', { footer: true }, {}], ['dialog', { scrollingBody: false }, {}],
    ['alert-dialog', { media: 'none' }, {}], ['alert-dialog', {}, { confirmText: '' }],
    ['breadcrumb', { collapse: 'none' }, {}],
  ] as const)('gates a %s recipe using %o %o at CLI 0.7.5', (component, props, content) => {
    const recipe = { component, props, content } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v075)).toBe(false)
    // Alert Dialog and Breadcrumb already need 0.7.2; any new field needs 0.7.5.
    expect(compatibility.componentRecipeInstallBlocked(recipe, v074)).toBe(true)
    expect(compatibility.installableRecipeInstallNotice({ ...recipe, schemaVersion: '2.0' } as never, v074)).toBe(compatibility.catalog075InstallNotice)
  })

  it.each(['dialog', 'alert-dialog', 'breadcrumb'])('leaves a %s recipe without new fields installable at 0.7.4', component => {
    const recipe = { component, props: {}, content: { trigger: 'Open' } } as unknown as ComponentRecipe
    expect(compatibility.componentRecipeInstallBlocked(recipe, v074)).toBe(false)
  })
})
