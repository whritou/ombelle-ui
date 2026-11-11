import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate, offeredGlassPresetOrder, startingPresetOrder } from '../src/index.js'
import { catalogData } from '../src/generated.js'
import { resolveRecipePreset } from '../src/recipe-preset.js'
import {
  supportedComponentIds,
  supportedStyleFamilies,
  validatePreset,
  type ComponentId,
} from '@ombelle/contracts'
import { Button } from '../src/templates/button.js'
import { Input } from '../src/templates/input.js'
import {
  NativeSelect,
  NativeSelectOption,
} from '../src/templates/native-select.js'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../src/templates/tooltip.js'
import { Dialog, DialogTrigger } from '../src/templates/dialog.js'
import { runtimeDependencies } from '../src/manifest.js'
import { Checkbox } from '../src/templates/checkbox.js'
import { Switch, SwitchThumb } from '../src/templates/switch.js'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../src/templates/tabs.js'
describe('catalog contract', () => {
  it.each([true, undefined] as const)(
    'preserves forceMount=%s across Tooltip portal and content',
    (forceMount) => {
      const portal = TooltipContent({ forceMount, children: 'Description' })
      expect(portal.props.forceMount).toBe(forceMount)
      expect(portal.props.children.props.forceMount).toBe(forceMount)
    },
  )
  it('provides Tooltip parts, scoped dependencies and accessible popup styles', () => {
    expect(supportedComponentIds).toContain('tooltip')
    const tooltip = getTemplate(getCatalog('0.1.0'), 'tooltip' as ComponentId)
    expect(tooltip.slots).toEqual([
      'tooltip-provider',
      'tooltip',
      'tooltip-trigger',
      'tooltip-content',
      'tooltip-arrow',
    ])
    expect(tooltip.dependencies).toEqual([
      { name: 'react', version: '19.3.1' },
      { name: '@radix-ui/react-tooltip', version: '1.4.1' },
      { name: 'clsx', version: '2.1.1' },
      { name: 'tailwind-merge', version: '3.7.0' },
    ])
    expect(tooltip.content).toMatch(/^['"]use client['"]/)
    expect(tooltip.content).toContain("import './tooltip.css'")
    for (const part of [
      'TooltipProvider',
      'Tooltip',
      'TooltipTrigger',
      'TooltipContent',
      'TooltipArrow',
    ])
      expect(tooltip.content).toContain(`export function ${part}(`)
    expect(tooltip.content).toContain(
      '<TooltipPrimitive.Portal forceMount={forceMount}>',
    )
    for (const family of supportedStyleFamilies) {
      const css = tooltip.styles?.[family] ?? ''
      for (const rule of [
        "[data-slot='tooltip-content']",
        "[data-slot='tooltip-arrow']",
        "[data-slot='tooltip-trigger']:focus-visible",
        '@media (forced-colors: active)',
        '@media (prefers-reduced-motion: reduce)',
      ])
        expect(css).toContain(rule)
      // Minimalist paints its tooltip with the card surface, ombelle and neo-brutalism with
      // primary, flat as an inverted foreground block; the others use popover.
      if (family === 'flat') {
        expect(css).toContain('background: var(--foreground)')
        expect(css).toContain('color: var(--background)')
      } else {
        const surface =
          family === 'minimalist'
            ? 'card'
            : family === 'ombelle' || family === 'neo-brutalism'
              ? 'primary'
              : 'popover'
        expect(css).toContain(`var(--${surface})`)
        expect(css).toContain(`var(--${surface}-foreground)`)
      }
      expect(css).not.toMatch(/(?:left|right):/)
    }
  })
  it.each(['controlled', 'uncontrolled'] as const)(
    'renders %s Tabs selection and forwards primitive/presentation props',
    (mode) => {
      const html = renderToStaticMarkup(
        createElement(
          Tabs,
          {
            ...(mode === 'controlled'
              ? { value: 'activity', onValueChange: () => {} }
              : { defaultValue: 'activity' }),
            orientation: 'vertical',
            dir: 'rtl',
            className: 'custom-root',
            style: { gap: 8 },
          },
          createElement(
            TabsList,
            { 'aria-label': 'Project sections', className: 'custom-list' },
            createElement(TabsTrigger, { value: 'overview' }, 'Overview'),
            createElement(
              TabsTrigger,
              { value: 'activity', className: 'custom-trigger' },
              'Activity',
            ),
            createElement(
              TabsTrigger,
              { value: 'settings', disabled: true },
              'Settings',
            ),
          ),
          createElement(
            TabsContent,
            {
              value: 'activity',
              className: 'custom-content',
              style: { paddingInline: 4 },
            },
            'Recent activity.',
          ),
        ),
      )
      for (const text of [
        'data-slot="tabs"',
        'data-slot="tabs-list"',
        'data-slot="tabs-trigger"',
        'data-slot="tabs-content"',
        'dir="rtl"',
        'data-orientation="vertical"',
        'role="tablist"',
        'aria-label="Project sections"',
        'aria-selected="true"',
        'aria-selected="false"',
        'role="tabpanel"',
        'Recent activity.',
        'disabled=""',
        'class="custom-root"',
        'class="custom-list"',
        'class="custom-trigger"',
        'class="custom-content"',
        'gap:8px',
        'padding-inline:4px',
      ])
        expect(html).toContain(text)
    },
  )
  it('provides Tabs parts, scoped dependencies and orientation/state styles', () => {
    expect(supportedComponentIds).toContain('tabs')
    const tabs = getTemplate(getCatalog('0.1.0'), 'tabs' as ComponentId)
    expect(tabs.slots).toEqual([
      'tabs',
      'tabs-list',
      'tabs-trigger',
      'tabs-content',
    ])
    expect(tabs.dependencies).toEqual([
      { name: 'react', version: '19.3.1' },
      { name: '@radix-ui/react-tabs', version: '1.2.1' },
      { name: 'clsx', version: '2.1.1' },
      { name: 'tailwind-merge', version: '3.7.0' },
    ])
    expect(tabs.content).toMatch(/^['"]use client['"]/)
    for (const part of ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'])
      expect(tabs.content).toContain(`export function ${part}(`)
    for (const family of supportedStyleFamilies) {
      const css = tabs.styles?.[family] ?? ''
      for (const rule of [
        "[data-slot='tabs']",
        "[data-slot='tabs-list']",
        "[data-slot='tabs-trigger']",
        "[data-slot='tabs-content']",
        "[data-state='active']",
        "[data-state='inactive']",
        "[data-orientation='horizontal']",
        "[data-orientation='vertical']",
        ':focus-visible',
        ':disabled',
        '[data-disabled]',
        '@media (forced-colors: active)',
        '@media (prefers-reduced-motion: reduce)',
      ])
        expect(css).toContain(rule)
      expect(css).not.toMatch(/(?:left|right):/)
    }
  })
  it('provides Switch parts, scoped dependencies and accessible state styles', () => {
    expect(supportedComponentIds).toContain('switch')
    const control = getTemplate(getCatalog('0.1.0'), 'switch' as ComponentId)
    expect(control.slots).toEqual(['switch', 'switch-thumb'])
    expect(control.dependencies).toEqual([
      { name: 'react', version: '19.3.1' },
      { name: '@radix-ui/react-switch', version: '1.4.1' },
      { name: 'clsx', version: '2.1.1' },
      { name: 'tailwind-merge', version: '3.7.0' },
    ])
    expect(control.content).toMatch(/^['"]use client['"]/)
    expect(control.content).toContain("import './switch.css'")
    for (const part of [
      'export type SwitchProps',
      'export function Switch(',
      'export function SwitchThumb(',
    ])
      expect(control.content).toContain(part)
    for (const family of supportedStyleFamilies) {
      const css = control.styles?.[family] ?? ''
      for (const rule of [
        "[data-slot='switch']",
        "[data-slot='switch-thumb']",
        "[data-state='checked']",
        "[data-state='unchecked']",
        ':focus-visible',
        ':disabled',
        '@media (forced-colors: active)',
        '@media (prefers-reduced-motion: reduce)',
        'inset-inline-start',
      ])
        expect(css).toContain(rule)
      expect(css).not.toMatch(/(?:left|right):/)
    }
  })
  it('provides Checkbox with scoped dependencies, slots and all accessible state styles', () => {
    expect(supportedComponentIds).toContain('checkbox')
    const checkbox = getTemplate(getCatalog('0.1.0'), 'checkbox' as ComponentId)
    expect(checkbox.slots).toEqual(['checkbox', 'checkbox-indicator'])
    expect(checkbox.dependencies).toEqual([
      { name: 'react', version: '19.3.1' },
      { name: '@radix-ui/react-checkbox', version: '1.4.1' },
      { name: 'clsx', version: '2.1.1' },
      { name: 'tailwind-merge', version: '3.7.0' },
      { name: 'lucide-react', version: '1.55.0' },
    ])
    expect(checkbox.content).toMatch(/^['"]use client['"]/)
    expect(checkbox.content).toContain("import './checkbox.css'")
    expect(checkbox.content).toContain('export type CheckboxProps')
    expect(checkbox.content).toContain('export function Checkbox(')
    for (const family of supportedStyleFamilies) {
      const css = checkbox.styles?.[family] ?? ''
      for (const rule of [
        "[data-slot='checkbox']",
        "[data-slot='checkbox-indicator']",
        "[data-state='checked']",
        "[data-state='indeterminate']",
        ':focus-visible',
        "[aria-invalid='true']",
        ':disabled',
        '@media (forced-colors: active)',
        '@media (prefers-reduced-motion: reduce)',
      ])
        expect(css).toContain(rule)
      expect(css).not.toMatch(/(?:left|right):/)
    }
  })
  it('forwards Switch state, form and presentation props and composes its thumb', () => {
    const html = renderToStaticMarkup(
      createElement(Switch, {
        id: 'notifications',
        name: 'notifications',
        value: 'enabled',
        required: true,
        disabled: true,
        checked: true,
        className: 'custom',
        style: { marginInline: 4 },
        'aria-label': 'Enable notifications',
        'aria-describedby': 'help',
      }),
    )
    for (const text of [
      'role="switch"',
      'aria-checked="true"',
      'data-state="checked"',
      'id="notifications"',
      'name="notifications"',
      'value="enabled"',
      'required=""',
      'disabled=""',
      'class="custom"',
      'margin-inline:4px',
      'aria-label="Enable notifications"',
      'aria-describedby="help"',
      'data-slot="switch-thumb"',
    ])
      expect(html).toContain(text)
    expect(
      renderToStaticMarkup(createElement(Switch, { defaultChecked: false })),
    ).toContain('aria-checked="false"')
    const composed = renderToStaticMarkup(
      createElement(
        Switch,
        { defaultChecked: true },
        createElement(SwitchThumb, {
          className: 'custom-thumb',
          style: { opacity: 0.8 },
        }),
      ),
    )
    expect(composed.match(/data-slot="switch-thumb"/g)).toHaveLength(1)
    expect(composed).toContain('class="custom-thumb"')
    expect(composed).toContain('opacity:0.8')
  })
  it('pins lucide-react exactly', () => {
    expect(runtimeDependencies['lucide-react']).toBe('1.55.0')
    expect(Object.keys(runtimeDependencies).at(-1)).toBe('lucide-react')
  })
  it('forwards Checkbox state, association, form and presentation props', () => {
    const html = renderToStaticMarkup(
      createElement(Checkbox, {
        id: 'terms',
        name: 'terms',
        value: 'accepted',
        required: true,
        disabled: true,
        checked: 'indeterminate',
        className: 'custom',
        style: { marginInline: 4 },
        'aria-label': 'Accept terms',
        'aria-invalid': 'true',
        'aria-describedby': 'error',
      }),
    )
    for (const text of [
      'role="checkbox"',
      'aria-checked="mixed"',
      'data-state="indeterminate"',
      'id="terms"',
      'name="terms"',
      'value="accepted"',
      'required=""',
      'disabled=""',
      'class="custom"',
      'margin-inline:4px',
      'aria-label="Accept terms"',
      'aria-invalid="true"',
      'aria-describedby="error"',
      'data-slot="checkbox-indicator"',
      'data-checkbox-mark="checked"',
      'data-checkbox-mark="indeterminate"',
      'aria-hidden="true"',
    ])
      expect(html).toContain(text)
  })
  it('provides Card with all six parts and separate family styles', () => {
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
      'Card',
      'CardHeader',
      'CardTitle',
      'CardDescription',
      'CardContent',
      'CardFooter',
    ])
      expect(card.content).toContain(`export function ${part}(`)
    expect(card.content).toContain("import './card.css'")
    expect(card.content).not.toMatch(/['"]use client['"]/)
    expect(Object.keys(card.styles ?? {})).toEqual([
      'flat',
      'minimalist',
      'neo-brutalism',
      'ombelle',
      'liquid-glass',
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
        'flat',
        'minimalist',
        'neo-brutalism',
        'ombelle',
        'liquid-glass',
      ])
      for (const family of supportedStyleFamilies)
        expect(template.styles?.[family]).toContain(
          '@media (forced-colors: active)',
        )
    }
  })
  it('declares per-component dependencies and slots', () => {
    const c = getCatalog('0.1.0')
    const names = (id: ComponentId) =>
      c.templates[id].dependencies.map((d) => d.name)
    expect(names('native-select')).toEqual([
      'react',
      'clsx',
      'tailwind-merge',
      'lucide-react',
    ])
    expect(names('dialog')).toEqual([
      'react',
      '@radix-ui/react-dialog',
      'clsx',
      'tailwind-merge',
      'lucide-react',
    ])
    expect(names('label')).toEqual(['react', 'clsx', 'tailwind-merge'])
    expect(names('textarea')).toEqual(['react', 'clsx', 'tailwind-merge'])
    expect(names('button')).toEqual([
      'react',
      '@radix-ui/react-slot',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
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
        'pointer-events: none',
        'inset-inline-end',
        "select[multiple] + [data-slot='native-select-icon']",
      ])
        expect(select).toContain(needle)
      // Every family styles the disabled select, on the wrapper or on the select itself.
      expect(select).toMatch(/:has\(select:disabled\)|\[data-slot='native-select'\]:disabled/)
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
    expect(html).toMatch(
      /^<div data-slot="native-select-wrapper"><select[^>]*>/,
    )
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
  it('provides the experimental liquid-glass preset and component styles', () => {
    const c = getCatalog('0.1.0')
    const preset = c.presets['liquid-glass']
    expect(validatePreset(preset)).toEqual(preset)
    expect(preset).toMatchObject({
      id: 'builtin-liquid-glass',
      styleFamily: 'liquid-glass',
      design: { transparency: 'auto', glassBlurPx: 3, glassOpacity: 0.57, radiusRem: 0.75 },
      componentDefaults: { button: { variant: 'default', size: 'default' } },
    })
    expect(c.styles['liquid-glass']).toContain('liquid-glass family')
    expect(
      supportedComponentIds.filter(
        (id) => c.templates[id].styles?.['liquid-glass'] !== undefined,
      ),
    ).toEqual([
      'alert',
      'accordion',
      'badge',
      'avatar',
      'card',
      'checkbox',
      'dropdown-menu',
      'label',
      'popover',
      'progress',
      'native-select',
      'radio-group',
      'select',
      'switch',
      'separator',
      'skeleton',
      'tabs',
      'table',
      'textarea',
      'tooltip',
      'input-group',
      'sheet',
      'alert-dialog',
      'breadcrumb',
      'pagination',
      'toast',
      'spinner',
      'kbd',
      'empty',
      'field',
      'meter',
      'stepper',
    ])
    for (const id of supportedComponentIds)
      if (c.templates[id].styles)
        for (const family of supportedStyleFamilies)
          expect(c.templates[id].styles?.[family]).toBeTypeOf('string')
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
      // Families with hard offset shadows also carry the optional shadowColor token.
      expect(Object.keys(c.presets[family].modes.light)).toHaveLength(
        family === 'neo-brutalism' || family === 'ombelle' ? 20 : 19,
      )
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
          // Custom properties the family stylesheet declares itself, such as --dialog-padding.
          ...[...c.styles[family].matchAll(/(?:^|[{;\s])--([a-z-]+)\s*:/g)].map((m) => m[1]),
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
  it('keeps the Button slot when an asChild trigger composes it', () => {
    const tooltip = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(
          Tooltip,
          null,
          createElement(
            TooltipTrigger,
            { asChild: true },
            createElement(Button, { variant: 'outline' }, 'Help'),
          ),
        ),
      ),
    )
    expect(tooltip).toContain('data-slot="button"')
    expect(tooltip).toContain('data-variant="outline"')
    expect(tooltip).toContain('data-state="closed"')
    expect(tooltip).not.toContain('data-slot="tooltip-trigger"')
    const dialog = renderToStaticMarkup(
      createElement(
        Dialog,
        null,
        createElement(
          DialogTrigger,
          { asChild: true },
          createElement(Button, null, 'Open'),
        ),
      ),
    )
    expect(dialog).toContain('data-slot="button"')
    expect(dialog).toContain('aria-haspopup="dialog"')
  })
  it('keeps the Tooltip trigger slot for non-Button asChild children', () => {
    const html = renderToStaticMarkup(
      createElement(
        TooltipProvider,
        null,
        createElement(
          Tooltip,
          null,
          createElement(
            TooltipTrigger,
            { asChild: true },
            createElement('a', { href: '#help' }, 'Help'),
          ),
        ),
      ),
    )
    expect(html).toContain('data-slot="tooltip-trigger"')
  })
})

describe('liquid glass starting presets', () => {
  it('starting presets load and validate', () => {
    const c = getCatalog('0.1.0')
    expect(startingPresetOrder).toEqual([
      'builtin-liquid-glass-cristal',
      'builtin-liquid-glass-givre',
      'builtin-liquid-glass-fume',
      'builtin-liquid-glass-relief',
      'builtin-liquid-glass-clear',
      'builtin-liquid-glass-prism',
      'builtin-liquid-glass-liquid',
      'builtin-liquid-glass-voile',
      'builtin-liquid-glass',
    ])
    expect(startingPresetOrder.map((id) => c.startingPresets[id].name)).toEqual([
      'Cristal', 'Givré', 'Fumé', 'Relief', 'Clear', 'Prism', 'Liquid', 'Voile', 'Liquid glass',
    ])
    for (const id of startingPresetOrder) {
      expect(validatePreset(c.startingPresets[id])).toEqual(c.startingPresets[id])
      expect(c.startingPresets[id].styleFamily).toBe('liquid-glass')
    }
    // The family base stays today's look: resolvePreset fills saved presets' missing fields from it.
    expect(c.startingPresets['builtin-liquid-glass']).toEqual(c.presets['liquid-glass'])
    expect(c.startingPresets['builtin-liquid-glass-relief'].modes.light.card).toBe('#F4A5B3')
    expect(c.startingPresets['builtin-liquid-glass-cristal'].modes.light.primary).toBe('#0B6AA8')
    expect(c.startingPresets['builtin-liquid-glass-fume'].modes.light.cardForeground).toBe('#F0F7FF')
    expect(c.startingPresets['builtin-liquid-glass'].design.glassOpacity).toBe(0.57)
  })
  it('offers six starting presets and keeps the retired ones resolvable', () => {
    const c = getCatalog('0.1.0')
    expect(offeredGlassPresetOrder.map((id) => c.startingPresets[id].name)).toEqual([
      'Cristal', 'Givré', 'Fumé', 'Relief', 'Voile', 'Liquid glass',
    ])
    for (const id of ['builtin-liquid-glass-clear', 'builtin-liquid-glass-prism', 'builtin-liquid-glass-liquid'] as const) {
      const { revision, catalogRelease } = c.startingPresets[id]
      expect(resolveRecipePreset({ id, revision, catalogRelease, compilerVersion: '0.1.0' }).id).toBe(id)
    }
  })
  it('lists exactly the starting preset files, each under its own id', () => {
    expect(Object.keys(catalogData.startingPresets).sort()).toEqual([...startingPresetOrder].sort())
    for (const [id, preset] of Object.entries(catalogData.startingPresets)) expect(preset.id).toBe(id)
  })
})
