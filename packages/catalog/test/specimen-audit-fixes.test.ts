// Defects found by the specimen audit (docs/evidence/specimen-audit.md), pinned in the reviewed styles.
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import postcss from 'postcss'

const read = (file: string) => fs.readFileSync('packages/catalog/src/styles/' + file, 'utf8')

/** Declarations of the first top-level rule (outside @media) whose selector list contains `selector`. */
function declarations(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {}
  postcss.parse(css).walkRules(rule => {
    if (rule.parent?.type === 'atrule') return
    if (!rule.selectors.map(item => item.replaceAll('"', "'")).includes(selector)) return
    rule.walkDecls(decl => { out[decl.prop] = decl.value })
  })
  return out
}
const px = (value: string) => {
  const rem = /^([\d.]+)rem$/.exec(value)
  return rem ? Number(rem[1]) * 16 : Number.parseFloat(value)
}

describe('focus rings contrast with the surface they are drawn on', () => {
  it('neo-brutalism Accordion draws its inset ring in the trigger text colour', () => {
    expect(declarations(read('accordion/neo-brutalism.css'), "[data-slot='accordion-trigger']:focus-visible").outline)
      .toBe('3px dashed currentColor')
  })

  it('neo-brutalism Dialog close draws its ring inside itself, in its own text colour', () => {
    // The surface behind the button varies (the yellow title bar or the dialog body), so the ring stays on the button.
    const rule = declarations(read('neo-brutalism.css'), "[data-slot='dialog-close']:focus-visible")
    expect(rule['outline-color']).toBe('currentColor')
    expect(rule['outline-offset']).toBe('-6px')
  })
})

describe('neo-brutalism Radio Group', () => {
  it('draws the item ring in the text colour of the option under it', () => {
    const css = read('radio-group/neo-brutalism.css')
    expect(declarations(css, "[data-slot='radio-group-item']:focus-visible").outline).toBe('3px dashed var(--foreground)')
    // Only a checked option is filled with --secondary, so only there does the ring take its foreground;
    // a bare checked item sits on the page and keeps the foreground ring.
    expect(declarations(css, "[data-slot='radio-group-item'][data-state='checked']:focus-visible")['outline-color']).toBeUndefined()
    expect(declarations(css, "[data-slot='radio-group-option']:has([data-slot='radio-group-item'][data-state='checked']) [data-slot='radio-group-item']:focus-visible")['outline-color'])
      .toBe('var(--secondary-foreground)')
  })
})

describe('scrolling Toast viewports hold their toast shadow', () => {
  // Reach below the toast of `0 16px 36px -14px` is 16 + 36 - 14 = 38px; sideways 36 - 14 = 22px.
  it.each([['flat', 38, 22], ['minimalist', 34, 18]])('%s viewport padding covers the shadow reach', (family, below, side) => {
    const viewport = declarations(read(`toast/${family}.css`), "[data-slot='toast-viewport']")
    const [top, inline, bottom = top] = viewport.padding!.split(/\s+/).map(px)
    expect(bottom).toBeGreaterThanOrEqual(below)
    expect(inline).toBeGreaterThanOrEqual(side)
  })
})

describe('liquid glass Progress', () => {
  it('keeps the indicator glow inside the clipped track', () => {
    const css = read('progress/liquid-glass.css')
    for (const selector of ["[data-slot='progress-indicator']", "[data-slot='progress-indicator'][data-state='complete']"])
      expect(declarations(css, selector)['box-shadow']).toMatch(/^inset /)
  })
})

describe('highlighted list and menu items show a 3:1 indicator', () => {
  it.each(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])('%s Select and Dropdown Menu items carry a 3:1 indicator', family => {
    for (const [file, selector] of [['select', "[data-slot='select-item'][data-highlighted]"], ['dropdown-menu', "[data-slot='dropdown-menu-item'][data-highlighted]"]]) {
      const rule = declarations(read(`${file}/${family}.css`), selector)
      if (family === 'ombelle') {
        // Ombelle fills the item with its primary pink, which reaches 3:1 against the menu on its own; the
        // transparent outline only shows in forced colors, where the fill is gone.
        expect(rule.background, `${file}/${family}`).toBe('var(--primary)')
        expect(rule.outline, `${file}/${family}`).toBe('2px solid transparent')
      } else {
        // Liquid glass draws every focus indicator in ink rather than the blue ring.
        expect(rule.outline, `${file}/${family}`).toBe(family === 'liquid-glass' ? '2px solid var(--foreground)' : '2px solid var(--ring)')
      }
      expect(rule['outline-offset'], `${file}/${family}`).toBe('-2px')
    }
  })
})

