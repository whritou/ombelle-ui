import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalogPresets } from '@ombelle/catalog/presets'
import { canonicalize, compile } from '@ombelle/compiler'
import type {
  ComponentRecipe,
  InstallableRecipeSnapshot,
  PresetSnapshot,
} from '@ombelle/contracts'
import { createCatalogDraft } from '../editor/catalog-draft'
import { PublishedRecipe } from '../recipe-snapshots/components/published-recipe'
import { PublishedPreset } from './components/published-preset'
import { PresetExportPanel } from '../preset-editor/components/preset-export-panel'
import { createPresetDraft, setPresetEdit } from '../preset-editor/model'
import { publishedInstaller } from './install-command'

/** A catalog draft as older editors exported it, before recipes started with the style's fonts. */
function legacyDraft(component: Parameters<typeof createCatalogDraft>[0]): ReturnType<typeof createCatalogDraft> {
  const draft = createCatalogDraft(component)
  const { fonts: _fonts, ...appearance } = (draft.recipe.appearance ?? {}) as { fonts?: unknown }
  return { ...draft, recipe: { ...draft.recipe, appearance } } as ReturnType<typeof createCatalogDraft>
}

function recipeSnapshot(recipe: ComponentRecipe): InstallableRecipeSnapshot {
  return {
    snapshotVersion: '2.0',
    id: 'rc_' + 'a'.repeat(32),
    revision: 1,
    recipe,
    recipeHash: 'b'.repeat(64),
    preset: getCatalogPresets('0.1.0').presets.flat,
    presetHash: 'c'.repeat(64),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    createdAt: '2026-11-08T12:00:00.000Z',
    validationStatus: 'draft',
  }
}

// The code pages show a command for content the published installer accepts.
describe('published installer commands', () => {
  it('offers a new published recipe command alongside JSON export and editor navigation', () => {
    const recipe = legacyDraft('breadcrumb').recipe
    const html = renderToStaticMarkup(
      <PublishedRecipe
        snapshot={recipeSnapshot(recipe)}
        origin="https://presets.example.test"
        name="Breadcrumb" result={null}
      />,
    )
    expect(html).toContain('npx @ombelle-ui/cli@1.1.2 add --recipe')
    expect(html).toContain('Copy install command')
    expect(html).toContain('Download recipe JSON')
    expect(html).toContain('aria-label="Recipe JSON"')
    expect(html).toContain('href="/editor/component/breadcrumb"')
  })

  it('offers the install command for a published font recipe now that 0.8.0 is published', () => {
    const recipe = createCatalogDraft('input').recipe
    expect(recipe.appearance?.fonts).toBeDefined()
    const html = renderToStaticMarkup(
      <PublishedRecipe snapshot={recipeSnapshot(recipe)} origin="https://presets.example.test" name="Input" result={null} />,
    )
    expect(html).not.toContain('This recipe uses fonts and requires CLI 0.8.0')
    expect(html).toContain('npx @ombelle-ui/cli@1.1.2 add --recipe')
    expect(html).toContain('Download recipe JSON')
  })

  it('keeps a legacy published recipe command available', () => {
    const recipe = legacyDraft('input').recipe
    const html = renderToStaticMarkup(
      <PublishedRecipe
        snapshot={recipeSnapshot(recipe)}
        origin="https://presets.example.test"
        name="Input" result={null}
      />,
    )
    expect(html).toContain(`npx @ombelle-ui/cli@${publishedInstaller.version} add --recipe`)
    expect(html).toContain('Copy install command')
  })

  it('offers published semantic-palette preset commands and the JSON download', () => {
    const preset = structuredClone(getCatalogPresets('0.1.0').presets.flat)
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
        origin="https://presets.example.test" contrastWarning={false} frame={Promise.resolve({ kind: 'tokens' } as const)}
      />,
    )
    expect(html).toContain('npx @ombelle-ui/cli@1.1.2')
    expect(html).toContain('Download preset JSON')
    expect(html).toContain('id="snapshot-json"')
  })

  it('offers public install commands alongside local semantic-palette exports', async () => {
    const preset = structuredClone(getCatalogPresets('0.1.0').presets.flat)
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
    expect(html).toContain('1.1.2')
    expect(html).toContain(
      '<button type="button">Download preset JSON</button>',
    )
    expect(html).toContain('<button type="button">Copy export</button>')
    expect(html).toMatch(/&quot;info&quot;:&quot;#dbeafe&quot;/i)
  })

  const fonted = () => {
    const preset = structuredClone(getCatalogPresets('0.1.0').presets.ombelle)
    return {
      ...preset,
      schemaVersion: '1.1' as const,
      design: { ...preset.design, fontFamilyId: 'inter' as const, headingFontFamilyId: 'fraunces' as const },
    }
  }
  it('offers the install command for a published preset that uses font pairs now that 0.7.8 is published', () => {
    const snapshot: PresetSnapshot = {
      snapshotVersion: '1.0',
      id: 'ps_' + 'a'.repeat(32),
      revision: 1,
      preset: fonted(),
      presetHash: 'b'.repeat(64),
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      createdAt: '2026-11-14T12:00:00.000Z',
      validationStatus: 'draft',
    }
    const html = renderToStaticMarkup(
      <PublishedPreset snapshot={snapshot} origin="https://presets.example.test" contrastWarning={false} frame={Promise.resolve({ kind: 'tokens' } as const)} />,
    )
    expect(html).not.toContain('requires CLI 0.7.8')
    expect(html).toContain('npx @ombelle-ui/cli@1.1.2')
    expect(html).toContain('Download preset JSON')
  })

  it('offers the export panel command for a preset that uses font pairs now that 0.7.8 is published', async () => {
    const draft = setPresetEdit(createPresetDraft('ombelle'), '/design/headingFontFamilyId', 'fraunces')
    const result = await compile({
      preset: fonted(),
      componentIds: ['button'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    const html = renderToStaticMarkup(
      <PresetExportPanel
        draft={draft}
        state={{ status: 'compiled', stale: false, diagnostic: null, draftKey: canonicalize(draft), result }}
        announce={() => {}}
        contrastWarning={false}
      />,
    )
    expect(html).not.toContain('data-testid="preset-install-held"')
    expect(html).toContain('data-testid="preset-install-command"')
    expect(html).toContain('1.1.2')
  })
})
