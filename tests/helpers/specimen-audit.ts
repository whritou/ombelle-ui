// Measured checks for the specimen audit. Each returns findings; an empty list means the check passed.
// They measure rendered output only: no committed screenshots, no pixel baselines.
import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'

export type AuditCheck = 'overflow' | 'clipping' | 'spacing' | 'focus-visible' | 'target-size' | 'forced-colors' | 'axe'
export type Finding = { check: AuditCheck; target: string; detail: string }

/** Interactive elements that need a target size and a visible focus indicator. */
export const interactiveSelector = [
  'button', 'a[href]', 'input:not([type=hidden])', 'select', 'textarea', '[role=button]', '[role=tab]', '[role=checkbox]',
  '[role=switch]', '[role=radio]', '[role=menuitem]', '[role=menuitemcheckbox]', '[role=menuitemradio]', '[role=option]',
  '[role=combobox]', '[tabindex]:not([tabindex="-1"])',
].join(', ')

// Runs in the page: a short, stable description of an element for failure messages.
const describeSource = `(element) => {
  const slot = element.getAttribute('data-slot'), role = element.getAttribute('role')
  const name = (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30)
  return element.tagName.toLowerCase() + (slot ? '[data-slot="' + slot + '"]' : '') + (role ? '[role="' + role + '"]' : '') + (name ? ' "' + name + '"' : '')
}`

// Runs in the page: sr-only labels and focus proxies are 1×1 boxes that are never drawn as targets.
const hiddenSource = `(element) => {
  for (let current = element; current; current = current.parentElement) {
    const box = current.getBoundingClientRect()
    if (box.width <= 1 && box.height <= 1) return true
  }
  return false
}`

async function each(roots: Locator[], check: (root: Locator) => Promise<Finding[]>): Promise<Finding[]> {
  const findings: Finding[] = []
  for (const root of roots) for (const handle of await root.all()) findings.push(...await check(handle))
  return findings
}

/** Text pushed out of its slot, or content wider or taller than the box that holds it (the squeezed "Dismiss"). */
export function findOverflow(roots: Locator[]): Promise<Finding[]> {
  return each(roots, root => root.evaluate((root, [describeSource, hiddenSource]) => {
    const describe = new Function('return ' + describeSource)() as (element: Element) => string
    const hidden = new Function('return ' + hiddenSource)() as (element: Element) => boolean
    const findings: { check: 'overflow'; target: string; detail: string }[] = []
    const visible = (element: Element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden' && !hidden(element)
    const ellipsis = (element: Element | null) => {
      for (let current = element; current && current !== root.parentElement; current = current.parentElement)
        if (getComputedStyle(current).textOverflow === 'ellipsis') return true
      return false
    }
    for (const element of [root, ...root.querySelectorAll('*')]) {
      if (!(element instanceof HTMLElement) || !visible(element) || ellipsis(element)) continue
      const style = getComputedStyle(element)
      // Only a box that cuts its content can squeeze it; visible spill is judged by the text test below.
      const cuts = [style.overflowX, style.overflowY].some(value => value === 'hidden' || value === 'clip')
      if (cuts && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
        && element.clientWidth > 0 && style.display !== 'inline')
        findings.push({ check: 'overflow', target: describe(element),
          detail: `content ${element.scrollWidth}×${element.scrollHeight} exceeds box ${element.clientWidth}×${element.clientHeight}` })
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement
      // Text nodes inside SVG are never painted.
      if (!parent || parent.closest('svg') || !node.textContent?.trim() || !visible(parent) || ellipsis(parent)) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const text = range.getBoundingClientRect(), box = parent.getBoundingClientRect()
      if (text.left < box.left - 1 || text.right > box.right + 1 || text.top < box.top - 1 || text.bottom > box.bottom + 1)
        findings.push({ check: 'overflow', target: describe(parent), detail: `text "${node.textContent.trim().slice(0, 30)}" extends past its box` })
    }
    return findings
  }, [describeSource, hiddenSource] as const))
}

/** A label and its control must not touch: at least 4px apart, beside or above it. Labels wrapping their control are exempt. */
export function findSpacing(roots: Locator[]): Promise<Finding[]> {
  return each(roots, root => root.evaluate((root, describeSource) => {
    const describe = new Function('return ' + describeSource)() as (element: Element) => string
    const findings: { check: 'spacing'; target: string; detail: string }[] = []
    for (const label of root.querySelectorAll('label[for]')) {
      const control = document.getElementById(label.getAttribute('for')!)
      if (!control || label.contains(control) || control.getClientRects().length === 0 || label.getClientRects().length === 0) continue
      const a = label.getBoundingClientRect(), b = control.getBoundingClientRect()
      const gap = Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom)
      if (gap < 4)
        findings.push({ check: 'spacing', target: describe(label), detail: `${Math.max(0, Math.round(gap))}px from ${describe(control)}, 4px needed` })
    }
    return findings
  }, describeSource))
}