describe('liquid glass focus', () => {
  // A thin ink ring that hugs the control: no blue, no gap (user decision, 9 November 2026).
  const files = [...fs.readdirSync('packages/catalog/src/styles', { recursive: true }) as string[]]
    .map(file => file.replaceAll('\\', '/')).filter(file => /(^|\/)liquid-glass(-lab)?\.css$/.test(file))
  it.each(files)('%s draws focus as a 2px ink ring with no gap', file => {
    const css = read(file)
    expect(css).not.toContain('var(--ring)')
    postcss.parse(css).walkRules(rule => {
      if (!rule.selector.includes(':focus-visible') || rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).params.includes('forced-colors')) return
      // `none` is allowed where a wrapper draws the ring through :focus-within (Input Group).
      rule.walkDecls('outline', decl => expect(['2px solid var(--foreground)', 'none'], `${file} ${rule.selector}`).toContain(decl.value))
      rule.walkDecls('outline-offset', decl => expect(Number.parseFloat(decl.value), `${file} ${rule.selector}`).toBeLessThanOrEqual(0))
    })
  })
})

describe('Field preview control in forced colors', () => {
  // A family whose focus style removes the outline must draw one back in forced colors, where borders lose their colour.
  it.each(['flat', 'liquid-glass', 'minimalist', 'neo-brutalism', 'ombelle'])('%s draws a visible focus outline', family => {
    let outline = ''
    postcss.parse(read(`field/${family}.css`)).walkAtRules('media', media => {
      if (!media.params.includes('forced-colors')) return
      media.walkRules(rule => {
        if (rule.selector.replaceAll('"', "'") === "[data-slot='field'] [data-field-input]:focus-visible")
          rule.walkDecls('outline', decl => { outline = decl.value })
      })
    })
    expect(outline).toMatch(/^[1-9]\d*px solid Highlight$/)
  })
})

describe('Field preview control matches the board', () => {
  it('flat draws the filled Input: muted fill, underline, square bottom corners', () => {
    const rule = declarations(read('field/flat.css'), "[data-slot='field'] [data-field-input]")
    expect([rule.background, rule.border, rule['border-bottom'], rule['border-radius']])
      .toEqual(['var(--muted)', '0', '2px solid var(--input)', 'var(--radius) var(--radius) 0 0'])
  })
})

describe('display components match the 0.7.3 boards', () => {
  const families = ['flat', 'liquid-glass', 'minimalist', 'neo-brutalism', 'ombelle']
  it.each(families)('%s Stepper titles are bold in every state', family => {
    expect(declarations(read(`stepper/${family}.css`), "[data-slot='stepper-title']")['font-weight']).toBe('700')
    expect(declarations(read(`stepper/${family}.css`), "[data-slot='stepper-title'][data-status='current']")['font-weight']).toBeUndefined()
  })
  it.each(families)('%s complete Stepper indicator keeps the line border', family => {
    expect(declarations(read(`stepper/${family}.css`), "[data-slot='stepper-indicator'][data-status='complete']")['border-color']).toBeUndefined()
  })
  it('neo-brutalism Empty title is black weight', () => {
    expect(declarations(read('empty/neo-brutalism.css'), "[data-slot='empty-title']")['font-weight']).toBe('900')
  })
  it('neo-brutalism Meter value is uppercase and tracked like its label', () => {
    const rule = declarations(read('meter/neo-brutalism.css'), "[data-slot='meter-value']")
    expect([rule['text-transform'], rule['letter-spacing']]).toEqual(['uppercase', '0.05em'])
  })
})

