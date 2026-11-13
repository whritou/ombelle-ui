import { createElement, createElement as h } from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { styleSupport } from '@ombelle/contracts'
import { highlightCode, type CodeLanguage } from '../src/templates/code-block.js'
import * as radix from '../src/templates/code-block.js'
import * as base from '../src/templates/base/code-block.js'
import { getCatalog, getTemplate } from '../src/index.js'
import { expectComponentContract } from './new-component-contract.js'

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

  it('server-renders CRLF source with one line break per line and no lone carriage return', () => {
    // An HTML parser turns a lone \r into a line break, so "a\r<!-- -->\n" would show a blank line.
    const parsed = (html: string) => html.replace(/\r\n?/g, '\n').replace(/<[^>]+>/g, '')
    for (const language of languages) {
      for (const code of ['a\r\nb\r\n', '// one\r\n// two\r\nx', '/* a */\r\n{ b: 1 }\r\n', '# a\r\nnpx b --c\r\n']) {
        const html = renderToString(createElement('pre', null, highlightCode(code, language)))
        expect(html, `${language} ${JSON.stringify(code)}`).not.toMatch(/\r(?!\n)/)
        expect(parsed(html), `${language} ${JSON.stringify(code)}`).toBe(code.replace(/\r\n/g, '\n'))
      }
    }
  })

  it('adds no token markers for plain text', () => {
    expect(render(samples.tsx, 'text')).not.toContain('data-token')
  })

  it('renders the same markup on every call', () => {
    for (const language of languages) expect(render(samples.tsx, language)).toBe(render(samples.tsx, language))
  })
})

const slots = ['code-block', 'code-block-header', 'code-block-title', 'code-block-copy', 'code-block-status', 'code-block-code', 'code-block-line',
  'code-block-tabs', 'code-block-tab', 'code-block-command', 'code-block-diff-marker', 'code-block-diff-count']
