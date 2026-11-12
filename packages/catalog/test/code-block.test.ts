import { createElement, createElement as h } from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
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

  it('adds no token markers for plain text', () => {
    expect(render(samples.tsx, 'text')).not.toContain('data-token')
  })

  it('renders the same markup on every call', () => {
    for (const language of languages) expect(render(samples.tsx, language)).toBe(render(samples.tsx, language))
  })
})

const slots = ['code-block', 'code-block-header', 'code-block-title', 'code-block-copy', 'code-block-status', 'code-block-code', 'code-block-line',
  'code-block-tabs', 'code-block-tab', 'code-block-command']
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
  [...html.matchAll(/<pre[^>]*data-slot="code-block-command"[^>]*><code>([^<]*)<\/code><\/pre>/g)].map((match) => match[1])

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

  it.each(editions)('%s renders a titled file block with Copy, a focusable named pre, lines and a polite status', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CodeBlock, { code: 'a\nb', title: 'button.tsx' }))
    expect(html).toMatch(/^<div[^>]*data-slot="code-block"/)
    expect(html).toMatch(/<span[^>]*data-slot="code-block-title"[^>]*>button.tsx<\/span>/)
    expect(html).toMatch(/<button(?=[^>]*type="button")(?=[^>]*aria-label="Copy button.tsx")[^>]*>Copy<\/button>/)
    expect(html).toMatch(/<pre(?=[^>]*tabindex="0")(?=[^>]*aria-label="button.tsx source")(?=[^>]*max-height:32rem)[^>]*data-slot="code-block-code"/)
    expect(html.match(/data-slot="code-block-line"/g)).toHaveLength(2)
    expect(html).toMatch(/<span(?=[^>]*data-slot="code-block-status")(?=[^>]*aria-live="polite")[^>]*><\/span>/)
    expect(html).not.toContain('data-line-numbers')
  })

  it.each(editions)('%s names an untitled block "Code", hides line numbers on request and renders given children', (_, ui) => {
    const plain = renderToStaticMarkup(h(ui.CodeBlock, { code: 'a' }))
    expect(plain).toContain('aria-label="Copy code"')
    expect(plain).toMatch(/<pre[^>]*aria-label="Code"/)
    expect(plain).not.toContain('data-slot="code-block-title"')
    expect(renderToStaticMarkup(h(ui.CodeBlock, { code: 'a', lineNumbers: false }))).toMatch(/<pre[^>]*data-line-numbers="false"/)
    const custom = renderToStaticMarkup(h(ui.CodeBlock, { code: 'x', children: h('b', null, 'x') }))
    expect(custom).toContain('<code><b>x</b></code>')
    expect(custom).not.toContain('data-slot="code-block-line"')
    expect(renderToStaticMarkup(h(ui.CodeBlock, { code: 'a', copyLabel: 'Copy snippet', maxHeight: '10rem' })))
      .toMatch(/aria-label="Copy snippet"[\s\S]*max-height:10rem/)
  })

  it.each(editions)('%s lets a labelled pre drop its own name', (_, ui) => {
    const html = renderToStaticMarkup(h(ui.CodeBlockCode, { code: 'a', 'aria-labelledby': 'file-title' }))
    expect(html).toContain('aria-labelledby="file-title"')
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
    expect(panelText(renderToStaticMarkup(h(ui.CodeBlockCommand, { args, defaultManager: 'yarn', runners })))).toEqual([`yarn dlx --quiet ${args}`])
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