describe('form controls show focus where the audit measures it', () => {
  const families = ['flat', 'liquid-glass', 'minimalist', 'neo-brutalism', 'ombelle']
  const forcedRule = (css: string, selector: string) => {
    let outline: string | undefined
    postcss.parse(css).walkAtRules('media', media => {
      if (!media.params.includes('forced-colors')) return
      media.walkRules(rule => { if (rule.selectors.map(item => item.replaceAll('"', "'")).includes(selector)) rule.walkDecls('outline', decl => { outline = decl.value }) })
    })
    return outline
  }
  const ringed = "[data-slot='input-otp']:has([data-input-otp]:focus-visible)"
  it.each(families)('%s rings the whole Radix code while its shared input has focus', family => {
    const css = read(`input-otp/${family}.css`)
    expect(declarations(css, ringed).outline).toMatch(/^[1-9][\d.]*px (solid|dashed) /)
    expect(forcedRule(css, ringed)).toBe('2px solid Highlight')
  })
  it('minimalist Base UI code slots draw a ring, not only a thicker underline', () => {
    expect(declarations(read('input-otp/minimalist.css'), "[data-slot='input-otp-slot']:focus").outline).toMatch(/^[1-9][\d.]*px solid /)
  })
  it('minimalist Toggle Group items draw a 2px ring', () => {
    expect(declarations(read('toggle-group/minimalist.css'), "[data-slot='toggle-group-item']:focus-visible").outline).toBe('2px solid currentColor')
  })
  it.each(families.filter(family => family !== 'liquid-glass'))('%s remove buttons ring in the tag text colour', family => {
    expect(declarations(read(`tag-input/${family}.css`), "[data-slot='tag-input-remove']:focus-visible").outline).toMatch(/currentColor$/)
    expect(declarations(read(`chip/${family}.css`), "[data-slot='chip-remove']:focus-visible").outline).toMatch(/currentColor$/)
  })
  it('minimalist Slider thumb draws its edge inside, so Base UI\'s range input fits', () => {
    const thumb = declarations(read('slider/minimalist.css'), "[data-slot='slider-thumb']")
    expect([thumb.border, thumb['box-shadow']]).toEqual(['0', 'inset 0 0 0 1px var(--foreground)'])
  })
})

describe('form controls match the 0.7.3 boards', () => {
  const families = ['flat', 'liquid-glass', 'minimalist', 'neo-brutalism', 'ombelle']
  it.each(families)('%s remove buttons are round', family => {
    expect(declarations(read(`tag-input/${family}.css`), "[data-slot='tag-input-remove']")['border-radius']).toBe('50%')
    expect(declarations(read(`chip/${family}.css`), "[data-slot='chip-remove']")['border-radius']).toBe('50%')
  })
  it('minimalist Slider track and range keep the board radius', () => {
    expect(declarations(read('slider/minimalist.css'), "[data-slot='slider-track']")['border-radius']).toBe('4px')
    expect(declarations(read('slider/minimalist.css'), "[data-slot='slider-range']")['border-radius']).toBe('4px')
  })
})

describe('minimalist round remove buttons', () => {
  it('draw a 2px ring: a 1px ring on a round 24px button falls below 3:1 at the edges', () => {
    expect(declarations(read('tag-input/minimalist.css'), "[data-slot='tag-input-remove']:focus-visible").outline).toBe('2px solid currentColor')
    expect(declarations(read('chip/minimalist.css'), "[data-slot='chip-remove']:focus-visible").outline).toBe('2px solid currentColor')
  })
})

describe('the 0.7.3 overlays match their boards', () => {
  const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'] as const
  it.each(families)('%s marks the matched text with an underline in the board colour', family => {
    const mark = declarations(read(`combobox/${family}.css`), "[data-slot='combobox-match']")
    expect(mark['text-decoration-color']).toBe(family === 'minimalist' ? 'var(--foreground)' : 'var(--primary)')
    expect(mark['text-decoration-thickness']).toBe(family === 'minimalist' ? '1px' : '2px')
  })

  it.each(families)('%s draws the create row in the board colour and weight', family => {
    const create = declarations(read(`combobox/${family}.css`), "[data-slot='combobox-create']")
    expect([create.color, create['font-weight']]).toEqual(family === 'neo-brutalism' ? ['var(--foreground)', '800'] : ['var(--accent-foreground)', '600'])
  })

  it.each(families)('%s rounds the command like its popover and pads the hover card 16px', family => {
    expect(declarations(read(`command/${family}.css`), "[data-slot='command']")['border-radius'])
      .toBe(declarations(read(`popover/${family}.css`), "[data-slot='popover-content']")['border-radius'])
    const card = declarations(read(`hover-card/${family}.css`), "[data-slot='hover-card-content']")
    expect([card.padding, card.gap]).toEqual(['1rem', '0.625rem'])
  })

  it('draws the context menu zone per family', () => {
    const zone = (family: string) => declarations(read(`context-menu/${family}.css`), "[data-slot='context-menu-trigger'][data-variant='zone']")
    expect(zone('neo-brutalism')).toMatchObject({ border: '2.5px dashed var(--border)', background: 'var(--card)' })
    expect(zone('minimalist').background).toBe('transparent')
    expect(zone('liquid-glass').background).toBe('rgb(255 255 255 / 0.06)')
    expect(zone('ombelle').background).toBe('var(--muted)')
  })
})

