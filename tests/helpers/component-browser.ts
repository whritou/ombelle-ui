import { expect, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { browserReferenceKey } from './browser-references.js'

export const browserApps = ['preview', 'vite', 'next', 'npm-vite', 'npm-next'] as const
export type BrowserApp = (typeof browserApps)[number]
const consumers = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8'))

export function componentUrl(app: BrowserApp, family: string, query: string) {
  return app === 'preview'
    ? 'http://127.0.0.1:4173/' + family + '/' + query
    : 'http://127.0.0.1:' + consumers[app + '-' + family].port + '/' + query
}

export async function componentReferenceKey(page: Page, family: string, mode: string) {
  return browserReferenceKey({
    family,
    mode,
    viewport: page.viewportSize() ?? { width: 1100, height: 800 },
    reducedMotion: 'reduce',
    forcedColors: 'none',
    colorScheme: await page.evaluate(() =>
      matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    ),
  })
}

export function expectComponentSources(id: string, family: string, app: BrowserApp) {
  const generated = 'apps/preview/src/generated/' + family
  const manifest = JSON.parse(fs.readFileSync(generated + '/manifest.json', 'utf8'))
  for (const logicalPath of [
    'components/ui/' + id + '.tsx',
    'components/ui/' + id + '.css',
    'examples/' + id + '.tsx',
  ]) {
    const artifact = manifest.artifacts.find(
      (item: { logicalPath: string }) => item.logicalPath === logicalPath,
    )
    expect(artifact).toBeDefined()
    expect(fs.readFileSync(path.join(generated, logicalPath), 'utf8')).toBe(
      artifact.content
        .replaceAll('@/lib/utils', '../../lib/utils')
        .replaceAll('@/components/ui', '../components/ui'),
    )
    if (app !== 'preview')
      expect(
        fs.readFileSync(
          path.join(
            consumers[app + '-' + family].root,
            'src',
            logicalPath.replace('examples/', 'ombelle-examples/'),
          ),
          'utf8',
        ),
      ).toBe(artifact.content)
  }
}

export async function sampleComponentFixture(
  page: Page,
  testId: string,
  waitForBubbleInputs = false,
) {
  await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
  const fixture = page.getByTestId(testId)
  await expect(fixture).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  if (waitForBubbleInputs)
    // Radix ResizeObserver synchronizes form bubble inputs after hydration.
    await expect.poll(() =>
      fixture.locator('input[aria-hidden="true"]').evaluateAll((inputs) =>
        inputs.every((input) => {
          const control = input.previousElementSibling
          if (!control) return false
          const root = control.getBoundingClientRect()
          const bubble = input.getBoundingClientRect()
          return root.width === bubble.width && root.height === bubble.height
        }),
      ),
    ).toBe(true)
  const html = await fixture.evaluate((root) => {
    // Generated Radix IDs vary between framework roots; semantics remain intact.
    function serialize(node: Node): unknown {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent
      if (node.nodeType !== Node.ELEMENT_NODE) return null
      const element = node as HTMLElement
      return {
        tag: element.tagName.toLowerCase(),
        attributes: Object.fromEntries(
          Array.from(element.attributes)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((attribute) => [
              attribute.name,
              (attribute.name === 'style' ? element.style.cssText : attribute.value)
                .replace(/radix-[^" ]+/g, 'radix-ID'),
            ]),
        ),
        children: Array.from(node.childNodes)
          .filter((child) => child.nodeType === 1 || child.nodeType === 3)
          .map(serialize),
      }
    }
    return JSON.stringify(serialize(root))
  })
  const styles = await fixture.locator('[data-slot]').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element)
      return {
        slot: element.getAttribute('data-slot'),
        state: element.getAttribute('data-state'),
        color: style.color,
        background: style.backgroundColor,
        border: style.borderWidth,
        borderColor: style.borderColor,
        radius: style.borderRadius,
        shadow: style.boxShadow,
        padding: style.padding,
        width: style.width,
        height: style.height,
        display: style.display,
        opacity: style.opacity,
        transition: style.transitionDuration,
      }
    }),
  )
  return { html, styles }
}

export async function expectComponentTargets(fixture: Locator, selector: string, count: number) {
  const targets = await fixture.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }),
  )
  expect(targets).toHaveLength(count)
  for (const target of targets) {
    expect(target.width).toBeGreaterThanOrEqual(24)
    expect(target.height).toBeGreaterThanOrEqual(24)
  }
}

export async function expectComponentFocus(control: Locator) {
  await control.focus()
  await expect(control).toBeFocused()
  const measure = await control.evaluate((element) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      visible: element.matches(':focus-visible'),
      outline: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      transition: style.transitionDuration,
    }
  })
  expect(measure.width).toBeGreaterThanOrEqual(24)
  expect(measure.height).toBeGreaterThanOrEqual(24)
  expect(measure.visible).toBe(true)
  expect(measure.outline).toBe('solid')
  expect(measure.outlineWidth).toBeGreaterThanOrEqual(2)
  expect(measure.transition.split(', ').every((value) => parseFloat(value) === 0)).toBe(true)
}