const parts = ['CodeBlock', 'CodeBlockRoot', 'CodeBlockHeader', 'CodeBlockTitle', 'CodeBlockCopy', 'CodeBlockCode', 'CodeBlockCommand'] as const
const editions = [['radix', radix], ['base', base]] as const
const block = (file: string, name: string) => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const start = source.indexOf(`// ${name}:start`), end = source.indexOf(`// ${name}:end`)
  expect(start, `${file} ${name}`).toBeGreaterThan(-1)
  expect(end, `${file} ${name}`).toBeGreaterThan(start)
  return source.slice(start, end)
}
const args = '@ombelle-ui/cli add button'
const tabs = (html: string) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([^<]*)<\/button>/g)].map((match) => match[1])
const selectedTab = (html: string) => html.match(/<button(?=[^>]*role="tab")(?=[^>]*aria-selected="true")[^>]*>([^<]*)<\/button>/)?.[1]
const panelText = (html: string) =>
  [...html.matchAll(/<pre[^>]*data-slot="code-block-command"[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((match) => match[1]!.replace(/<[^>]*>/g, ''))

describe('Code Block', () => {
  it('provides the Code Block parts and Code Block Command, on Radix Tabs and on Base UI', () => {
    for (const edition of ['radix', 'base'] as const) {
      const template = getTemplate(getCatalog('0.1.0'), 'code-block', edition)
      expect(template.logicalPath).toBe('components/ui/code-block.tsx')
      expect(template.slots).toEqual(slots)
      expect(template.content).toMatch(/^['"]use client['"]/)
      expect(template.content).toContain("import './code-block.css'")
      expect(template.content).toContain("from './utils.js'")
      for (const part of parts) expect(template.content, `${edition} ${part}`).toContain(`export function ${part}(`)
      for (const slot of slots) expect(template.content, `${edition} ${slot}`).toContain(`data-slot="${slot}"`)
      // highlightCode, packageCommand and commandRunners are plain exports, not parts.
      expect(template.content).toMatch(/export \{[^}]*\bhighlightCode\b[^}]*\}/)
      expect(template.content).toContain('export function packageCommand(')
      expect(template.content).toContain('export const commandRunners')
    }
    expect(getTemplate(getCatalog('0.1.0'), 'code-block').dependencies).toEqual([{ name: 'react', version: '19.3.1' },
      { name: '@radix-ui/react-tabs', version: '1.2.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }])
    expect(getTemplate(getCatalog('0.1.0'), 'code-block', 'base').dependencies.map((d) => d.name).sort())
      .toEqual(['@base-ui/react', 'clsx', 'react', 'tailwind-merge'])
    expect(styleSupport('code-block', 'liquid-glass')).toBe('experimental')
    for (const [, ui] of editions) {
      for (const part of parts) expect(typeof ui[part], part).toBe('function')
      expect(typeof ui.highlightCode).toBe('function')
      expect(ui.commandRunners).toEqual({ pnpm: 'pnpm dlx', npm: 'npx', yarn: 'yarn dlx', bun: 'bunx' })
    }
  })

  it('meets the shared component contract with its stylesheets', () => {
    expectComponentContract('code-block', { client: true, parts, slots,
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: '@radix-ui/react-tabs', version: '1.2.1' },
        { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }],
      selectors: ["[data-slot='code-block']", "[data-slot='code-block-code']", "[data-slot='code-block-tab']", "[data-slot='code-block-copy']"],
      glass: 'experimental' })
  })

  it('keeps the highlighter and the shared parts identical in both editions', () => {
    for (const name of ['highlight', 'code-block-parts'])
      expect(block('../src/templates/base/code-block.tsx', name)).toBe(block('../src/templates/code-block.tsx', name))
  })

  it.each(editions)('%s renders a titled file block with Copy, a focusable named region pre, lines and a polite status', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CodeBlock, { code: 'a\nb', title: 'button.tsx' }))
    expect(html).toMatch(/^<div[^>]*data-slot="code-block"/)
    expect(html).toMatch(/<span[^>]*data-slot="code-block-title"[^>]*>button.tsx<\/span>/)
    expect(html).toMatch(/<button(?=[^>]*type="button")(?=[^>]*aria-label="Copy button.tsx")[^>]*>Copy<\/button>/)
    expect(html).toMatch(/<pre(?=[^>]*tabindex="0")(?=[^>]*role="region")(?=[^>]*aria-label="button.tsx source")(?=[^>]*max-height:32rem)[^>]*data-slot="code-block-code"/)
    expect(html.match(/data-slot="code-block-line"/g)).toHaveLength(2)
    expect(html).toMatch(/<span(?=[^>]*data-slot="code-block-status")(?=[^>]*aria-live="polite")[^>]*><\/span>/)
    expect(html).not.toContain('data-line-numbers')
  })

  it.each(editions)('%s names an untitled block "Code", hides line numbers on request and renders given children', (_, ui) => {
    const plain = renderToStaticMarkup(h(ui.CodeBlock, { code: 'a' }))
    expect(plain).toContain('aria-label="Copy code"')
    expect(plain).toMatch(/<pre(?=[^>]*role="region")[^>]*aria-label="Code"/)
    expect(plain).not.toContain('data-slot="code-block-title"')
    expect(renderToStaticMarkup(h(ui.CodeBlock, { code: 'a', lineNumbers: false }))).toMatch(/<pre[^>]*data-line-numbers="false"/)
    const custom = renderToStaticMarkup(h(ui.CodeBlock, { code: 'x', children: h('b', null, 'x') }))
    expect(custom).toContain('<code><b>x</b></code>')
    expect(custom).not.toContain('data-slot="code-block-line"')
    expect(renderToStaticMarkup(h(ui.CodeBlock, { code: 'a', copyLabel: 'Copy snippet', maxHeight: '10rem' })))
      .toMatch(/aria-label="Copy snippet"[\s\S]*max-height:10rem/)
  })

  it.each(editions)('%s sizes the line-number gutter from the line count', (_, ui) => {
    const gutter = (code: string) => renderToStaticMarkup(h(ui.CodeBlockCode, { code })).match(/--code-block-gutter:(\d+)ch/)?.[1]
    expect(gutter('a')).toBe('1')
    expect(gutter('x\n'.repeat(99))).toBe('2')
    expect(gutter('x\n'.repeat(100))).toBe('3')
    expect(gutter(`${'x\r\n'.repeat(1000)}y`)).toBe('4')
  })

  it.each(editions)('%s lets a labelled region pre drop its own name', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CodeBlockCode, { code: 'a', 'aria-labelledby': 'file-title' }))
    expect(html).toMatch(/<pre(?=[^>]*role="region")(?=[^>]*aria-labelledby="file-title")/)
    expect(html).not.toContain('aria-label=')
  })

  it.each(editions)('%s renders a command block with package-manager tabs, pnpm first', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CodeBlockCommand, { args }))
    expect(html).toMatch(/^<div(?=[^>]*data-slot="code-block")(?=[^>]*data-code-block-mode="command")/)
    expect(html).toMatch(/<div(?=[^>]*role="tablist")(?=[^>]*aria-label="Package manager")(?=[^>]*data-slot="code-block-tabs")/)
    expect(tabs(html)).toEqual(['pnpm', 'npm', 'yarn', 'bun'])
    expect(html.match(/data-slot="code-block-tab"/g)).toHaveLength(4)
    expect(selectedTab(html)).toBe('pnpm')
    expect(html).toMatch(/<button(?=[^>]*role="tab")(?=[^>]*aria-selected="true")(?=[^>]*data-state="active")/)
    expect(panelText(html)).toEqual([`pnpm dlx ${args}`])
    // The board colours the runner as a keyword.
    expect(html).toContain(`<code><span data-token="keyword">pnpm dlx</span> ${args}</code>`)
    expect(html).toContain('role="tabpanel"')
    expect(html).toMatch(/<button(?=[^>]*aria-label="Copy command")[^>]*>Copy<\/button>/)
    expect(html).toContain('data-slot="code-block-status"')
  })

  it.each(editions)('%s selects a default manager, falls back to the first listed one and takes custom runners', (_, ui) => {
    expect(panelText(renderToStaticMarkup(h(ui.CodeBlockCommand, { args, defaultManager: 'bun' })))).toEqual([`bunx ${args}`])
    const subset = renderToStaticMarkup(h(ui.CodeBlockCommand, { args, managers: ['npm', 'bun'], defaultManager: 'pnpm' }))
    expect(tabs(subset)).toEqual(['npm', 'bun'])
    expect(selectedTab(subset)).toBe('npm')
    expect(panelText(subset)).toEqual([`npx ${args}`])
    const runners = { yarn: 'yarn dlx --quiet' }
    const custom = renderToStaticMarkup(h(ui.CodeBlockCommand, { args, defaultManager: 'yarn', runners }))
    expect(panelText(custom)).toEqual([`yarn dlx --quiet ${args}`])
    expect(custom).toContain(`<code><span data-token="keyword">yarn dlx --quiet</span> ${args}</code>`)
    const controlled = renderToStaticMarkup(h(ui.CodeBlockCommand, { args, manager: 'bun', onManagerChange: () => {}, label: 'Runner', copyLabel: 'Copy install' }))
    expect(selectedTab(controlled)).toBe('bun')
    expect(controlled).toContain('aria-label="Runner"')
    expect(controlled).toContain('aria-label="Copy install"')
  })

  it.each(editions)('%s builds the command for every package manager', (_, ui) => {
    expect(ui.packageCommand('pnpm', 'x add y')).toBe('pnpm dlx x add y')
    expect(ui.packageCommand('npm', 'x add y')).toBe('npx x add y')
    expect(ui.packageCommand('yarn', 'x add y')).toBe('yarn dlx x add y')
    expect(ui.packageCommand('bun', 'x add y')).toBe('bunx x add y')
    expect(ui.packageCommand('npm', 'x', { npm: 'npm exec --' })).toBe('npm exec -- x')
  })
})
const diffText = ':root {\n-  --radius: 0.5rem;\n+  --radius: 0.75rem;\n+  --shadow-offset: 3px;\n}\n'
// The HTML of a titled css block at the Task 1 commit (db22321b); the same in both editions.
const beforeDiff = "<div data-slot=\"code-block\" class=\"\"><div data-slot=\"code-block-header\" class=\"\"><span data-slot=\"code-block-title\" class=\"\">ui-style.css</span><button type=\"button\" data-slot=\"code-block-copy\" aria-label=\"Copy ui-style.css\" class=\"\">Copy</button><span role=\"status\" aria-live=\"polite\" data-slot=\"code-block-status\" style=\"position:absolute;inline-size:1px;block-size:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0\"></span></div><pre tabindex=\"0\" role=\"region\" data-slot=\"code-block-code\" aria-label=\"ui-style.css source\" style=\"max-height:32rem;--code-block-gutter:1ch\" class=\"\"><code><span data-slot=\"code-block-line\"><span data-token=\"punct\">:</span>root <span data-token=\"punct\">{</span>\n</span><span data-slot=\"code-block-line\">  <span data-token=\"property\">--radius</span><span data-token=\"punct\">:</span> <span data-token=\"number\">0.5rem</span><span data-token=\"punct\">;</span>\n</span><span data-slot=\"code-block-line\"><span data-token=\"punct\">}</span>\n</span></code></pre></div>"