describe('the 0.7.3 calendar', () => {
  it('minimalist draws a 2px day ring close to the day, so neighbouring days do not hide it', () => {
    const ring = declarations(read('calendar/minimalist.css'), "[data-slot='calendar-day-button']:focus-visible")
    expect([ring.outline, ring['outline-offset']]).toEqual(['2px solid var(--ring)', '1px'])
  })
})

describe('the 0.7.3 batch 6a variants', () => {
  const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
  it.each(families)('%s mixes destructive text with the foreground, so neo-brutalism light passes 4.5:1', family => {
    const mix = 'color-mix(in oklab, var(--destructive) 65%, var(--foreground))'
    expect(declarations(read(`${family}.css`), "[data-slot='button'][data-variant='link-destructive']").color).toBe(mix)
    const outline = family === 'liquid-glass' ? ":not(:root)" : ''
    expect(declarations(read(`badge/${family}.css`), `[data-slot='badge'][data-appearance='outline'][data-variant='destructive']${outline}`).color).toBe(mix)
  })

  // Liquid glass keeps its 2px foreground ring (see 'liquid glass focus').
  it.each(families.filter(family => family !== 'liquid-glass'))('%s rings the Alert Dismiss button in its text colour, which contrasts with every intent surface', family => {
    expect(declarations(read(`alert/${family}.css`), "[data-slot='alert-dismiss']:focus-visible").outline).toBe('2px solid currentColor')
  })
})

describe('the 0.7.3 card options', () => {
  it('neo-brutalism rings a focused option with a solid line close to it, which its drop shadow cannot break up', () => {
    const ring = declarations(read('card/neo-brutalism.css'), "[data-slot='card-option']:has(:focus-visible)")
    expect([ring.outline, ring['outline-offset']]).toEqual(['3px solid var(--ring)', '2px'])
  })
})

describe('the 0.7.3 batch 6b and 6c variants', () => {
  const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
  it.each(families)('%s lets a toast stack overflow its viewport, so peeking toasts keep their shadows', family => {
    expect(declarations(read(`toast/${family}.css`), "[data-slot='toast-viewport'][data-stack]").overflow).toBe('visible')
  })
  it.each(families)('%s keeps a text item icon inside its box', family => {
    expect(declarations(read(`select/${family}.css`), "[data-slot='select-item-icon']")).toMatchObject({ overflow: 'hidden', 'font-size': '0.625rem' })
  })
  it.each(families)('%s rings a focused resize grip inside its edge', family => {
    const ring = declarations(read(`sheet/${family}.css`), "[data-slot='sheet-resize-handle']:focus-visible")
    expect(ring.outline).toMatch(/^2(\.5)?px /)
    expect(ring['outline-offset']).toBe('-2px')
  })
  it('minimalist widens the Close ring of a top or bottom sheet, whose content height can set its edge between pixels', () => {
    const ring = declarations(read('sheet/minimalist.css'), "[data-slot='sheet-dismiss']:is([data-side='bottom'] > *, [data-side='top'] > *):focus-visible")
    expect(ring['outline-width']).toBe('2px')
  })
  it('neo-brutalism writes a sorted header and its ring in the yellow header\'s own text colour', () => {
    const css = read('table/neo-brutalism.css')
    expect(declarations(css, "[data-slot='table-sort']:is([aria-sort] > *)").color).toBe('inherit')
    expect(declarations(css, "[data-slot='table-sort']:focus-visible").outline).toContain('var(--primary-foreground)')
  })
  it('minimalist rings a sort button inside itself, since its first column has no inline padding and the container clips', () => {
    const ring = declarations(read('table/minimalist.css'), "[data-slot='table-sort']:focus-visible")
    expect([ring.outline, ring['outline-offset']]).toEqual(['1px solid var(--ring)', '-1px'])
  })
  it('liquid glass blurs the rows that scroll under its translucent sticky header', () => {
    // Inside the family's @supports fallback, as every glass backdrop-filter is.
    const css = read('table/liquid-glass.css').replace(/\s+/g, ' ')
    expect(css).toContain("@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { [data-slot='table-head']:is([data-table-sticky] *) { -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); } @media (prefers-reduced-transparency: reduce), (forced-colors: active) { [data-slot='table-head']:is([data-table-sticky] *) { -webkit-backdrop-filter: none; backdrop-filter: none; } } }")
  })
  it('minimalist gives a sticky header a surface and keeps its rule while the rows scroll', () => {
    const sticky = declarations(read('table/minimalist.css'), "[data-slot='table-head']:is([data-table-sticky] *)")
    expect(sticky.background).toBe('var(--card)')
    expect(sticky['box-shadow']).toMatch(/^inset 0 -1px 0 var\(--foreground\), 0 6px 6px -6px /)
  })
  it.each(families)('%s casts the sticky header shadow downwards only', family => {
    expect(declarations(read(`table/${family}.css`), "[data-slot='table-head']:is([data-table-sticky] *)")['box-shadow']).toMatch(/(^|, )0 6px 6px -6px /)
  })
})