/** Shadows and outlines cut by an ancestor that clips (overflow, clip-path, contain: paint), up to `stop`. */
export async function findClipping(roots: Locator[], stop: Locator): Promise<Finding[]> {
  const stopHandle = await stop.elementHandle()
  return each(roots, root => root.evaluate((root, [stop, describeSource]) => {
    const describe = new Function('return ' + describeSource)() as (element: Element) => string
    const findings: { check: 'clipping'; target: string; detail: string }[] = []
    const px = (value: string) => Number.parseFloat(value) || 0
    function extents(style: CSSStyleDeclaration) {
      const out = { top: 0, right: 0, bottom: 0, left: 0 }
      if (style.boxShadow && style.boxShadow !== 'none')
        for (const shadow of style.boxShadow.split(/,(?![^(]*\))/)) {
          // Inset shadows stay inside the box; a shadow with alpha 0 paints nothing.
          if (/\binset\b/.test(shadow) || /rgba\([^)]*,\s*0\)|\/\s*0\)|transparent/.test(shadow)) continue
          const [x = 0, y = 0, blur = 0, spread = 0] = (shadow.replace(/rgba?\([^)]*\)|#[0-9a-f]+|oklch\([^)]*\)|color\([^)]*\)/gi, '').match(/-?[\d.]+px/g) ?? []).map(px)
          out.left = Math.max(out.left, blur + spread - x); out.right = Math.max(out.right, blur + spread + x)
          out.top = Math.max(out.top, blur + spread - y); out.bottom = Math.max(out.bottom, blur + spread + y)
        }
      if (style.outlineStyle !== 'none') {
        const ring = px(style.outlineWidth) + px(style.outlineOffset)
        for (const side of ['top', 'right', 'bottom', 'left'] as const) out[side] = Math.max(out[side], ring)
      }
      return out
    }
    for (const element of [root, ...root.querySelectorAll('*')]) {
      if (element.getClientRects().length === 0) continue
      const reach = extents(getComputedStyle(element))
      if (!reach.top && !reach.right && !reach.bottom && !reach.left) continue
      const box = element.getBoundingClientRect()
      for (let ancestor = element.parentElement; ancestor && ancestor !== document.body && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor)
        const clips = style.overflowX !== 'visible' || style.overflowY !== 'visible' || style.clipPath !== 'none' || /\b(paint|strict|content)\b/.test(style.contain)
        if (clips) {
          const outer = ancestor.getBoundingClientRect()
          const inner = { top: outer.top + px(style.borderTopWidth), left: outer.left + px(style.borderLeftWidth),
            bottom: outer.bottom - px(style.borderBottomWidth), right: outer.right - px(style.borderRightWidth) }
          // Content scrolled out of view is scrolling, not clipping: only a box that sits inside the clip is judged.
          const inside = box.top >= inner.top - 1 && box.left >= inner.left - 1 && box.bottom <= inner.bottom + 1 && box.right <= inner.right + 1
          const cut = { top: inner.top - (box.top - reach.top), left: inner.left - (box.left - reach.left),
            bottom: box.bottom + reach.bottom - inner.bottom, right: box.right + reach.right - inner.right }
          const worst = Math.max(cut.top, cut.left, cut.bottom, cut.right)
          if (inside && worst > 1)
            findings.push({ check: 'clipping', target: describe(element), detail: `shadow or outline cut by ${Math.round(worst)}px by ${describe(ancestor)}` })
        }
        if (ancestor === stop) break
      }
    }
    return findings
  }, [stopHandle, describeSource] as const))
}

/**
 * Interactive targets under 24×24 CSS px (WCAG 2.5.8), except links inside running text and undersized targets
 * that meet the spacing exception: a 24px circle centred on each intersects no other target or undersized circle.
 */
