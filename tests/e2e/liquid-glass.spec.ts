import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import { inflateSync } from 'node:zlib'
import { contrastRatio } from '../helpers/contrast.js'

// Experimental liquid-glass family: contrast bounds, fallbacks and editor flow.
// Accessible names repeat across the three backdrop copies, so every scenario
// locator is scoped to its [data-backdrop] section.
const previewUrl = 'http://127.0.0.1:4173/liquid-glass/'
const editorUrl = 'http://127.0.0.1:3000/editor/preset'
const wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const backdrops = ['solid', 'gradient', 'pattern'] as const
const modes = ['light', 'dark'] as const
type Backdrop = (typeof backdrops)[number]
type Mode = (typeof modes)[number]
type Rgb = [number, number, number]

const section = (page: Page, id: Backdrop) =>
  page.locator(`[data-backdrop="${id}"]`)

// Standalone glass consumers (pnpm Vite and Next.js) run the same axe and bounded-contrast cases
// when the prepared consumer map lists them; without a map only the preview cases run.
const consumerMap: Record<string, { port: number }> = (() => {
  try {
    return JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8'))
  } catch {
    return {}
  }
})()
const glassConsumers = (['vite', 'next'] as const).flatMap((framework) => {
  const row = consumerMap[framework + '-liquid-glass']
  return row ? [{ framework, url: 'http://127.0.0.1:' + row.port + '/' }] : []
})

async function open(page: Page, mode: Mode, base = previewUrl) {
  await page.goto(base + '?mode=' + mode)
  await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /dark/ : /^(?!.*dark)/)
  await page.evaluate(() => document.fonts.ready)
}

/** Parses rgb(), rgba() and color(srgb …) computed values into 0..255 channels and alpha. */
function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const srgb = value.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/)
  if (srgb)
    return {
      rgb: [srgb[1], srgb[2], srgb[3]].map((c) => Number(c) * 255) as Rgb,
      alpha: srgb[4] === undefined ? 1 : Number(srgb[4]),
    }
  const rgb = value.match(/^rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\)$/)
  if (!rgb) throw new Error('Unparsed colour ' + value)
  return {
    rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])],
    alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
  }
}

/** Decodes the single pixel of an 8-bit RGB/RGBA 1×1 PNG. With one pixel every PNG filter predicts 0. */
function decodePixel(png: Buffer): Rgb {
  let offset = 8
  let colorType = -1
  const idat: Buffer[] = []
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      if (data.readUInt32BE(0) !== 1 || data.readUInt32BE(4) !== 1 || data[8] !== 8)
        throw new Error('Expected an 8-bit 1×1 PNG')
      colorType = data[9]
    }
    if (type === 'IDAT') idat.push(data)
    offset += 12 + length
  }
  if (colorType !== 2 && colorType !== 6) throw new Error('Unexpected PNG colour type ' + colorType)
  const raw = inflateSync(Buffer.concat(idat))
  return [raw[1], raw[2], raw[3]]
}

/** Composited colour of one device pixel, at CSS scale with device scale factor 1. */
async function pixel(page: Page, x: number, y: number): Promise<Rgb> {
  const png = await page.screenshot({
    clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 },
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  })
  return decodePixel(png)
}

type Point = (box: { x: number; y: number; width: number; height: number }) => { x: number; y: number }
// Card: centre of the top padding band, below the 1px border and inset highlight, above the header text.
const topBand: Point = (b) => ({ x: b.x + b.width / 2, y: b.y + 8 })
// Buttons, tabs triggers, tooltip and dialog: the inline-start padding at mid height, clear of
// the corner radius, border and text.
const startPadding: Point = (b) => ({ x: b.x + 5, y: b.y + b.height / 2 })

type Sample = {
  slot: string
  backdrop: string
  text: string
  textColor: string
  surfaceComputed: string
  surfacePixel: Rgb
  expectedPixel: Rgb | null
  ratio: number
}

