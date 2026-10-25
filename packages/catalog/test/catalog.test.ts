import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import {
  supportedComponentIds,
  supportedStyleFamilies,
  type ComponentId,
} from '@ombelle/contracts'
import { Button } from '../src/templates/button.js'
import { Input } from '../src/templates/input.js'
import { NativeSelect, NativeSelectOption } from '../src/templates/native-select.js'
import { runtimeDependencies } from '../src/manifest.js'
describe('catalog contract', () => {
  it('pins lucide-react exactly', () => {
    expect(runtimeDependencies['lucide-react']).toBe('1.55.0')
    expect(Object.keys(runtimeDependencies).at(-1)).toBe('lucide-react')
  })
  it('provides Card with all six parts and three separate family styles', () => {
    expect(supportedComponentIds).toContain('card')
    const card = getTemplate(getCatalog('0.1.0'), 'card')
    expect(card.logicalPath).toBe('components/ui/card.tsx')
    expect(card.slots).toEqual([
      'card',
      'card-header',
      'card-title',
      'card-description',
      'card-content',
      'card-footer',
    ])
    for (const part of [
      'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter',
    ])
      expect(card.content).toContain(`export function ${part}(`)
    expect(card.content).toContain("import './card.css'")
    expect(card.content).not.toMatch(/['"]use client['"]/)
    expect(Object.keys(card.styles ?? {})).toEqual([
      'flat', 'minimalist', 'neo-brutalism',
    ])
    for (const family of supportedStyleFamilies) {
      expect(card.styles?.[family]).toContain("[data-slot='card']")
      expect(card.styles?.[family]).toContain('var(--card)')
      expect(card.styles?.[family]).toContain('var(--card-foreground)')
      expect(card.styles?.[family]).toContain("[data-density='dense']")
      expect(card.styles?.[family]).toContain('@media (forced-colors: active)')
    }
  })
  it('provides Label, Textarea and Native Select with three family styles each', () => {
    const c = getCatalog('0.1.0')
    for (const id of ['label', 'textarea', 'native-select'] as const) {
      expect(supportedComponentIds).toContain(id)
      const template = getTemplate(c, id)
      expect(template.logicalPath).toBe('components/ui/' + id + '.tsx')
      expect(template.content).toContain("import './" + id + ".css'")
      expect(template.content).not.toMatch(/['"]use client['"]/)
      expect(Object.keys(template.styles ?? {})).toEqual([
        'flat', 'minimalist', 'neo-brutalism',
      ])
      for (const family of supportedStyleFamilies)
        expect(template.styles?.[family]).toContain('@media (forced-colors: active)')
    }
  })
  it('declares per-component dependencies and slots', () => {
    const c = getCatalog('0.1.0')
    const names = (id: ComponentId) =>
      c.templates[id].dependencies.map((d) => d.name)
    expect(names('native-select')).toEqual([
      'react', 'clsx', 'tailwind-merge', 'lucide-react',
    ])
    expect(names('dialog')).toEqual([
      'react', '@radix-ui/react-dialog', 'clsx', 'tailwind-merge', 'lucide-react',
    ])
    expect(names('label')).toEqual(['react', 'clsx', 'tailwind-merge'])
    expect(names('textarea')).toEqual(['react', 'clsx', 'tailwind-merge'])
    expect(names('button')).toEqual([
      'react', '@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge',
    ])
    expect(c.templates['native-select'].slots).toEqual([
      'native-select-wrapper',
      'native-select',
      'native-select-icon',
      'native-select-option',
      'native-select-optgroup',
    ])
    expect(c.templates.label.slots).toEqual(['label'])
    expect(c.templates.textarea.slots).toEqual(['textarea'])
  })
  it('styles control states in every family', () => {
    const c = getCatalog('0.1.0')
    for (const family of supportedStyleFamilies) {
      const textarea = c.templates.textarea.styles?.[family] ?? ''
      const select = c.templates['native-select'].styles?.[family] ?? ''
      const label = c.templates.label.styles?.[family] ?? ''
      for (const needle of [
        "[data-slot='textarea']",
        "[aria-invalid='true']",
        'var(--destructive)',
        'field-sizing: content',
        'resize: vertical',
      ])
        expect(textarea).toContain(needle)
      for (const needle of [
        'appearance: none',
        "[data-size='sm']",
        ':has(select:disabled)',
        'pointer-events: none',
        'inset-inline-end',
        "select[multiple] + [data-slot='native-select-icon']",
      ])
        expect(select).toContain(needle)
      for (const needle of [
        "[data-slot='label'] > [aria-hidden='true']",
        'var(--destructive)',
      ])
        expect(label).toContain(needle)
      for (const css of [textarea, select, label]) {
        expect(css).not.toContain('left:')
        expect(css).not.toContain('right:')
      }
    }
  })
  it('forwards caller props to the native select', () => {
    const html = renderToStaticMarkup(
      createElement(
        NativeSelect,
        {
          id: 's',
          className: 'custom',
          'aria-invalid': 'true',
          required: true,
          size: 'sm',
        },
        createElement(NativeSelectOption, { value: 'a' }, 'A'),
      ),
    )
    expect(html).toMatch(/^<div data-slot="native-select-wrapper"><select[^>]*>/)
    const open = html.match(/<select[^>]*>/)?.[0] ?? ''
    for (const attr of [
      'id="s"',
      'class="custom"',
      'aria-invalid="true"',
      'required',
      'data-slot="native-select"',
      'data-size="sm"',
    ])
      expect(open).toContain(attr)
    expect(open).not.toMatch(/\ssize="/)
    expect(html).toContain('data-slot="native-select-icon"')
    expect(html).toContain('aria-hidden="true"')
    expect(renderToStaticMarkup(createElement(NativeSelect))).toContain(
      'data-size="default"',
    )
  })
  it('resolves all three IDs and retains Dialog client boundary', () => {
    const c = getCatalog('0.1.0')
    for (const id of ['button', 'dialog', 'input'] as const)
      expect(getTemplate(c, id).id).toBe(id)
    expect(c.templates.dialog.content).toMatch(/^['"]use client['"]/)
  })
  it('rejects unknown releases', () => {
    try {
      getCatalog('99.0.0')
      expect.fail()
    } catch (e) {
      expect(e).toMatchObject({ code: 'UNSUPPORTED_RELEASE' })
    }
  })
  it('has complete tokens for every referenced style variable', () => {
    const c = getCatalog('0.1.0')
    for (const family of supportedStyleFamilies) {
      expect(Object.keys(c.presets[family].modes.light)).toHaveLength(19)
      for (const token of c.styles[family].matchAll(/var\(--([a-z-]+)\)/g))
        expect([
          ...Object.keys(c.presets[family].modes.light).map((k) =>
            k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()),
          ),
          'radius',
          'border-width',
          'shadow-x',
          'shadow-y',
          'control-height',
          'font-family',
          'motion-duration',
        ]).toContain(token[1])
    }
  })
  it('uses an icon close control and logical placement', () => {
    const c = getCatalog('0.1.0')
    const dialog = c.templates.dialog.content
    expect(dialog).toContain("import { XIcon } from 'lucide-react'")
    expect(dialog).toContain('<XIcon aria-hidden="true" />')
    expect(dialog).toContain('<span className="sr-only">Close</span>')
    const norm = (css: string) => css.replace(/\s+/g, ' ')
    for (const family of supportedStyleFamilies) {
      const css = norm(c.styles[family])
      expect(css).toContain('[data-slot="dialog-close"]')
      const closeBlocks = [
        ...css.matchAll(/\[data-slot="dialog-close"\]\s*\{[^}]*\}/g),
      ].map((m) => m[0].replace(/\s+/g, ''))
      const closeRule = closeBlocks.join('')
      expect(closeRule).toContain('position:absolute')
      expect(closeRule).toContain('inset-inline-end')
      expect(closeRule).toContain('min-width:var(--control-height)')
      expect(closeRule).toContain('min-height:var(--control-height)')
      expect(closeRule).not.toMatch(/(^|[;{])width:var\(--control-height\)/)
      expect(closeRule).not.toContain('margin-top:1rem')
    }
    for (const family of ['flat', 'neo-brutalism'] as const) {
      const css = norm(c.styles[family]).replace(/\s+/g, '')
      const m = css.match(
        /\[data-slot="input"\]\[aria-invalid="true"\]\{[^}]*\}/,
      )
      expect(m?.[0]).toContain('var(--destructive)')
    }
  })
  it('defaults to a non-submitting button and forwards explicit submit', () => {
    expect(renderToStaticMarkup(createElement(Button, null, 'Save'))).toContain(
      'type="button"',
    )
    expect(
      renderToStaticMarkup(createElement(Button, { type: 'submit' }, 'Save')),
    ).toContain('type="submit"')
  })
  it('forwards input association and disabled state', () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        id: 'email',
        disabled: true,
        'aria-label': 'Email',
      }),
    )
    expect(html).toContain('id="email"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-label="Email"')
  })
})