export function findTargetSize(roots: Locator[]): Promise<Finding[]> {
  return each(roots, root => root.evaluate((root, [selector, describeSource, hiddenSource]) => {
    const describe = new Function('return ' + describeSource)() as (element: Element) => string
    const hidden = new Function('return ' + hiddenSource)() as (element: Element) => boolean
    const findings: { check: 'target-size'; target: string; detail: string }[] = []
    const targets: { element: Element; box: DOMRect }[] = []
    for (const element of document.querySelectorAll(selector)) {
      if (element.getClientRects().length === 0 || hidden(element)) continue
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.pointerEvents === 'none' || element.closest('[aria-hidden="true"]')
        || element.matches(':disabled, [aria-disabled="true"]')) continue
      const inText = element.tagName === 'A' && element.parentElement?.tagName === 'P'
        && [...element.parentElement.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
      if (!inText) targets.push({ element, box: element.getBoundingClientRect() })
    }
    const small = (box: DOMRect) => box.width < 24 - 0.5 || box.height < 24 - 0.5
    const centre = (box: DOMRect) => [box.left + box.width / 2, box.top + box.height / 2] as const
    const circleHitsBox = (c: readonly [number, number], box: DOMRect) => {
      const dx = Math.max(box.left - c[0], 0, c[0] - box.right), dy = Math.max(box.top - c[1], 0, c[1] - box.bottom)
      return dx * dx + dy * dy < 12 * 12
    }
    for (const target of targets) {
      if (!root.contains(target.element) || !small(target.box)) continue
      const c = centre(target.box)
      const crowded = targets.some(other => other !== target && !other.element.contains(target.element) && !target.element.contains(other.element)
        && (circleHitsBox(c, other.box) || (small(other.box) && Math.hypot(c[0] - centre(other.box)[0], c[1] - centre(other.box)[1]) < 24)))
      if (crowded)
        findings.push({ check: 'target-size', target: describe(target.element),
          detail: `${Math.round(target.box.width)}×${Math.round(target.box.height)} is under 24×24 and too close to another target` })
    }
    return findings
  }, [interactiveSelector, describeSource, hiddenSource] as const))
}

const contrastSource = `(before, after) => {
  const channel = (value) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const luminance = (data, i) => 0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2])
  let changed = 0, strong = 0
  for (let i = 0; i < before.length; i += 4) {
    if (Math.abs(before[i] - after[i]) <= 8 && Math.abs(before[i + 1] - after[i + 1]) <= 8 && Math.abs(before[i + 2] - after[i + 2]) <= 8) continue
    changed++
    const a = luminance(before, i), b = luminance(after, i)
    if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3) strong++
  }
  return { changed, strong }
}`

/**
 * The focused state must differ from the unfocused one by a 3:1 change covering at least the element's
 * 1 CSS px perimeter (WCAG 2.4.7 and 1.4.11), measured on the real backdrop at deviceScaleFactor 1.
 */
