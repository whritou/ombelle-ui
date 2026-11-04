import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { highlightCode } from './code-highlight'

const text = (html: string) =>
  html.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')

const samples = {
  tsx: "import { RecipeButton } from '@/x'\nexport function Example() {\n  return <RecipeButton size=\"lg\" disabled={false}>{'Go'}</RecipeButton>\n}\n",
  css: '[data-slot="recipe-button"] { --radius: 0rem; border: 2px solid var(--border); }\n@media (prefers-reduced-motion: reduce) { a { transition: none } }',
  json: '{"id":"rc_primary-button","revision":2,"props":{"disabled":false}}',
  shell: 'npx @ombelle-ui/cli@0.4.0 add --recipe ./rc.json --cwd APP --yes',
} as const

it('keeps the exact text, newlines included, in every language', () => {
  for (const [language, code] of Object.entries(samples))
    expect(text(renderToStaticMarkup(<pre>{highlightCode(code, language as keyof typeof samples)}</pre>))).toBe(code)
})

it('gives each line its own span and colours tokens by kind', () => {
  const html = renderToStaticMarkup(<pre>{highlightCode(samples.tsx, 'tsx')}</pre>)
  expect(html.match(/class="codeLine"/g)).toHaveLength(4)
  expect(html).toContain('<span class="tok-keyword">import</span>')
  expect(html).toContain('<span class="tok-tag">RecipeButton</span>')
  expect(html).toContain('<span class="tok-attr">size</span>')
  expect(html).toContain('<span class="tok-string">&#x27;@/x&#x27;</span>')
  const json = renderToStaticMarkup(<pre>{highlightCode(samples.json, 'json')}</pre>)
  expect(json).toContain('<span class="tok-property">&quot;id&quot;</span>')
  expect(json).toContain('<span class="tok-keyword">false</span>')
  const shell = renderToStaticMarkup(<pre>{highlightCode(samples.shell, 'shell')}</pre>)
  expect(shell).toContain('<span class="tok-flag"> --recipe</span>')
})
