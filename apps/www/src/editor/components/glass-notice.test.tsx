import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileRecipe } from '@ombelle/compiler'
import { changeDraftFamily, createEditorDraft, experimentalNotice } from '../model'
import { ArtifactPanel } from './artifact-panel'
import { PropertiesPanel } from './properties-panel'

const noop = () => {}

it('offers liquid glass and shows the experimental notice beside the export', async () => {
  const draft = changeDraftFamily(createEditorDraft('flat'), 'liquid-glass')
  const properties = renderToStaticMarkup(
    <PropertiesPanel recipe={draft.recipe} diagnostic={null} onChange={noop} onFamily={noop} onDiagnostic={noop} />,
  )
  expect(properties).toContain('<option value="liquid-glass" selected="">Liquid glass (Experimental)</option>')
  const result = await compileRecipe({ recipe: draft.recipe })
  const notice = experimentalNotice('liquid-glass')
  const panel = renderToStaticMarkup(
    <ArtifactPanel result={result} recipeJson="{}" stale={false} onStatus={noop} notice={notice} />,
  )
  expect(panel).toContain(
    '>liquid-glass is experimental for button; see docs/components/liquid-glass.md for limitations</p>',
  )
  const flat = renderToStaticMarkup(
    <ArtifactPanel result={result} recipeJson="{}" stale={false} onStatus={noop} notice={experimentalNotice('flat')} />,
  )
  expect(flat).not.toContain('experimental')
})
