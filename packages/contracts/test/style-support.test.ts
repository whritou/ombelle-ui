import { describe, it, expect } from 'vitest'
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

const glassExperimental = ['accordion', 'alert', 'avatar', 'button', 'badge', 'card', 'checkbox', 'dialog', 'dropdown-menu', 'input', 'label', 'native-select', 'popover', 'progress', 'radio-group', 'select', 'separator', 'skeleton', 'switch', 'table', 'tabs', 'textarea', 'tooltip']
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
  it('marks ombelle stable for all twenty-three components', () => {
    expect(supportedComponentIds).toHaveLength(23)
    for (const id of supportedComponentIds) expect(styleSupport(id, 'ombelle')).toBe('stable')
  })
  it('recognises families', () => {
    expect(isStyleFamily('ombelle')).toBe(true)
    expect(isStyleFamily('liquid-glass')).toBe(true)
    expect(isStyleFamily('flat')).toBe(true)
    expect(isStyleFamily('constructor')).toBe(false)
  })
  // No glass component is unavailable now; Task C4 replaces this refusal test.
  it.skip('refuses unavailable components in input order', () => {
    expect(() => assertStyleAvailable(['card', 'skeleton'], 'liquid-glass')).toThrow(FoundationError)
    try {
      assertStyleAvailable(['card', 'progress', 'skeleton'], 'liquid-glass')
      expect.unreachable()
    } catch (error) {
      expect(error).toMatchObject({
        code: 'STYLE_UNAVAILABLE',
        message:
          'Progress is unavailable for liquid-glass. Experimental liquid-glass components: alert, accordion, button, badge, avatar, card, checkbox, dialog, dropdown-menu, input, label, popover, native-select, radio-group, select, switch, separator, tabs, table, textarea, tooltip.',
        path: '/componentIds',
        nextAction: 'Choose a stable family for this component or remove it.',
      })
    }
    expect(() => assertStyleAvailable(['button', 'card'], 'liquid-glass')).not.toThrow()
    expect(() => assertStyleAvailable([...supportedComponentIds], 'flat')).not.toThrow()
  })
  it('accepts every component in liquid glass', () => {
    expect(() => assertStyleAvailable([...supportedComponentIds], 'liquid-glass')).not.toThrow()
  })
})