async function sampleSlot(
  page: Page,
  slot: string,
  backdrop: string,
  surface: Locator,
  text: Locator,
  point: Point,
  backdropRgb: Rgb | null,
): Promise<Sample> {
  const box = (await surface.boundingBox())!
  const { x, y } = point(box)
  const surfacePixel = await pixel(page, x, y)
  const textColor = await text.evaluate((el) => getComputedStyle(el).color)
  const surfaceComputed = await surface.evaluate((el) => getComputedStyle(el).backgroundColor)
  const fg = parseColor(textColor)
  expect(fg.alpha, `${slot} text colour is opaque`).toBe(1)
  const bg = parseColor(surfaceComputed)
  const expectedPixel = backdropRgb
    ? (bg.rgb.map((c, i) => Math.round(c * bg.alpha + backdropRgb[i] * (1 - bg.alpha))) as Rgb)
    : null
  return {
    slot,
    backdrop,
    text: (await text.innerText()).trim(),
    textColor,
    surfaceComputed,
    surfacePixel,
    expectedPixel,
    ratio: contrastRatio(fg.rgb, surfacePixel),
  }
}

/**
 * Test-only isolation: paints the backdrop section (and an open dialog overlay) a solid colour and
 * hides every section child that does not contain `keep`, so the glass surface composites over a
 * uniform backdrop. `restoreIsolation` puts the original inline styles back.
 */
async function isolate(keep: Locator, id: Backdrop, color: string | null) {
  await keep.evaluate(
    (target, { id, color }) => {
      const saved: Array<[HTMLElement, string | null]> = []
      const set = (el: HTMLElement, prop: string, value: string) => {
        saved.push([el, el.getAttribute('style')])
        el.style.setProperty(prop, value)
      }
      const sec = document.querySelector<HTMLElement>(`[data-backdrop="${id}"]`)!
      if (color) set(sec, 'background', color)
      for (const child of Array.from(sec.children) as HTMLElement[])
        if (!child.contains(target)) set(child, 'visibility', 'hidden')
      const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]')
      if (overlay && color) set(overlay, 'background', color)
      ;(window as any).__glassProbeRestore = saved
    },
    { id, color },
  )
}
async function restoreIsolation(page: Page) {
  await page.evaluate(() => {
    const saved = ((window as any).__glassProbeRestore ?? []) as Array<[HTMLElement, string | null]>
    for (const [el, style] of saved.reverse())
      style === null ? el.removeAttribute('style') : el.setAttribute('style', style)
    ;(window as any).__glassProbeRestore = []
  })
}

/** Adds a ghost Button next to the secondary one; the scenario renders no ghost variant. */
async function addGhostProbe(page: Page, id: Backdrop) {
  await section(page, id)
    .locator('[data-slot="button"][data-variant="secondary"]')
    .evaluate((secondary) => {
      const ghost = secondary.cloneNode(true) as HTMLElement
      ghost.dataset.variant = 'ghost'
      ghost.dataset.glassProbe = 'ghost'
      ghost.className = ghost.className
        .replace('bg-secondary', 'bg-transparent')
        .replace('text-secondary-foreground', 'text-foreground')
      ghost.textContent = 'Ghost probe'
      secondary.after(ghost)
    })
}

/**
 * Samples every declared glass text slot of one backdrop section. `color` paints the backdrop
 * (#000 or #fff) for the bounded case; null keeps the declared backdrop.
 */
