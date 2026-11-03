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

const glassExperimental = ['button', 'badge', 'card', 'dialog', 'tabs', 'tooltip']
const glassUnavailable = ['checkbox', 'input', 'label', 'native-select', 'switch', 'textarea']

describe('style support table', () => {
  it('keeps the stable family list unchanged and widens styleFamilies', () => {
    expect(supportedStyleFamilies).toEqual(['flat', 'minimalist', 'neo-brutalism'])
    expect(styleFamilies).toEqual(['flat', 'minimalist', 'neo-brutalism', 'liquid-glass'])
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
  it('recognises families', () => {
    expect(isStyleFamily('liquid-glass')).toBe(true)
    expect(isStyleFamily('flat')).toBe(true)
    expect(isStyleFamily('constructor')).toBe(false)
  })
  it('refuses unavailable components in input order', () => {
    expect(() => assertStyleAvailable(['card', 'input'], 'liquid-glass')).toThrow(FoundationError)
    try {
      assertStyleAvailable(['card', 'label', 'input'], 'liquid-glass')
      expect.unreachable()
    } catch (error) {
      expect(error).toMatchObject({
        code: 'STYLE_UNAVAILABLE',
        message:
          'Label is unavailable for liquid-glass. Experimental liquid-glass components: button, badge, card, dialog, tabs, tooltip.',
        path: '/componentIds',
        nextAction: 'Choose a stable family for this component or remove it.',
      })
    }
    expect(() => assertStyleAvailable(['button', 'card'], 'liquid-glass')).not.toThrow()
    expect(() => assertStyleAvailable([...supportedComponentIds], 'flat')).not.toThrow()
  })
})
