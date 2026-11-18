import { describe, it, expect, vi } from 'vitest'
import {
  supportedComponentIds,
  supportedStyleFamilies,
  styleFamilies,
  isStyleFamily,
  styleSupport,
  componentsWithStyleSupport,
  assertStyleAvailable,
  FoundationError,
} from '../src/index.js'

const glassExperimental = ['accordion', 'alert', 'avatar', 'button', 'badge', 'card', 'checkbox', 'dialog', 'dropdown-menu', 'input', 'label', 'native-select', 'popover', 'progress', 'radio-group', 'select', 'separator', 'skeleton', 'switch', 'table', 'tabs', 'textarea', 'tooltip', 'input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast', 'spinner', 'kbd', 'empty', 'field', 'meter', 'stepper', 'slider', 'toggle-group', 'chip', 'tag-input', 'input-otp', 'combobox', 'command', 'hover-card', 'context-menu', 'calendar', 'toggle', 'collapsible', 'scroll-area', 'button-group', 'item', 'number-input', 'color-picker', 'code-block', 'password-field', 'carousel', 'aspect-ratio', 'toolbar', 'prose', 'navigation-menu', 'sidebar', 'resizable', 'menubar']
const glassUnavailable: string[] = []

describe('style support table', () => {
  it('lists retro-futurism as the seventh stable family and widens styleFamilies', () => {
    expect(supportedStyleFamilies).toEqual(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism'])
    expect(styleFamilies).toEqual(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism', 'liquid-glass'])
  })

  it('marks retro-futurism stable for all fifty-eight components', () => {
    for (const id of supportedComponentIds) expect(styleSupport(id, 'retro-futurism')).toBe('stable')
    expect(isStyleFamily('retro-futurism')).toBe(true)
  })

  it('marks organic stable for all fifty-eight components', () => {
    for (const id of supportedComponentIds) expect(styleSupport(id, 'organic')).toBe('stable')
    expect(isStyleFamily('organic')).toBe(true)
  })
  it('marks papier stable for all fifty-eight components', () => {
    for (const id of supportedComponentIds) expect(styleSupport(id, 'papier')).toBe('stable')
    expect(isStyleFamily('papier')).toBe(true)
  })
  it('marks ombelle stable for all fifty-eight components', () => {
    expect(supportedComponentIds).toHaveLength(62)
    for (const id of supportedComponentIds) expect(styleSupport(id, 'ombelle')).toBe('stable')
  })
  it('recognises families', () => {
    expect(isStyleFamily('ombelle')).toBe(true)
    expect(isStyleFamily('liquid-glass')).toBe(true)
    expect(isStyleFamily('flat')).toBe(true)
    expect(isStyleFamily('constructor')).toBe(false)
  })
  it('accepts every component in liquid glass', () => {
    expect(() => assertStyleAvailable([...supportedComponentIds], 'liquid-glass')).not.toThrow()
  })
})

// No real family leaves a component unavailable now, so a synthetic one keeps the refusal covered.
describe('assertStyleAvailable with a synthetic family', () => {
  it('refuses the first unavailable component in input order', async () => {
    vi.resetModules()
    vi.doMock('../src/style-families.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/style-families.js')>()
      return {
        ...actual,
        styleSupport: (id: string, family: string) =>
          family !== 'liquid-glass' ? 'stable' : ['progress', 'skeleton'].includes(id) ? 'unavailable' : 'experimental',
      }
    })
    try {
      const support = await import('../src/style-support.js')
      const diagnostics = await import('../src/diagnostics.js')
      expect(() => support.assertStyleAvailable(['card', 'skeleton'], 'liquid-glass')).toThrow(diagnostics.FoundationError)
      expect(() => support.assertStyleAvailable(['card', 'progress', 'skeleton'], 'liquid-glass')).toThrow(
        expect.objectContaining({
          code: 'STYLE_UNAVAILABLE',
          message: expect.stringMatching(/^Progress is unavailable for liquid-glass\. Experimental liquid-glass components: alert, accordion, .*tooltip, input-group, sheet, alert-dialog, breadcrumb, pagination, toast, spinner, kbd, empty, field, meter, stepper, slider, toggle-group, chip, tag-input, input-otp, combobox, command, hover-card, context-menu, calendar, toggle, collapsible, scroll-area, button-group, item, number-input, color-picker, code-block, password-field, carousel, aspect-ratio, toolbar, prose, navigation-menu, sidebar, resizable, menubar.$/),
          path: '/componentIds',
          nextAction: 'Choose a stable family for this component or remove it.',
        }),
      )
      expect(support.componentsWithStyleSupport('liquid-glass', ['experimental'])).not.toContain('progress')
      expect(() => support.assertStyleAvailable(['button', 'card'], 'liquid-glass')).not.toThrow()
      expect(() => support.assertStyleAvailable(['progress', 'skeleton'], 'flat')).not.toThrow()
    } finally {
      vi.doUnmock('../src/style-families.js')
      vi.resetModules()
    }
  })
})