async function sampleSlots(page: Page, id: Backdrop, color: string | null): Promise<Sample[]> {
  const sec = section(page, id)
  const backdropRgb = color ? parseColor(color === '#000' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)').rgb : null
  const label = color ?? id
  const samples: Sample[] = []
  await page.mouse.move(0, 0)

  const card = sec.locator('[data-slot="card"]').first()
  await card.scrollIntoViewIfNeeded()
  await isolate(card, id, color)
  for (const [slot, text] of [
    ['card title', card.locator('[data-slot="card-title"]')],
    ['card description', card.locator('[data-slot="card-description"]')],
  ] as const)
    samples.push(await sampleSlot(page, slot, label, card, text, topBand, backdropRgb))
  await restoreIsolation(page)

  const inactive = sec.locator('[data-slot="tabs-trigger"][data-state="inactive"]')
  await expect(inactive).toHaveCount(1)
  await inactive.scrollIntoViewIfNeeded()
  await isolate(inactive, id, color)
  // The inactive trigger is transparent, so its surface is the tabs list. Sample the list's
  // composite inside the trigger's own inline-start padding.
  const list = sec.locator('[data-slot="tabs-list"]')
  const tab = await sampleSlot(page, 'tabs trigger (inactive)', label, inactive, inactive, startPadding, null)
  tab.surfaceComputed = await list.evaluate((el) => getComputedStyle(el).backgroundColor)
  const listBg = parseColor(tab.surfaceComputed)
  tab.expectedPixel = backdropRgb
    ? (listBg.rgb.map((c, i) => Math.round(c * listBg.alpha + backdropRgb[i] * (1 - listBg.alpha))) as Rgb)
    : null
  samples.push(tab)
  await restoreIsolation(page)

  for (const [slot, button] of [
    ['secondary Button', sec.locator('[data-slot="button"][data-variant="secondary"]').first()],
    ['outline Button', sec.getByRole('button', { name: `Open ${id} dialog` })],
    ['ghost Button', sec.locator('[data-glass-probe="ghost"]')],
  ] as const) {
    await button.scrollIntoViewIfNeeded()
    await isolate(button, id, color)
    samples.push(await sampleSlot(page, slot, label, button, button, startPadding, backdropRgb))
    await restoreIsolation(page)
  }

  // CSS locator: the open dialog sets aria-hidden on the page, which hides the trigger from role queries.
  const dialogTrigger = sec.locator('[data-slot="button"]', { hasText: `Open ${id} dialog` })
  await dialogTrigger.scrollIntoViewIfNeeded()
  await dialogTrigger.click()
  const dialog = page.locator('[data-slot="dialog-content"]')
  await expect(dialog).toBeVisible()
  await page.mouse.move(0, 0)
  await isolate(dialogTrigger, id, color ?? null)
  for (const [slot, text] of [
    ['dialog title', dialog.getByText('Confirm changes')],
    ['dialog description', dialog.getByText('Review your project settings before continuing.')],
  ] as const)
    samples.push(await sampleSlot(page, slot, label, dialog, text, startPadding, color ? backdropRgb : null))
  await restoreIsolation(page)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.mouse.move(0, 0)

  const help = sec.getByRole('button', { name: `About ${id} help` })
  await help.scrollIntoViewIfNeeded()
  await help.focus()
  const tooltip = page.locator('[data-slot="tooltip-content"]')
  await expect(tooltip).toBeVisible()
  await isolate(help, id, color)
  samples.push(await sampleSlot(page, 'tooltip content', label, tooltip, tooltip, startPadding, backdropRgb))
  await restoreIsolation(page)
  await page.keyboard.press('Escape')
  await help.blur()
  return samples
}

async function surfaceStyles(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="card"], [data-slot="tabs-list"], [data-slot="button"][data-variant="secondary"], [data-slot="button"][data-variant="outline"], [data-slot="button"][data-variant="ghost"], [data-slot="dialog-content"], [data-slot="tooltip-content"]',
      ),
    ).map((el) => {
      const s = getComputedStyle(el)
      return {
        slot: el.dataset.slot + (el.dataset.variant ? '/' + el.dataset.variant : ''),
        background: s.backgroundColor,
        backdropFilter: s.backdropFilter,
      }
    }),
  )
}

/** Opens the solid dialog and tooltip in turn, collecting computed surface styles each time. */
async function allSurfaceStyles(page: Page) {
  const sec = section(page, 'solid')
  const styles = await surfaceStyles(page)
  await sec.getByRole('button', { name: 'Open solid dialog' }).click()
  await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible()
  styles.push(...(await surfaceStyles(page)).filter((s) => s.slot === 'dialog-content'))
  await page.keyboard.press('Escape')
  await page.mouse.move(0, 0)
  const help = sec.getByRole('button', { name: 'About solid help' })
  await help.focus()
  await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible()
  styles.push(...(await surfaceStyles(page)).filter((s) => s.slot === 'tooltip-content'))
  await page.keyboard.press('Escape')
  await help.blur()
  expect(styles.some((s) => s.slot === 'dialog-content')).toBe(true)
  expect(styles.some((s) => s.slot === 'tooltip-content')).toBe(true)
  return styles
}

function expectOpaqueWithoutFilter(styles: Awaited<ReturnType<typeof surfaceStyles>>) {
  for (const s of styles) {
    expect.soft(parseColor(s.background).alpha, `${s.slot} background ${s.background}`).toBe(1)
    expect.soft(s.backdropFilter, `${s.slot} backdrop-filter`).toBe('none')
  }
}