export async function checkFocusVisible(page: Page, target: Locator, delegated = false): Promise<Finding[]> {
  // Centre it: a box flush with the viewport edge counts as visible, but its ring would fall outside the shot.
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  // List and menu items are reached with arrow keys, and some primitives highlight them only then:
  // "before" shows a neighbour highlighted, "after" the target. Other controls are compared blurred vs focused.
  const keys = await target.evaluate(element => {
    if (!element.matches('[role=option], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]')) return null
    const items = [...(element.closest('[role=listbox], [role=menu]') ?? document).querySelectorAll(
      '[role=option], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]')].filter(item => item.getClientRects().length)
    if (items.length < 2) return null
    return items.indexOf(element) === items.length - 1 ? ['ArrowUp', 'ArrowDown'] : ['ArrowDown', 'ArrowUp']
  })
  // A text field that draws no ring of its own may be ringed by a :focus-within wrapper inside the specimen
  // (Input Group, Tag Input): the ring is then measured around that wrapper, as findForcedColors accepts it.
  // Only text fields are probed: focusing other controls first can leave state behind (a Base UI menu
  // item stays highlighted after blur), which would spoil the unfocused screenshot.
  const ringOwner = keys ? false : await target.evaluate(element => {
    document.querySelectorAll('[data-audit-ring-owner]').forEach(owner => owner.removeAttribute('data-audit-ring-owner'))
    if (!element.matches('input, textarea')) return false
    ;(element as HTMLElement).focus({ focusVisible: true } as FocusOptions)
    if (element !== document.activeElement) return false
    const ring = (style: CSSStyleDeclaration) => style.outlineStyle !== 'none' && (Number.parseFloat(style.outlineWidth) || 0) >= 1
    if (ring(getComputedStyle(element))) return false
    for (let current = element.parentElement; current && !current.matches('section[data-audit], [data-audit-open], body'); current = current.parentElement)
      if (ring(getComputedStyle(current))) {
        current.setAttribute('data-audit-ring-owner', '')
        return true
      }
    return false
  })
  if (keys) {
    await target.evaluate(element => (element as HTMLElement).focus({ focusVisible: true } as FocusOptions))
    await page.keyboard.press(keys[0]!)
  } else await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const box = await (ringOwner ? page.locator('[data-audit-ring-owner]') : target).boundingBox()
  const description = await target.evaluate((element, source) => (new Function('return ' + source)() as (e: Element) => string)(element), describeSource)
  // An earlier interaction can hide it (focusing a Radix tab selects it and hides the previous panel).
  if (!box) return []
  const viewport = page.viewportSize()!
  const x = Math.max(0, Math.floor(box.x - 8)), y = Math.max(0, Math.floor(box.y - 8))
  const clip = { x, y, width: Math.min(viewport.width, Math.ceil(box.x + box.width + 8)) - x, height: Math.min(viewport.height, Math.ceil(box.y + box.height + 8)) - y }
  if (clip.width <= 0 || clip.height <= 0)
    return [{ check: 'focus-visible', target: description, detail: `element at ${Math.round(box.x)},${Math.round(box.y)} is outside the viewport after scrolling` }]
  const before = await page.screenshot({ clip, animations: 'disabled' })
  // focusVisible: true gives the keyboard-modality indicator without walking the tab order past neighbours.
  if (keys) await page.keyboard.press(keys[1]!)
  else await target.evaluate(element => (element as HTMLElement).focus({ focusVisible: true } as FocusOptions))
  const after = await page.screenshot({ clip, animations: 'disabled' })
  const focus = await target.evaluate(element => element === document.activeElement || element.hasAttribute('data-highlighted') ? 'self'
    : element.contains(document.activeElement) ? 'moved' : 'none')
  // A container that hands focus to an item (roving radiogroup, tablist) is not judged: the item that took focus is.
  if (focus === 'moved') {
    if (delegated) return [{ check: 'focus-visible', target: description, detail: 'focus moved on again from a delegated item' }]
    await page.evaluate(() => {
      document.querySelectorAll('[data-audit-focus-moved]').forEach(element => element.removeAttribute('data-audit-focus-moved'))
      document.activeElement?.setAttribute('data-audit-focus-moved', '')
    })
    return checkFocusVisible(page, page.locator('[data-audit-focus-moved]'), true)
  }
  const focused = focus === 'self'
  const { changed, strong } = await page.evaluate(async ([before, after, source]) => {
    const pixels = async (base64: string) => {
      const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + base64)).blob())
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')!
      context.drawImage(bitmap, 0, 0)
      return context.getImageData(0, 0, bitmap.width, bitmap.height).data
    }
    return (new Function('return ' + source)() as (a: Uint8ClampedArray, b: Uint8ClampedArray) => { changed: number; strong: number })(await pixels(before), await pixels(after))
  }, [before.toString('base64'), after.toString('base64'), contrastSource] as const)
  // 90% of a 1px perimeter: anti-aliased corners of a rounded 1px ring fall below 3:1.
  const needed = Math.round(0.9 * 2 * (box.width + box.height))
  if (!focused) return [{ check: 'focus-visible', target: description, detail: 'element could not take focus' }]
  return strong >= needed ? [] : [{ check: 'focus-visible', target: description,
    detail: `${strong} focus pixels at 3:1 (${changed} changed), ${needed} needed` }]
}

// Items reached with arrow keys: primitives give all but the current one tabindex -1.
const itemRoles = '[role=option], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=tab], [role=radio]'

/**
 * Keyboard-reachable controls inside `root`, in document order: tabbable controls, plus list and menu items,
 * which primitives reach with arrow keys (Radix gives them tabindex -1). Hidden, inert, disabled and 1×1 proxies are skipped.
 */
export async function listFocusables(root: Locator, prefix: string): Promise<Locator[]> {
  const out: Locator[] = []
  for (const [index, handle] of (await root.all()).entries()) {
    const count = await handle.evaluate((root, [selector, items, key]) => {
      let n = 0
      for (const element of [root, ...root.querySelectorAll(`${selector}, ${items}`)]) {
        if (!(element instanceof HTMLElement) || !element.matches(`${selector}, ${items}`)) continue
        if (element.tabIndex < 0 && !element.matches(items)) continue
        if (element.closest('[aria-hidden="true"], [inert]') || element.matches(':disabled, [aria-disabled="true"], [data-disabled]')
          || element.getClientRects().length === 0) continue
        const box = element.getBoundingClientRect()
        if (box.width <= 1 && box.height <= 1) continue
        element.setAttribute('data-audit-focus', `${key}-${n++}`)
      }
      return n
    }, [interactiveSelector, itemRoles, `${prefix}-${index}`] as const)
    for (let n = 0; n < count; n++) out.push(root.page().locator(`[data-audit-focus="${prefix}-${index}-${n}"]`))
  }
  return out
}