describe('the 0.7.5 primitives', () => {
  const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
  it.each(families)('%s Collapsible keeps the open chevron turned under reduced motion, so open and closed stay apart', family => {
    // Reduced motion removes the transition only: the end state is information.
    postcss.parse(read(`collapsible/${family}.css`)).walkAtRules('media', media => {
      if (!/prefers-reduced-motion/.test(media.params)) return
      media.walkDecls('rotate', () => { throw new Error('a reduced-motion rule resets the chevron rotation') })
    })
    expect(declarations(read(`collapsible/${family}.css`), "[data-slot='collapsible-icon']:is([data-state='open'] > *)").rotate).toBe('180deg')
  })
  describe('Scroll Area bottom fade', () => {
    // The boards fade the last 28px into the card while more content waits below, and not at the end or when nothing scrolls.
    const fade = (family: string) => {
      let found: Record<string, string> | undefined
      postcss.parse(read(`scroll-area/${family}.css`)).walkRules(rule => {
        // The base rule, not the one inside the reduced-motion block.
        if (!found && rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).name === 'supports' && rule.selectors.includes("[data-slot='scroll-area-viewport']::after")) {
          found = {}
          rule.walkDecls(decl => { found![decl.prop] = decl.value })
        }
      })
      return found
    }
    it.each(['flat', 'minimalist', 'neo-brutalism', 'ombelle'])('%s fades the viewport end into the card without catching the pointer', family => {
      expect(fade(family)).toMatchObject({
        position: 'sticky', 'inset-block-end': '0', 'block-size': '28px', 'margin-block-start': '-28px', 'pointer-events': 'none', opacity: '0',
        // A consumer whose area sits on another surface sets --scroll-area-fade to that surface's colour.
        background: 'linear-gradient(to bottom, transparent, var(--scroll-area-fade, var(--card)))',
      })
      const css = read(`scroll-area/${family}.css`).replace(/\s+/g, ' ')
      expect(css).toContain('animation-timeline: scroll(nearest block)')
      expect(css).toContain('animation-range: calc(100% - 28px) 100%')
    })
    it('liquid glass has no fade, as on its board', () => {
      expect(fade('liquid-glass')).toBeUndefined()
    })
  })
  it.each(families)('%s Button Group falls back to 1px wherever it reads --border-width, as the -1px join margin does', family => {
    expect(read(`button-group/${family}.css`)).not.toMatch(/var\(--border-width\)/)
  })
  it.each([['ombelle', '999px'], ['neo-brutalism', 'var(--radius)']])('%s Button Group casts one shadow for the whole group, as its board does, and takes it off the buttons', (family, radius) => {
    const css = read(`button-group/${family}.css`)
    const group = declarations(css, "[data-slot='button-group']")
    expect(group['box-shadow']).toBe('var(--shadow-x) var(--shadow-y) 0 var(--shadow-color, var(--border))')
    expect(group['border-radius']).toBe(radius)
    // A button's own shadow and hover lift would split the group's shadow at the joins.
    const button = "[data-slot='button-group'][data-orientation] > :is(button, a, [role='button'])"
    expect(declarations(css, button)).toMatchObject({ 'box-shadow': 'none', transform: 'none' })
    expect(declarations(css, `${button}:not(:disabled):is(:hover, :active)`)).toMatchObject({ 'box-shadow': 'none', transform: 'none' })
  })
  describe('board comparison, measured on the audit page against the 0.7.5 boards', () => {
    it('minimalist draws Collapsible, Scroll Area and outline Item edges in the strong line colour of the board (--input) and rounds Toggle and Collapsible to 4px', () => {
      expect(declarations(read('collapsible/minimalist.css'), "[data-slot='collapsible']")).toMatchObject({ border: '1px solid var(--input)', 'border-radius': '4px' })
      expect(declarations(read('scroll-area/minimalist.css'), "[data-slot='scroll-area']").border).toBe('1px solid var(--input)')
      expect(declarations(read('item/minimalist.css'), "[data-slot='item'][data-variant='outline']")['border-color']).toBe('var(--input)')
      expect(declarations(read('item/minimalist.css'), "[data-slot='item-media'][data-variant='image']").border).toBe('1px solid var(--input)')
      expect(declarations(read('toggle/minimalist.css'), "[data-slot='toggle']")['border-radius']).toBe('4px')
    })
    it('flat rounds Toggle and Collapsible to 10px and Item media to 12px, and sets the Item title at 800', () => {
      expect(declarations(read('toggle/flat.css'), "[data-slot='toggle']")['border-radius']).toBe('10px')
      expect(declarations(read('collapsible/flat.css'), "[data-slot='collapsible']")['border-radius']).toBe('10px')
      expect(declarations(read('item/flat.css'), "[data-slot='item-media'][data-variant='image']")['border-radius']).toBe('12px')
      expect(declarations(read('item/flat.css'), "[data-slot='item-title']")['font-weight']).toBe('800')
    })
    it('neo-brutalism leaves the Collapsible without a shadow, as on its board', () => {
      expect(declarations(read('collapsible/neo-brutalism.css'), "[data-slot='collapsible']")['box-shadow']).toBeUndefined()
    })
  })
  it.each([['flat', 'var(--primary)'], ['minimalist', 'var(--input)'], ['ombelle', 'var(--border)'], ['neo-brutalism', 'var(--border)'], ['liquid-glass', 'var(--input)']])('%s Button Group rules between outline buttons in the colour of their edge, not the primary mix', (family, colour) => {
    const css = read(`button-group/${family}.css`)
    expect(declarations(css, "[data-slot='button-group-separator']").background).toMatch(/color-mix\(in srgb, var\(--primary-foreground\) 45%, var\(--primary\)\)/)
    expect(declarations(css, "[data-slot='button-group-separator']:is([data-variant='outline'] + *)").background).toBe(colour)
  })
  it.each(['ombelle', 'neo-brutalism'])('%s Button Group casts no shadow behind ghost or link buttons, which cast none themselves', family => {
    // A group of quiet buttons (the site's History group) would otherwise show a shadow band with no edge in front of it.
    expect(declarations(read(`button-group/${family}.css`), "[data-slot='button-group']:has(> [data-variant='ghost'], > [data-variant='link'])"))
      .toEqual({ 'box-shadow': 'none' })
  })
  it('ombelle vertical Button Group shadow follows the corners of the end buttons, not half the group width', () => {
    expect(declarations(read('button-group/ombelle.css'), "[data-slot='button-group'][data-orientation='vertical']")['border-radius']).toBe('calc(var(--control-height) / 2)')
  })
})

