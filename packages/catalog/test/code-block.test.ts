import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { highlightCode, type CodeLanguage } from '../src/templates/code-block.js'

const render = (code: string, language: CodeLanguage) => renderToStaticMarkup(createElement('pre', null, highlightCode(code, language)))
const text = (html: string) =>
  html.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')

const samples = {
  tsx: "import { RecipeButton } from '@/x'\nexport function Example() {\n  return <RecipeButton size=\"lg\" disabled={false}>{'Go'}</RecipeButton>\n}\n",
  css: '[data-slot="recipe-button"] { --radius: 0rem; border: 2px solid var(--border); }\n@media (prefers-reduced-motion: reduce) { a { transition: none } }',
  json: '{"id":"rc_primary-button","revision":2,"props":{"disabled":false}}',
  shell: 'npx @ombelle-ui/cli@0.4.0 add --recipe ./rc.json --cwd APP --yes',
} as const

const languages: CodeLanguage[] = ['tsx', 'css', 'json', 'shell', 'text']
const edgeCases = ['', '\n', 'a\r\nb\r\n', '\tconst x = 1', 'x'.repeat(400), "'open", '/* open']

describe('highlightCode', () => {
  it('keeps the exact text, newlines included, in every sample language', () => {
    for (const [language, code] of Object.entries(samples)) expect(text(render(code, language as keyof typeof samples))).toBe(code)
  })

  it('gives each line its own span and marks tokens by kind', () => {
    const html = render(samples.tsx, 'tsx')
    expect(html.match(/data-slot="code-block-line"/g)).toHaveLength(4)
    expect(html).toContain('<span data-token="keyword">import</span>')
    expect(html).toContain('<span data-token="tag">RecipeButton</span>')
    expect(html).toContain('<span data-token="attr">size</span>')
    expect(html).toContain('<span data-token="string">&#x27;@/x&#x27;</span>')
    const json = render(samples.json, 'json')
    expect(json).toContain('<span data-token="property">&quot;id&quot;</span>')
    expect(json).toContain('<span data-token="keyword">false</span>')
    expect(render(samples.shell, 'shell')).toContain('<span data-token="flag"> --recipe</span>')
  })

  it.each(languages)('preserves the text of every sample and edge case in %s', (language) => {
    for (const code of [...Object.values(samples), ...edgeCases]) expect(text(render(code, language)), JSON.stringify(code)).toBe(code)
  })

  it('renders one line for empty input and two for CRLF input', () => {
    expect(render('', 'tsx').match(/data-slot="code-block-line"/g)).toHaveLength(1)
    expect(render('a\r\nb', 'tsx').match(/data-slot="code-block-line"/g)).toHaveLength(2)
  })

  it('adds no token markers for plain text', () => {
    expect(render(samples.tsx, 'text')).not.toContain('data-token')
  })

  it('renders the same markup on every call', () => {
    for (const language of languages) expect(render(samples.tsx, language)).toBe(render(samples.tsx, language))
  })
})