/** Control page timers (installed before navigation); time keeps running until withFrozenClock pauses it. */
export async function installClock(page: Page): Promise<void> {
  await page.clock.install()
}

/**
 * Run `measure` with page time paused, so a toast stays open while it is measured. install() alone keeps time running;
 * a paused clock also stops requestAnimationFrame, so only this short stretch is frozen.
 */
export async function withFrozenClock<T>(page: Page, measure: () => Promise<T>): Promise<T> {
  await pauseClock(page)
  try { return await measure() } finally { await page.clock.resume() }
}

/** Pause page time about a second from now (pauseAt cannot target the past); resume with page.clock.resume(). */
export async function pauseClock(page: Page): Promise<void> {
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000))
}

/** Tag elements that have a border now, so the forced-colors pass knows which borders must survive. */
export async function markBorders(roots: Locator[]): Promise<void> {
  for (const root of roots) for (const handle of await root.all()) await handle.evaluate(root => {
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const style = getComputedStyle(element)
      if (['Top', 'Right', 'Bottom', 'Left'].some(side => Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0
        && style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== 'none'))
        element.setAttribute('data-audit-border', '')
    }
  })
}

/** Under forced-colors: active, focus shows as an outline, marked borders survive, no backdrop filter, no transparent text. */
export async function findForcedColors(roots: Locator[], focused: Locator[]): Promise<Finding[]> {
  const findings: Finding[] = []
  for (const target of focused) {
    await target.evaluate(element => (element as HTMLElement).focus({ focusVisible: true } as FocusOptions))
    const outline = await target.evaluate((element, source) => {
      const describe = (new Function('return ' + source)() as (e: Element) => string)
      if (element !== document.activeElement) return { delegated: true, style: '', width: 0, target: describe(element) }
      // The ring may be drawn on a wrapper through :focus-within (Input Group), inside the specimen only.
      for (let current: Element | null = element; current && !current.matches('section[data-audit], [data-audit-open], body'); current = current.parentElement) {
        const style = getComputedStyle(current)
        if (style.outlineStyle !== 'none' && (Number.parseFloat(style.outlineWidth) || 0) >= 1)
          return { delegated: false, style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth), target: describe(element) }
      }
      const style = getComputedStyle(element)
      return { delegated: false, style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) || 0, target: describe(element) }
    }, describeSource)
    if (outline.delegated) continue
    if (outline.style === 'none' || outline.width < 1)
      findings.push({ check: 'forced-colors', target: outline.target, detail: `focused outline is ${outline.style} ${outline.width}px` })
  }
  findings.push(...await each(roots, root => root.evaluate((root, describeSource) => {
    const describe = new Function('return ' + describeSource)() as (element: Element) => string
    const out: { check: 'forced-colors'; target: string; detail: string }[] = []
    for (const element of [root, ...root.querySelectorAll('*')]) {
      if (element.getClientRects().length === 0) continue
      const style = getComputedStyle(element)
      if (element.hasAttribute('data-audit-border') && !['top', 'right', 'bottom', 'left'].some(side =>
        style.getPropertyValue(`border-${side}-style`) !== 'none' && Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) >= 1))
        out.push({ check: 'forced-colors', target: describe(element), detail: 'border disappears in forced colors' })
      if (style.backdropFilter && style.backdropFilter !== 'none')
        out.push({ check: 'forced-colors', target: describe(element), detail: `backdrop-filter ${style.backdropFilter} remains` })
      const hasText = [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
      if (hasText && /rgba\([^)]*,\s*0\)|transparent/.test(style.color))
        out.push({ check: 'forced-colors', target: describe(element), detail: 'text is transparent' })
    }
    return out
  }, describeSource)))
  return findings
}

/** WCAG 2.2 A and AA axe rules on the given selectors, one finding per failing node. */
export async function runAxe(page: Page, include: string[]): Promise<Finding[]> {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  for (const selector of include) builder = builder.include(selector)
  // axe schedules its work on timers: under a frozen clock, step fake time until it finishes.
  let done = false
  const analysis = builder.analyze().finally(() => { done = true })
  while (!done) await page.clock.runFor(16).catch(() => undefined)
  const { violations } = await analysis
  return violations.flatMap(violation => violation.nodes.map(node => ({
    check: 'axe' as const, target: node.target.join(' '), detail: `${violation.id}: ${violation.help}` })))
}
