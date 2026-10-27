import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ButtonEditorPage from '../../apps/www/src/app/editor/component/button/page.js'
import PresetEditorPage from '../../apps/www/src/app/editor/preset/page.js'

describe('Button editor route', () => {
  it('renders the Button workbench heading and editor context in the main landmark', () => {
    const html = renderToStaticMarkup(createElement(ButtonEditorPage))

    expect(html).toMatch(/<main\b[^>]*>[\s\S]*Component editor[\s\S]*<h1\b[^>]*>Button workbench<\/h1>/)
  })
})

it('renders the global preset editor heading in the main landmark', () => {
  const html = renderToStaticMarkup(createElement(PresetEditorPage))
  expect(html).toMatch(/<main\b[^>]*>[\s\S]*<h1\b[^>]*>Global preset editor<\/h1>/)
  expect(html).toContain('Draft — automated token contrast only')
})
