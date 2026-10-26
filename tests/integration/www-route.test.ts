import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ButtonEditorPage from '../../apps/www/src/app/editor/component/button/page.js'

describe('Button editor route', () => {
  it('renders Button editor heading in the main landmark', () => {
    const html = renderToStaticMarkup(createElement(ButtonEditorPage))

    expect(html).toMatch(/<main\b[^>]*>[\s\S]*<h1\b[^>]*>Button editor<\/h1>/)
  })
})