async function attach(name: string, body: unknown, page: Page) {
  await test.info().attach(name, {
    body: Buffer.from(
      JSON.stringify(
        { browser: page.context().browser()?.browserType().name() + ' ' + page.context().browser()?.version(), node: process.version, ...(body as object) },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  })
}

async function axeOver(page: Page, mode: Mode, id: Backdrop, base: string, target = 'preview') {
  await open(page, mode, base)
  const axe = await new AxeBuilder({ page })
    .include(`[data-backdrop="${id}"]`)
    .withTags(wcag)
    .analyze()
  // axe cannot resolve contrast over gradient or pattern backdrops and reports those
  // nodes as incomplete; the bounded contrast case measures them instead.
  await attach('axe', { target, mode, id, violations: axe.violations, incomplete: axe.incomplete.map((r) => ({ id: r.id, nodes: r.nodes.length })) }, page)
  expect(axe.violations).toEqual([])
}

async function boundedContrast(page: Page, mode: Mode, base: string, target = 'preview') {
  await open(page, mode, base)
  await addGhostProbe(page, 'solid')
  const samples = [
    ...(await sampleSlots(page, 'solid', '#000')),
    ...(await sampleSlots(page, 'solid', '#fff')),
  ]
  await attach('bounded-contrast', { target, mode, samples }, page)
  expect(samples).toHaveLength(2 * 9)
  for (const s of samples) {
    expect.soft(s.ratio, `${s.slot} over ${s.backdrop}: ${s.textColor} on pixel ${s.surfacePixel}`).toBeGreaterThanOrEqual(4.5)
    // Cross-check: the sampled pixel matches computed background alpha-composited over the
    // painted backdrop, which shows the pixel is the glass surface rather than text or border.
    if (s.expectedPixel)
      for (let i = 0; i < 3; i++)
        expect
          .soft(Math.abs(s.surfacePixel[i] - s.expectedPixel[i]), `${s.slot} over ${s.backdrop}: pixel ${s.surfacePixel} vs composite ${s.expectedPixel}`)
          .toBeLessThanOrEqual(3)
  }
}

for (const mode of modes) {
  for (const id of backdrops)
    test(`liquid-glass ${mode}: axe over ${id}`, ({ page }) => axeOver(page, mode, id, previewUrl))

  test(`liquid-glass ${mode}: bounded contrast`, ({ page }) => boundedContrast(page, mode, previewUrl))
  for (const { framework, url } of glassConsumers) {
    for (const id of backdrops)
      test(`liquid-glass ${framework} consumer ${mode}: axe over ${id}`, ({ page }) => axeOver(page, mode, id, url, framework + ' consumer'))
    test(`liquid-glass ${framework} consumer ${mode}: bounded contrast`, ({ page }) => boundedContrast(page, mode, url, framework + ' consumer'))
  }

  test(`liquid-glass ${mode}: nested surfaces drop filter`, async ({ page }) => {
    await open(page, mode)
    const measured = []
    for (const id of backdrops) {
      const sec = section(page, id)
      const nested = sec.getByTestId('nested-glass')
      const nestedButton = nested.getByRole('button', { name: 'Nested action' })
      await expect(nested).toHaveAttribute('data-slot', 'card')
      const card = await nested.evaluate((el) => getComputedStyle(el).backdropFilter)
      expect(card).toMatch(/blur\(12px\)/)
      expect(await nestedButton.evaluate((el) => getComputedStyle(el).backdropFilter)).toBe('none')
      // The scenario's nested Button is the primary variant, which never filters. Re-tag it with
      // each translucent variant and compare against the same variant outside any card.
      for (const variant of ['secondary', 'outline', 'ghost']) {
        await nestedButton.evaluate((el, v) => (el.dataset.variant = v), variant)
        const inside = await nestedButton.evaluate((el) => getComputedStyle(el).backdropFilter)
        const outside = await sec
          .locator('.actions [data-slot="button"]')
          .first()
          .evaluate((el, v) => {
            const before = el.dataset.variant!
            el.dataset.variant = v
            const value = getComputedStyle(el).backdropFilter
            el.dataset.variant = before
            return value
          }, variant)
        measured.push({ id, variant, inside, outside })
        expect(inside, `${id} nested ${variant}`).toBe('none')
        expect(outside, `${id} top-level ${variant}`).toMatch(/blur\(12px\)/)
      }
      await nestedButton.evaluate((el) => (el.dataset.variant = 'default'))
    }
    await attach('nested-filter', { mode, measured }, page)
  })

  test(`liquid-glass ${mode}: reduced transparency`, async ({ page }) => {
    // Playwright 1.64.1 emulateMedia has no reducedTransparency option, so emulate the media
    // feature through CDP; fall back to copying the rules only if the browser ignores it.
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-transparency', value: 'reduce' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    })
    await open(page, mode)
    let path = 'cdp Emulation.setEmulatedMedia prefers-reduced-transparency: reduce'
    if (!(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches))) {
      path = 'fallback stylesheet copying prefers-reduced-transparency rules'
      const copied = await page.evaluate(() => {
        const rules: string[] = []
        const walk = (list: CSSRuleList) => {
          for (const rule of Array.from(list)) {
            if (rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-transparency'))
              rules.push(...Array.from(rule.cssRules).map((r) => r.cssText))
            else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules)
          }
        }
        for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules)
        const style = document.createElement('style')
        style.textContent = rules.join('\n')
        document.head.append(style)
        return rules.length
      })
      expect(copied).toBeGreaterThan(0)
    }
    test.info().annotations.push({ type: 'reduced-transparency-path', description: path })
    const styles = await allSurfaceStyles(page)
    await attach('reduced-transparency', { mode, path, styles }, page)
    expectOpaqueWithoutFilter(styles)
  })

  test(`liquid-glass ${mode}: no backdrop-filter support`, async ({ page }) => {
    // Vite serves stylesheets imported from modules as JS modules at *.css URLs. Strip every
    // @supports block whose condition tests backdrop-filter from those responses.
    const rewrites: Array<{ url: string; contentType: string; stripped: string[] }> = []
    await page.route(/\.css(\?.*)?$/, async (route) => {
      const response = await route.fetch()
      let body = await response.text()
      const stripped: string[] = []
      const opener = /@supports[^{]*backdrop-filter[^{]*\{/g
      for (let match = opener.exec(body); match; match = opener.exec(body)) {
        let depth = 1
        let end = match.index + match[0].length
        while (depth > 0 && end < body.length) {
          if (body[end] === '{') depth++
          else if (body[end] === '}') depth--
          end++
        }
        stripped.push(match[0])
        body = body.slice(0, match.index) + body.slice(end)
        opener.lastIndex = match.index
      }
      rewrites.push({ url: new URL(route.request().url()).pathname, contentType: response.headers()['content-type'] ?? '', stripped })
      await route.fulfill({ response, body })
    })
    await open(page, mode)
    expect(rewrites.reduce((n, r) => n + r.stripped.length, 0)).toBeGreaterThan(0)
    const styles = await allSurfaceStyles(page)
    expectOpaqueWithoutFilter(styles)
    await addGhostProbe(page, 'pattern')
    const samples = await sampleSlots(page, 'pattern', null)
    await attach('no-backdrop-filter', { mode, rewrites, styles, samples }, page)
    expect(samples).toHaveLength(9)
    for (const s of samples)
      expect.soft(s.ratio, `${s.slot} over pattern: ${s.textColor} on pixel ${s.surfacePixel}`).toBeGreaterThanOrEqual(4.5)
  })

  test(`liquid-glass ${mode}: forced colors`, async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    await open(page, mode)
    // axe's color-contrast rule reads author colours rather than the forced system colours in
    // Chromium's emulated forced-colors mode (the flat family's dark scenario shell fails the same
    // way), so it is disabled here and replaced by the computed forced-colour contrast below.
    const axe = await new AxeBuilder({ page }).withTags(wcag).disableRules(['color-contrast']).analyze()
    const forcedText = await page.evaluate(() => {
      const opaque = (el: Element | null): string => {
        for (; el; el = el.parentElement) {
          const bg = getComputedStyle(el).backgroundColor
          if (bg !== 'rgba(0, 0, 0, 0)' && !/,\s*0\)$/.test(bg)) return bg
        }
        return 'rgb(255, 255, 255)'
      }
      const sec = document.querySelector('[data-backdrop="solid"]')!
      return Array.from(
        sec.querySelectorAll('[data-slot="card-title"], [data-slot="card-description"], [data-slot="tabs-trigger"], [data-slot="button"]'),
      ).map((el) => ({ slot: (el as HTMLElement).dataset.slot!, text: el.textContent!.trim(), color: getComputedStyle(el).color, background: opaque(el) }))
    })
    const styles = await allSurfaceStyles(page)
    const filtered = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('*'))
        .filter((el) => getComputedStyle(el).backdropFilter !== 'none')
        .map((el) => el.outerHTML.slice(0, 80)),
    )
    await attach('forced-colors', { mode, violations: axe.violations, styles, filtered, forcedText }, page)
    expect(axe.violations).toEqual([])
    expect(forcedText.length).toBeGreaterThan(0)
    for (const t of forcedText)
      expect
        .soft(contrastRatio(parseColor(t.color).rgb, parseColor(t.background).rgb), `${t.slot} ${t.text}: ${t.color} on ${t.background}`)
        .toBeGreaterThanOrEqual(4.5)
    expect(filtered).toEqual([])
    for (const s of styles) expect.soft(s.backdropFilter, s.slot).toBe('none')
  })

  test(`liquid-glass ${mode}: reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, mode)
    const collect = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('[data-slot]')).map((el) => {
          const s = getComputedStyle(el)
          return { slot: el.dataset.slot!, property: s.transitionProperty, duration: s.transitionDuration }
        }),
      )
    const transitions = await collect()
    const help = section(page, 'solid').getByRole('button', { name: 'About solid help' })
    await help.focus()
    await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible()
    transitions.push(...(await collect()).filter((t) => t.slot.startsWith('tooltip-content')))
    await page.keyboard.press('Escape')
    await attach('reduced-motion', { mode, transitions }, page)
    expect(transitions.length).toBeGreaterThan(0)
    for (const t of transitions) {
      expect.soft(t.property, `${t.slot} transition-property`).not.toContain('backdrop-filter')
      expect
        .soft(t.property === 'none' || t.duration.split(',').every((d) => parseFloat(d) === 0), `${t.slot} transition ${t.property} ${t.duration}`)
        .toBe(true)
    }
  })

  test(`liquid-glass ${mode}: focus and targets`, async ({ page }) => {
    await open(page, mode)
    const focused = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const s = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return {
          backdrop: el.closest<HTMLElement>('[data-backdrop]')?.dataset.backdrop ?? null,
          inDialog: !!el.closest('[data-slot="dialog-content"]'),
          slot: el.dataset.slot ?? null,
          role: el.getAttribute('role') ?? el.tagName.toLowerCase(),
          name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim(),
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
          width: r.width,
          height: r.height,
        }
      })
    const stops: NonNullable<Awaited<ReturnType<typeof focused>>>[] = []
    await page.locator('body').focus()
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab')
      const stop = await focused()
      if (!stop) continue
      if (stop.backdrop) stops.push(stop)
      else if (stops.length && stop.backdrop === null && stops.some((s) => s.backdrop === 'pattern')) break
    }
    for (const id of backdrops) {
      const names = stops.filter((s) => s.backdrop === id).map((s) => s.name)
      for (const name of ['Save changes', 'Secondary', 'Nested action', 'Overview', 'Project summary.', `Open ${id} dialog`, `About ${id} help`])
        expect(names, `${id} focus order`).toContain(name)
    }
    // The inactive tab is reached with an arrow key inside the tab list.
    const overview = section(page, 'solid').getByRole('tab', { name: 'Overview' })
    await overview.focus()
    await page.keyboard.press('ArrowRight')
    await expect(section(page, 'solid').getByRole('tab', { name: 'Activity' })).toBeFocused()
    stops.push((await focused())!)
    // Glass dialog controls.
    await section(page, 'solid').getByRole('button', { name: 'Open solid dialog' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible()
    for (let i = 0; i < 3; i++) {
      const stop = await focused()
      if (stop?.inDialog && !stops.some((s) => s.inDialog && s.name === stop.name)) stops.push(stop)
      await page.keyboard.press('Tab')
    }
    expect(stops.filter((s) => s.inDialog).map((s) => s.name).sort()).toEqual(['Close', 'Confirm'])
    await page.keyboard.press('Escape')
    await attach('focus-targets', { mode, stops }, page)
    for (const s of stops) {
      expect.soft(s.outlineStyle, `${s.backdrop ?? 'dialog'} ${s.name} outline`).not.toBe('none')
      expect.soft(parseFloat(s.outlineWidth), `${s.backdrop ?? 'dialog'} ${s.name} outline width`).toBeGreaterThan(0)
      if (s.role !== 'tabpanel') {
        expect.soft(s.width, `${s.backdrop ?? 'dialog'} ${s.name} width`).toBeGreaterThanOrEqual(24)
        expect.soft(s.height, `${s.backdrop ?? 'dialog'} ${s.name} height`).toBeGreaterThanOrEqual(24)
      }
    }
  })

  test(`liquid-glass ${mode}: unavailable placeholders`, async ({ page }) => {
    await open(page, mode)
    const placeholders = page.locator('[data-unavailable]')
    await expect(placeholders).toHaveCount(6)
    await expect(placeholders).toHaveText(Array(6).fill('Unavailable in liquid glass'))
    expect(await placeholders.evaluateAll((els) => els.map((el) => el.getAttribute('data-unavailable')))).toEqual([
      'checkbox', 'input', 'label', 'native-select', 'switch', 'textarea',
    ])
  })

  test(`liquid-glass ${mode}: preset editor glass flow`, async ({ page }) => {
    const ready = async () => {
      await expect(page.getByTestId('preset-hash')).not.toHaveText('Pending', { timeout: 30000 })
      await expect(page.getByTestId('preset-preview-status')).toHaveText('Preview ready', { timeout: 30000 })
    }
    await page.goto(editorUrl)
    await ready()
    await page.getByLabel('Style family', { exact: true }).selectOption({ label: 'Liquid glass (Experimental)' })
    const confirm = page.getByRole('button', { name: 'Confirm change' })
    const limitations = page.getByRole('heading', { name: 'Liquid glass limitations' })
    await expect(confirm.or(limitations)).toBeVisible()
    if (await confirm.isVisible()) await confirm.click()
    await expect(limitations).toBeVisible()
    await page.getByLabel('Preview mode', { exact: true }).selectOption(mode)
    await ready()

    const actions = ['Download preset JSON', 'Copy export', 'Publish preset…'].map((name) =>
      page.getByRole('button', { name, exact: true }),
    )
    const readout = page.locator('#glass-contrast-readout')
    await expect(readout).toHaveAttribute('role', 'status')
    for (const action of actions) await expect(action).toBeEnabled()
    await expect(readout).toContainText('Contrast bound passes at glass opacity 0.87')

    await page.getByLabel('Glass opacity', { exact: true }).fill('0.6')
    await expect(readout).toContainText('Contrast bound fails at glass opacity 0.6')
    for (const action of actions) await expect(action).toBeDisabled()
    await expect(readout.locator('li')).toHaveCount(0)
    const failing = await page.locator('#glass-contrast-pairs li').allInnerTexts()
    expect(failing.length).toBeGreaterThan(0)
    for (const pair of failing)
      expect(pair).toMatch(/^(light|dark): \S+ on \S+, \d+\.\d{2}:1 over a (black|white) backdrop$/)

    await page.getByRole('button', { name: 'Reset glass opacity' }).click()
    await expect(readout).toContainText('Contrast bound passes at glass opacity 0.87')
    await ready()
    for (const action of actions) await expect(action).toBeEnabled()

    const gallery = page.locator('iframe[title="Global preset gallery"]').contentFrame()
    const unavailable = gallery.locator('[data-unavailable][aria-disabled="true"]')
    await expect(unavailable).toHaveCount(6)
    for (const entry of await unavailable.all()) await expect(entry).toContainText('Unavailable in liquid glass')

    const axe = await new AxeBuilder({ page }).withTags(wcag).analyze()
    await attach('preset-editor', { mode, failing, violations: axe.violations }, page)
    expect(axe.violations).toEqual([])
  })
}