describe('Code Block diff helpers', () => {
  it('splits the board text into unchanged, removed, added, added, unchanged', () => {
    expect(radix.diffLines(diffText)).toEqual([
      { kind: 'unchanged', text: ':root {' },
      { kind: 'removed', text: '  --radius: 0.5rem;' },
      { kind: 'added', text: '  --radius: 0.75rem;' },
      { kind: 'added', text: '  --shadow-offset: 3px;' },
      { kind: 'unchanged', text: '}' },
    ])
    expect(radix.diffCounts(diffText)).toEqual({ added: 2, removed: 1 })
    expect(base.diffLines(diffText)).toEqual(radix.diffLines(diffText))
  })

  it('builds the new version from added and unchanged lines, keeping the final newline', () => {
    expect(radix.diffNewVersion(diffText)).toBe(':root {\n  --radius: 0.75rem;\n  --shadow-offset: 3px;\n}\n')
    expect(radix.diffNewVersion(diffText.slice(0, -1))).toBe(':root {\n  --radius: 0.75rem;\n  --shadow-offset: 3px;\n}')
    expect(base.diffNewVersion(diffText)).toBe(radix.diffNewVersion(diffText))
  })

  it('keeps CRLF in the copy and out of the markers', () => {
    const crlf = diffText.replace(/\n/g, '\r\n')
    expect(radix.diffNewVersion(crlf)).toBe(':root {\r\n  --radius: 0.75rem;\r\n  --shadow-offset: 3px;\r\n}\r\n')
    expect(radix.diffLines(crlf)[1]).toEqual({ kind: 'removed', text: '  --radius: 0.5rem;\r' })
    expect(radix.diffLines(crlf)[4]).toEqual({ kind: 'unchanged', text: '}\r' })
    const html = renderToStaticMarkup(h(radix.CodeBlockCode, { code: crlf, language: 'css', diff: true }))
    expect(html).not.toMatch(/\r(?!\n)/)
    expect(html).not.toMatch(/data-slot="code-block-diff-marker"[^>]*>[^<]*\r/)
  })

  it('treats a custom property at column 0 as a removed line (the first character is the marker)', () => {
    expect(radix.diffLines('--radius: 4px\n')[0]).toEqual({ kind: 'removed', text: '-radius: 4px' })
    expect(radix.diffNewVersion('a\n--radius: 4px\nb')).toBe('a\nb')
    expect(radix.diffLines(' --radius: 4px')[0]).toEqual({ kind: 'unchanged', text: ' --radius: 4px' })
    expect(radix.diffNewVersion(' --radius: 4px')).toBe(' --radius: 4px')
  })

  it('handles empty input and a lone marker', () => {
    expect(radix.diffLines('')).toEqual([{ kind: 'unchanged', text: '' }])
    expect(radix.diffNewVersion('')).toBe('')
    expect(radix.diffLines('+')).toEqual([{ kind: 'added', text: '' }])
    expect(radix.diffNewVersion('-a\n')).toBe('')
    expect(radix.diffCounts('plain')).toEqual({ added: 0, removed: 0 })
  })
})

