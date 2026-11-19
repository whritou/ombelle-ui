import { readdirSync, readFileSync } from 'node:fs'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { supportedStyleFamilies, type ThemeData } from '@ombelle/contracts'
import { previewSlotPrefix, previewTokensCss, scopePreviewCss } from '../../../../scripts/www-previews/scope-css'

const scope = '[data-preview-family="papier"]'
const stylesDir = new URL('../../../../packages/catalog/src/styles/', import.meta.url)
const compact = (css: string) => css.replace(/\s+/g, ' ').replace(/ ?([{};,>]) ?/g, '$1').trim()
const selectorsOf = (css: string) => {
  const out: string[] = []
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test((rule.parent as postcss.AtRule).name)) return
    out.push(...rule.selectors)
  })
  return out
}

describe('scopePreviewCss', () => {
  it('uses the pv- slot prefix', () => expect(previewSlotPrefix).toBe('pv-'))

  it('prefixes every rule with the family scope', () => {
    expect(compact(scopePreviewCss('[data-slot="button"]:hover{color:red}', 'papier')))
      .toBe(`${scope} [data-slot="pv-button"]:hover{color:red}`)
  })

  it('renames every data-slot value', () => {
    const css = compact(scopePreviewCss(`[data-state='open'] > [data-slot='accordion-icon']{x:1}[data-slot]{y:2}`, 'papier'))
    expect(css).toContain(`${scope} [data-state='open']>[data-slot='pv-accordion-icon']{x:1}`)
    expect(css).toContain(`${scope} [data-slot]{y:2}`)
    expect(css).not.toContain(`'accordion-icon'`)
  })

  it('maps html, body and :root to the stage itself', () => {
    expect(compact(scopePreviewCss('html, body{margin:0}', 'papier'))).toBe(`${scope}{margin:0}`)
    expect(compact(scopePreviewCss(':root{--a:1}', 'papier'))).toBe(`${scope}{--a:1}`)
    expect(compact(scopePreviewCss('body .x{a:b}', 'papier'))).toBe(`${scope} .x{a:b}`)
    const universal = compact(scopePreviewCss('*,*::before{box-sizing:border-box}', 'papier'))
    expect(universal).toBe(`${scope} *,${scope} *::before{box-sizing:border-box}`)
  })

  it('scopes focus rules onto the stage itself', () => {
    const css = compact(scopePreviewCss(
      `[data-focus] .preset-gallery{a:b}:is([data-focus='slider'], [data-focus='card']) .preset-gallery > section{c:d}[data-focus='slider'] .preset-gallery{e:f}`,
      'papier',
    ))
    expect(css).toContain(`${scope}[data-focus] .preset-gallery{a:b}`)
    expect(css).toContain(`${scope}:is([data-focus='slider'],[data-focus='card']) .preset-gallery>section{c:d}`)
    expect(css).toContain(`${scope}[data-focus='slider'] .preset-gallery{e:f}`)
  })

  it('renames keyframes per family', () => {
    const css = compact(scopePreviewCss(
      '@keyframes ombelle-tooltip-enter{from{opacity:0}to{opacity:1}}[data-slot="tooltip-content"]{animation:ombelle-tooltip-enter .2s ease-out;animation-name:ombelle-tooltip-enter}',
      'papier',
    ))
    expect(css).toContain('@keyframes ombelle-tooltip-enter-papier{from{opacity:0}to{opacity:1}}')
    expect(css).toContain('animation:ombelle-tooltip-enter-papier .2s ease-out')
    expect(css).toContain('animation-name:ombelle-tooltip-enter-papier')
    expect(css).not.toMatch(/ombelle-tooltip-enter[ ;}]/)
  })

  it('keeps media, supports and layer rules', () => {
    const css = compact(scopePreviewCss(
      '@media (forced-colors: active){[data-slot="x"]{a:b}}@supports (a:b){[data-slot="y"]{c:d}}@layer components{[data-slot="z"]{e:f}}',
      'papier',
    ))
    expect(css).toContain(`@media (forced-colors: active){${scope} [data-slot="pv-x"]{a:b}}`)
    expect(css).toContain(`@supports (a:b){${scope} [data-slot="pv-y"]{c:d}}`)
    expect(css).toContain(`@layer components{${scope} [data-slot="pv-z"]{e:f}}`)
  })

  it('throws on rules it cannot scope', () => {
    for (const css of ['@font-face{font-family:x}', '@import "x.css";', '@page{margin:0}'])
      expect(() => scopePreviewCss(css, 'papier')).toThrow('Unsupported at-rule in preview CSS')
  })

  it('is deterministic', () => {
    const css = '[data-slot="button"]{a:b}@keyframes k{from{a:b}}'
    expect(scopePreviewCss(css, 'papier')).toBe(scopePreviewCss(css, 'papier'))
  })

  it('scopes every built-in family sheet and component sheet', () => {
    const componentDirs = readdirSync(stylesDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    for (const family of supportedStyleFamilies) {
      const sheets = [`${family}.css`, ...componentDirs.map((dir) => `${dir.name}/${family}.css`)]
      let scoped = 0
      for (const sheet of sheets) {
        let source: string
        try { source = readFileSync(new URL(sheet, stylesDir), 'utf8') } catch { continue }
        const out = scopePreviewCss(source, family)
        for (const selector of selectorsOf(out)) expect(selector, `${family}: ${sheet}`).toMatch(/^\[data-preview-family=/)
        expect(out).not.toMatch(/\[data-slot=["'](?!pv-)/)
        scoped++
      }
      expect(scoped).toBeGreaterThan(10)
    }
  })
})

describe('previewTokensCss', () => {
  const theme: ThemeData = { light: { '--z': '1', '--a': '2' }, dark: { '--b': '3', '--a': '4' }, theme: { '--color-x': 'var(--x)' } }
  it('emits three-mode tokens', () => {
    const css = compact(previewTokensCss('papier', theme))
    expect(css).toBe(
      `${scope}{--a:2;--z:1;color-scheme:light}` +
      `${scope}[data-preview-mode="dark"],.dark ${scope}[data-preview-mode="auto"]{--a:4;--b:3;color-scheme:dark}`,
    )
  })
  it('is deterministic', () => expect(previewTokensCss('papier', theme)).toBe(previewTokensCss('papier', theme)))
})
