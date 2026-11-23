import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileRecipe } from '@ombelle/compiler'
import { changeDraftFamily, createEditorDraft, accessibilityNotice } from '../model'
import { ArtifactPanel } from './artifact-panel'
import { FamilyPicker } from './family-picker'

const noop = () => {}

it('offers liquid glass and shows the accessibility caveat beside the export', async () => {
  const draft = changeDraftFamily(createEditorDraft('flat'), 'liquid-glass')
  const picker = renderToStaticMarkup(<FamilyPicker value="liquid-glass" onChange={noop} />)
  expect(/<button[^>]*data-family="liquid-glass"[^>]*>/.exec(picker)![0]).toContain('aria-checked="true"')
  expect(picker).toContain('Accessibility not guaranteed')
  const result = await compileRecipe({ recipe: draft.recipe })
  const notice = accessibilityNotice('liquid-glass')
  const panel = renderToStaticMarkup(
    <ArtifactPanel result={result} recipeJson="{}" stale={false} onStatus={noop} notice={notice} />,
  )
  expect(panel).toContain(
    '>Accessibility not guaranteed: liquid glass text contrast depends on the background behind it.',
  )
  const flat = renderToStaticMarkup(
    <ArtifactPanel result={result} recipeJson="{}" stale={false} onStatus={noop} notice={accessibilityNotice('flat')} />,
  )
  expect(flat).not.toContain('Accessibility not guaranteed')
})