describe.each(editions)('%s Code Block diff', (_, ui) => {
  const html = renderToStaticMarkup(h(ui.CodeBlock, { code: diffText, title: 'ui-style.css', language: 'css', diff: true }))

  it('marks the pre and each changed line, with an aria-hidden marker and a hidden prefix', () => {
    expect(html).toMatch(/<pre(?=[^>]*data-diff="")[^>]*data-slot="code-block-code"/)
    const lines = html.match(/<span data-slot="code-block-line"[^>]*>/g)!
    expect(lines).toHaveLength(5)
    expect(lines.map((line) => line.match(/data-diff="(\w+)"/)?.[1])).toEqual([undefined, 'removed', 'added', 'added', undefined])
    expect(html).toContain('<span data-slot="code-block-diff-marker" aria-hidden="true">−</span>')
    expect(html).toContain('<span data-slot="code-block-diff-marker" aria-hidden="true">+</span>')
    expect(html).toContain('<span data-slot="code-block-diff-marker" aria-hidden="true"> </span>')
    expect(html).toMatch(/data-diff="removed"[^>]*><span data-slot="code-block-diff-marker"[^>]*>−<\/span><span[^>]*>Removed: <\/span>/)
    expect(html).toMatch(/data-diff="added"[^>]*><span data-slot="code-block-diff-marker"[^>]*>\+<\/span><span[^>]*>Added: <\/span>/)
    expect(html.match(/Removed: /g)).toHaveLength(1)
    expect(html.match(/Added: /g)).toHaveLength(2)
  })

  it('shows +2 -1 in the header, with a spoken count, and names Copy for the new version', () => {
    expect(html).toMatch(/data-slot="code-block-title"[^>]*>ui-style\.css<\/span><span[^>]*data-slot="code-block-diff-count"[^>]*><span aria-hidden="true">\+2 −1<\/span><span[^>]*>2 added, 1 removed<\/span><\/span>/)
    expect(html).toContain('aria-label="Copy the new ui-style.css"')
  })

  it('names an untitled diff block "Copy the new code" and honours copyLabel', () => {
    expect(renderToStaticMarkup(h(ui.CodeBlock, { code: diffText, diff: true }))).toContain('aria-label="Copy the new code"')
    expect(renderToStaticMarkup(h(ui.CodeBlock, { code: diffText, diff: true, copyLabel: 'Copy patch' }))).toContain('aria-label="Copy patch"')
  })

  it('sets nothing with children, and renders as at the Task 1 commit without diff', () => {
    const custom = renderToStaticMarkup(h(ui.CodeBlock, { code: diffText, diff: true, children: h('b', null, 'x') }))
    expect(custom).not.toContain('data-diff')
    expect(custom).not.toContain('diff-')
    expect(custom).toContain('aria-label="Copy code"')
    const plain = renderToStaticMarkup(h(ui.CodeBlock, { code: ':root {\n  --radius: 0.5rem;\n}\n', title: 'ui-style.css', language: 'css' }))
    expect(plain).toBe(beforeDiff)
    expect(renderToStaticMarkup(h(ui.CodeBlock, { code: diffText, diff: false }))).not.toContain('data-diff')
  })

  it('keeps the text of a non-diff block equal to the code', () => {
    expect(text(renderToStaticMarkup(h(ui.CodeBlockCode, { code: diffText, language: 'css' })))).toBe(diffText)
  })
})

describe.each(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])('%s Code Block diff styles', (family) => {
  const css = readFileSync(new URL(`../src/styles/code-block/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    .match(/\/\* 0\.7\.6 variants \*\/([^]*?)\/\* end 0\.7\.6 variants \*\//)?.[1] ?? ''
  it('tints added and removed lines, reserves a 28px marker column and drops the tints in forced colours', () => {
    expect(css).toMatch(/\[data-slot='code-block-line'\]\[data-diff='added'\][^{]*\{[^}]*oklch\(0\.72 0\.17 150\)[^}]*24%/)
    expect(css).toMatch(/\[data-slot='code-block-line'\]\[data-diff='removed'\][^{]*\{[^}]*oklch\(0\.66 0\.2 25\)[^}]*26%/)
    expect(css).toContain('28px')
    expect(css).toContain("[data-slot='code-block-diff-count']")
    const forced = css.match(/@media \(forced-colors: active\) \{([^]*)\}\s*$/)?.[1] ?? ''
    expect(forced).toMatch(/\[data-diff\][^{]*\{[^}]*background: transparent/)
    expect(forced).toMatch(/code-block-diff-marker[^{]*\{[^}]*CanvasText/)
  })
})
