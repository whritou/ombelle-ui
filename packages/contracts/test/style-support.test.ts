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

const glassExperimental = ['accordion', 'alert', 'avatar', 'button', 'badge', 'card', 'checkbox', 'dialog', 'dropdown-menu', 'input', 'label', 'native-select', 'popover', 'progress', 'radio-group', 'select', 'separator', 'skeleton', 'switch', 'table', 'tabs', 'textarea', 'tooltip', 'input-group', 'sheet', 'alert-dialog', 'breadcrumb', 'pagination', 'toast']
const glassUnavailable: string[] = []

describe('style support table', () => {
  it('lists ombelle as the fourth stable family and widens styleFamilies', () => {
    expect(supportedStyleFamilies).toEqual(['flat', 'minimalist', 'neo-brutalism', 'ombelle'])
    expect(styleFamilies).toEqual(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])
  })
  it('returns a status for every component and family pair', () => {
    for (const family of styleFamilies)
      for (const id of supportedComponentIds)
        expect(['stable', 'experimental', 'unavailable']).toContain(styleSupport(id, family))
  })
  it('marks every component stable for the stable families', () => {
    for (const family of supportedStyleFamilies)
      for (const id of supportedComponentIds) expect(styleSupport(id, family)).toBe('stable')
  })
  it('splits liquid-glass into experimental and unavailable components', () => {
    expect(componentsWithStyleSupport('liquid-glass', ['experimental']).sort()).toEqual([...glassExperimental].sort())
    expect(componentsWithStyleSupport('liquid-glass', ['unavailable']).sort()).toEqual([...glassUnavailable].sort())
    expect(componentsWithStyleSupport('liquid-glass', ['stable'])).toEqual([])
    expect(componentsWithStyleSupport('flat', ['stable'])).toEqual([...supportedComponentIds])
  })
  it('marks ombelle stable for all twenty-nine components', () => {
    expect(supportedComponentIds).toHaveLength(29)
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
          message: expect.stringMatching(/^Progress is unavailable for liquid-glass\. Experimental liquid-glass components: alert, accordion, .*tooltip, input-group, sheet, alert-dialog, breadcrumb, pagination, toast\.$/),
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
