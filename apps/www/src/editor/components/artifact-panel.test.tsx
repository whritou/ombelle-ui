import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileRecipe } from '@ombelle/compiler'
import { createEditorDraft } from '../model.js'
import { ArtifactPanel, artifactMeta } from './artifact-panel'

async function compiled() {
  return compileRecipe({ recipe: createEditorDraft('flat').recipe })
}

it('renders exactly the five output tabs in order', async () => {
  const result = await compiled()
  const html = renderToStaticMarkup(<ArtifactPanel result={result} recipeJson="{}" stale={false} onStatus={() => {}} />)
  const names = [...html.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((match) => match[1])
  expect(names).toEqual(['Usage', 'Component', 'CSS', 'Recipe', 'Install'])
  expect(html).not.toContain('generated output"')
  expect(html).not.toContain('Collapse')
  // Build details sit after the tabs and code, at the end of the panel.
  expect(html.indexOf('data-testid="artifact-meta"')).toBeGreaterThan(html.indexOf('role="tabpanel"'))
  expect(html).not.toContain('View code')
})

it('summarizes hash, release and dependencies on the metadata line', async () => {
  const result = await compiled()
  const bare = { ...result, dependencies: [] }
  const meta = artifactMeta(bare)
  expect(meta[0]).toBe(result.recipe.hash)
  expect(meta[1]).toBe(`Catalog ${result.provenance.catalogRelease} · Compiler ${result.provenance.compilerVersion}`)
  expect(meta.at(-1)).toBe('No additional dependencies')
  const withDeps = artifactMeta({ ...result, dependencies: [{ name: 'clsx', version: '2.1.1' }] })
  expect(withDeps.at(-1)).toBe('clsx@2.1.1')
})