describe('editor inputs board comparison, measured on the edition pages against the 0.7.5 boards', () => {
  const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'] as const
  it.each(families)('%s pads the Color Picker popover by 14px and sets its format value at weight 500 with 14px sides', family => {
    const css = read(`color-picker/${family}.css`)
    expect(declarations(css, "[data-slot='color-picker-content']").padding).toBe('0.875rem')
    expect(declarations(css, "[data-slot='color-picker-value']")).toMatchObject({ 'font-weight': '500', 'padding-inline': '0.875rem' })
  })
  it.each([['minimalist', 'var(--radius)'], ['neo-brutalism', '0'], ['ombelle', '999px'], ['flat', '999px'], ['liquid-glass', '999px']])('%s rounds the hue track like the board (%s)', (family, radius) => {
    expect(declarations(read(`color-picker/${family}.css`), "[data-slot='color-picker-hue']")['border-radius']).toBe(radius)
  })
  it('flat draws 1px edges on the picker parts, and boxes the trigger row and Number Input with a 10px radius, as its board', () => {
    const css = read('color-picker/flat.css')
    for (const slot of ['color-picker-preview', 'color-picker-area', 'color-picker-hue', 'color-picker-swatch'])
      expect(declarations(css, `[data-slot='${slot}']`)['border-width'] ?? declarations(css, `[data-slot='${slot}']`).border, slot).toMatch(/^1px/)
    expect(declarations(css, "[data-slot='color-picker-trigger']")).toMatchObject({ border: '1px solid var(--border)', 'border-radius': '10px' })
    expect(declarations(read('number-input/flat.css'), "[data-slot='number-input']")).toMatchObject({ border: '1px solid var(--border)', 'border-radius': '10px' })
  })
})
