import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as React from 'react'
import { Children, cloneElement, createElement as h, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const source = (file: string) => readFileSync(new URL(`../src/templates/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const shared = (text: string) => text.slice(text.indexOf('// sheet size hook'), text.indexOf('// end sheet size hook'))
const block = (family: string) => {
  const css = readFileSync(new URL(`../src/styles/sheet/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  return css.slice(css.indexOf('/* 0.7.3 variants */'))
}

describe('Sheet 0.7.3 variants', () => {
  it('shares one size hook between the editions, as identical text', () => {
    const radix = shared(source('sheet.tsx')), base = shared(source('base/sheet.tsx'))
    expect(radix.length).toBeGreaterThan(200)
    expect(base).toBe(radix)
  })

  it.each(['sheet.tsx', 'base/sheet.tsx'])('%s names both handles and bounds their values', file => {
    const text = source(file)
    expect(text).toContain('aria-label={label}')
    expect(text).toMatch(/label = 'Resize sheet'/)
    expect(text).toMatch(/label = 'Resize panel'|'Resize panel'/)
    // Without snap points the bottom handle runs from 25 to 95; with them, from the lowest point to the highest.
    expect(text).toContain(': [25, 95]')
    expect(text).toMatch(/aria-valuemin=\{min\}/)
    expect(text).toMatch(/aria-valuemax=\{max\}/)
    expect(text).toMatch(/defaultSize = 320/)
    expect(text).toMatch(/minSize = 240/)
    expect(text).toMatch(/maxSize = 640/)
    expect(text).toContain('data-slot="sheet-handle"')
    expect(text).toContain('data-slot="sheet-resize-handle"')
  })

  it.each(families)('%s draws the bottom handle as a pill in a 24px target, and the resize grip on hover and focus', family => {
    const css = block(family)
    expect(css).toMatch(/\[data-slot='sheet-handle'\]\s*\{[^}]*block-size: 1\.5rem/)
    expect(css).toMatch(/\[data-slot='sheet-handle'\]::before\s*\{[^}]*inline-size: 2\.5rem/)
    expect(css).toMatch(/\[data-slot='sheet-resize-handle'\]\s*\{[^}]*inline-size: 0\.5rem/)
    expect(css).toMatch(/\[data-slot='sheet-resize-handle'\]:is\(:hover, :focus-visible\)::before/)
    expect(css).toMatch(/\[data-slot='sheet-content'\]:has\(\[data-sheet-dragging\]\)\s*\{[^}]*transition: none/)
  })
})

// Renders an open SheetContent without its portal, which needs a browser: the Radix panel inside the
// dialog's context, and the Base UI popup inside the portal context that Dialog.Portal would provide.
const openSheet = async (edition: 'radix' | 'base', props: Record<string, unknown>) => {
  if (edition === 'radix') {
    const ui = await import('../src/templates/sheet.js')
    const portal = ui.SheetContent(props as never) as ReactElement<{ children: React.ReactNode }>
    const panel = Children.toArray(portal.props.children)[1] as ReactElement<{ forceMount?: true }>
    return renderToStaticMarkup(h(ui.Sheet, { defaultOpen: true }, cloneElement(panel, { forceMount: true })))
  }
  const ui = await import('../src/templates/base/sheet.js')
  const entry = import.meta.resolve('@base-ui/react/dialog')
  const { DialogPortalContext } = await import(/* @vite-ignore */ new URL('./portal/DialogPortalContext.mjs', entry).href) as
    { DialogPortalContext: React.Context<boolean | undefined> }
  const Inner = () => {
    const portal = ui.SheetContent(props as never) as ReactElement<{ children: React.ReactNode }>
    return h(DialogPortalContext.Provider, { value: true }, Children.toArray(portal.props.children)[1])
  }
  return renderToStaticMarkup(h(ui.Sheet, { defaultOpen: true }, h(Inner)))
}
const content = (html: string) => html.match(/<[^>]*data-slot="sheet-content"[^>]*>/)?.[0] ?? ''

describe('Sheet 0.7.6 snap points', () => {
  it.each(['radix', 'base'] as const)('%s exports nearestSnapPoint and snapPointText', async edition => {
    const ui = edition === 'radix' ? await import('../src/templates/sheet.js') : await import('../src/templates/base/sheet.js')
    expect(ui.nearestSnapPoint(60, [0.5, 0.9])).toBe(0.5)
    expect(ui.nearestSnapPoint(70, [0.5, 0.9])).toBe(0.9)
    expect(ui.nearestSnapPoint(41.5, [0.33, 0.5, 0.9])).toBe(0.5)
    expect(ui.snapPointText(0.5, [0.5, 0.9])).toBe('Half height')
    expect(ui.snapPointText(0.9, [0.5, 0.9])).toBe('Full height')
    expect(ui.snapPointText(0.33, [0.33, 0.5, 0.9])).toBe('33%')
    expect(ui.snapPointText(0.8, [0.5, 0.8])).toBe('80%')
  })

  it('keeps the snap logic inside the shared size hook', () => {
    const radix = shared(source('sheet.tsx'))
    expect(radix).toContain('export function nearestSnapPoint')
    expect(radix).toContain('export function snapPointText')
    expect(shared(source('base/sheet.tsx'))).toBe(radix)
  })

  it.each(['radix', 'base'] as const)('%s opens a bottom snap sheet at its first point', async edition => {
    const tag = content(await openSheet(edition, { side: 'bottom', snapPoints: [0.5, 0.9], children: 'x' }))
    expect(tag).toContain('data-sheet-snap=""')
    expect(tag).toMatch(/style="[^"]*--sheet-size:50vh;block-size:50vh/)
    // Sorted and kept within 0.25..0.95: the first point of [0.9, 0.1] is 0.25.
    expect(content(await openSheet(edition, { side: 'bottom', snapPoints: [0.9, 0.1], children: 'x' }))).toMatch(/block-size:25vh/)
  })

  it.each(['radix', 'base'] as const)('%s ignores snap points on a side sheet', async edition => {
    const tag = content(await openSheet(edition, { side: 'inline-end', snapPoints: [0.5, 0.9], children: 'x' }))
    expect(tag).not.toContain('data-sheet-snap')
    expect(tag).not.toContain('block-size')
    expect(tag).not.toContain('snapPoints')
  })

  it.each(['radix', 'base'] as const)('%s renders a sheet without snap points as 0.7.5 did', async edition => {
    expect(await openSheet(edition, { side: 'bottom', children: 'x' })).toBe(unsnapped[edition])
  })

  it.each(families)('%s settles on a snap point with a transition, only when motion is allowed', family => {
    const css = readFileSync(new URL(`../src/styles/sheet/${family}.css`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const rules = css.match(/\/\* 0\.7\.6 variants \*\/([^]*?)\/\* end 0\.7\.6 variants \*\//)?.[1] ?? ''
    expect(rules).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\[data-slot='sheet-content'\]\[data-sheet-snap\]:not\(:has\(\[data-sheet-dragging\]\)\) \{[^}]*transition: block-size 200ms/)
    expect(rules.replace(/@media \(prefers-reduced-motion: no-preference\) \{[^]*?\n\}/, '')).not.toContain('transition')
  })
})

// An open bottom sheet without snap points, as the Task 1 commit (db22321b) renders it.
const unsnapped: Record<'radix' | 'base', string> = {
  radix: '<div role="dialog" id="radix-_R_0_" data-state="open" data-slot="sheet-content" data-side="bottom" data-size="default" class="" tabindex="-1">x'
    + '<button type="button" data-slot="sheet-dismiss" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button></div>',
  base: '<span data-type="inside" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:0;position:fixed;top:0;left:0" aria-hidden="true" tabindex="0" data-base-ui-focus-guard=""></span>'
    + '<div data-open="" id="_R_0_" role="dialog" tabindex="-1" data-base-ui-focusable="" style="--nested-dialogs:0" data-slot="sheet-content" data-side="bottom" data-size="default" data-state="open">x'
    + '<button type="button" tabindex="0" data-slot="sheet-dismiss" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></button></div>'
    + '<span data-type="inside" style="clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:0;position:fixed;top:0;left:0" aria-hidden="true" tabindex="0" data-base-ui-focus-guard=""></span>',
}
