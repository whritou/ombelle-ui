'use client'

import { useState } from 'react'
import exampleRecipe from '../../../../../../../examples/recipe.example.json'
import { useCompiler } from '../../../../editor/use-compiler'
import { PreviewFrame } from '../../../../editor/components/preview-frame'
import type { EditorView } from '../../../../editor/model'

const defaultView: EditorView = { mode: 'light', viewport: 'wide', panel: 'preview', forcedState: 'none' }

export default function ButtonEditorPage() {
  const [recipe] = useState(() => exampleRecipe)
  const compilation = useCompiler(recipe)
  return (
    <main>
      <h1>Button editor</h1>
      <section aria-label="Editor workspace">
        <PreviewFrame result={compilation.status === 'compiled' ? compilation.result : null} view={defaultView} />
        <p>Button customization is coming soon.</p>
        <p role="status">
          {compilation.status === 'compiled'
            ? 'Recipe compiled.'
            : compilation.status === 'invalid'
              ? compilation.diagnostic?.message
              : 'Compiling recipe…'}
        </p>
      </section>
    </main>
  )
}
