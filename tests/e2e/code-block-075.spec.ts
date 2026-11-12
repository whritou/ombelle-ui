import { expect, test, type Page } from '@playwright/test'

// Code Block and Code Block Command in both editions, on the edition parity pages
// (fixtures/shared/edition-scenario*.tsx, section "Code Block").

// The file fixture's source, built as in the fixtures: 30 lines, line 15 is 400 characters.
const summary = `  const summary = '${'Long lines scroll sideways. '.repeat(14).slice(0, 380)}'`
const sourceLines = [
  "import * as React from 'react'",
  "import { Button } from '@acme/ui/button'",
  "import { CodeBlockCommand } from '@acme/ui/code-block'",
  "import { Card } from '@acme/ui/card'",
  '',
  'type ReleaseProps = {',
  '  version: string',
  '  notes?: string',
  '}',
  '',
  '// Shows the release and the command that installs it.',
  'export function Release({ version, notes }: ReleaseProps) {',
  '  const [open, setOpen] = React.useState(false)',
  "  const label = open ? 'Hide notes' : 'Show notes'",
  summary,
  '  return (',
  '    <Card>',
  '      <h2>Release {version}</h2>',
  '      <CodeBlockCommand args="@ombelle-ui/cli add button" />',
  '      <Button variant="outline" onClick={() => setOpen(!open)}>',
  '        {label}',
  '      </Button>',
  '      {open ? <p>{notes ?? summary}</p> : null}',
  '    </Card>',
  '  )',
  '}',
  '',
  'export function Releases() {',
  '  return <Release version="0.7.5" />',
  '}',
]
const source = `${sourceLines.join('\n')}\n`

const runners = { pnpm: 'pnpm dlx', npm: 'npx', yarn: 'yarn dlx', bun: 'bunx' } as const

type Clipboard = 'record' | 'reject' | 'missing'

/** Replaces navigator.clipboard before the page loads; recorded writes land in window.__copied. */
const stubClipboard = (page: Page, mode: Clipboard) =>
  page.addInitScript(behaviour => {
    const copied: string[] = []
    Object.assign(window, { __copied: copied })
    if (behaviour === 'missing') {
      delete (Navigator.prototype as { clipboard?: unknown }).clipboard
      return
    }
    const writeText = (text: string) => {
      if (behaviour === 'reject') return Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'))
      copied.push(text)
      return Promise.resolve()
    }
    Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => ({ writeText }) })
  }, mode)

const copied = (page: Page) => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)

const open = async (page: Page, edition: string, clipboard: Clipboard = 'record') => {
  await stubClipboard(page, clipboard)
  await page.goto(`/editions/ombelle/${edition}/?mode=light`)
  await expect(page.getByTestId('code-block-075')).toBeVisible({ timeout: 60000 })
}

/** Counts every DOM change of the file block's status region from now on. */
const watchStatus = (page: Page) =>
  page.getByTestId('code-block-file').locator('[data-slot="code-block-status"]').evaluate(status => {
    const log = { changes: 0 }
    Object.assign(window, { __statusLog: log })
    new MutationObserver(records => {
      log.changes += records.length
    }).observe(status, { childList: true, characterData: true, subtree: true })
  })

const statusChanges = (page: Page) => page.evaluate(() => (window as unknown as { __statusLog: { changes: number } }).__statusLog.changes)

for (const edition of ['radix', 'base'] as const) {
  test.describe(edition, () => {
    test('Code Block Command selects managers with the arrow, Home and End keys', async ({ page }) => {
      await open(page, edition)
      const fixture = page.getByTestId('code-block-command')
      const echo = page.getByTestId('code-block-manager')
      const tab = (name: string) => fixture.getByRole('tab', { name, exact: true })
      const panel = fixture.getByRole('tabpanel')
      await expect(tab('pnpm')).toHaveAttribute('aria-selected', 'true')
      await expect(panel).toHaveText('pnpm dlx @ombelle-ui/cli add button')
      await tab('pnpm').focus()
      await page.keyboard.press('ArrowRight')
      await expect(tab('npm')).toBeFocused()
      await expect(tab('npm')).toHaveAttribute('aria-selected', 'true')
      await expect(panel).toHaveText('npx @ombelle-ui/cli add button')
      await expect(echo).toHaveText('npm')
      await page.keyboard.press('End')
      await expect(tab('bun')).toHaveAttribute('aria-selected', 'true')
      await expect(panel).toHaveText('bunx @ombelle-ui/cli add button')
      await expect(echo).toHaveText('bun')
      await page.keyboard.press('Home')
      await expect(tab('pnpm')).toHaveAttribute('aria-selected', 'true')
      await expect(echo).toHaveText('pnpm')
      await page.keyboard.press('ArrowLeft')
      await expect(tab('bun')).toBeFocused()
      await expect(tab('bun')).toHaveAttribute('aria-selected', 'true')
      await expect(panel).toHaveText('bunx @ombelle-ui/cli add button')
      await expect(echo).toHaveText('bun')
    })

    test('Code Block Command copies the selected manager\'s command', async ({ page }) => {
      await open(page, edition)
      const fixture = page.getByTestId('code-block-command')
      const expected: string[] = []
      for (const [manager, runner] of Object.entries(runners)) {
        await fixture.getByRole('tab', { name: manager, exact: true }).click()
        await fixture.getByRole('button', { name: 'Copy command' }).click()
        expected.push(`${runner} @ombelle-ui/cli add button`)
        await expect.poll(() => copied(page)).toEqual(expected)
      }
    })

    test('Code Block copies its source exactly', async ({ page }) => {
      await open(page, edition)
      expect(sourceLines).toHaveLength(30)
      expect(summary).toHaveLength(400)
      await page.getByTestId('code-block-file').getByRole('button', { name: 'Copy release.tsx' }).click()
      await expect.poll(() => copied(page)).toEqual([source])
    })

    test('Copy announces Copied and resets after 1.5 s, restarting on a second click', async ({ page }) => {
      await page.clock.install()
      await open(page, edition)
      // Stop natural time, so only runFor moves the page's timers.
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000)
      const fixture = page.getByTestId('code-block-file')
      const copy = fixture.getByRole('button', { name: 'Copy release.tsx' })
      const status = fixture.getByRole('status')
      await copy.click()
      await expect(status).toHaveText('Copied')
      await expect(copy).toHaveText('Copied')
      await page.clock.runFor(1499)
      await expect(copy).toHaveText('Copied')
      await page.clock.runFor(1)
      await expect(copy).toHaveText('Copy')
      await expect(status).toHaveText('')

      await copy.click()
      await expect(copy).toHaveText('Copied')
      await page.clock.runFor(1000)
      await copy.click()
      await expect(status).toHaveText('Copied')
      await page.clock.runFor(1499)
      await expect(copy).toHaveText('Copied')
      await expect(status).toHaveText('Copied')
      await page.clock.runFor(1)
      await expect(copy).toHaveText('Copy')
    })

    for (const clipboard of ['reject', 'missing'] as const) {
      test(`Copy announces Copy failed again on each click when the clipboard ${clipboard === 'reject' ? 'rejects' : 'is missing'}`, async ({ page }) => {
        await open(page, edition, clipboard)
        const fixture = page.getByTestId('code-block-file')
        const copy = fixture.getByRole('button', { name: 'Copy release.tsx' })
        const status = fixture.getByRole('status')
        await copy.click()
        await expect(status).toHaveText('Copy failed')
        await expect(copy).toHaveText('Copy')
        // The region must change again, or a screen reader stays silent the second time.
        await watchStatus(page)
        await copy.click()
        await expect.poll(() => statusChanges(page)).toBeGreaterThan(0)
        await expect(status).toHaveText('Copy failed')
        await expect(copy).toHaveText('Copy')
      })
    }

    test('the code scrolls from the keyboard inside its height and the page does not', async ({ page }) => {
      await open(page, edition)
      const fixture = page.getByTestId('code-block-file')
      const pre = fixture.getByLabel('release.tsx source', { exact: true })
      await expect(pre).toHaveJSProperty('tagName', 'PRE')
      await fixture.getByRole('button', { name: 'Copy release.tsx' }).focus()
      await page.keyboard.press('Tab')
      await expect(pre).toBeFocused()
      const overflow = await pre.evaluate(el => ({ down: el.scrollHeight > el.clientHeight, right: el.scrollWidth > el.clientWidth }))
      expect(overflow).toEqual({ down: true, right: true })
      await page.keyboard.press('ArrowDown')
      await expect.poll(() => pre.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      await page.keyboard.press('ArrowRight')
      await expect.poll(() => pre.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
      const page_ = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
      expect(page_.scroll).toBeLessThanOrEqual(page_.client)
    })

    test('line numbers stay out of a selection, and lineNumbers={false} hides them', async ({ page }) => {
      await open(page, edition)
      const selected = await page.getByTestId('code-block-file').locator('[data-slot="code-block-code"]').evaluate(pre => {
        const lines = pre.querySelectorAll('[data-slot="code-block-line"]')
        const start = lines[1]!
        const end = lines[3]!
        const range = document.createRange()
        range.setStart(start, 0)
        // The end of line 4, before its newline.
        const last = end.lastChild!
        if (last.nodeType === Node.TEXT_NODE && last.textContent === '\n') range.setEndBefore(last)
        else range.setEndAfter(last)
        const selection = getSelection()!
        selection.removeAllRanges()
        selection.addRange(range)
        return { text: selection.toString(), number: getComputedStyle(start, '::before').content }
      })
      expect(selected.text).toBe(sourceLines.slice(1, 4).join('\n'))
      expect(selected.number).not.toBe('none')
      const plain = await page.getByTestId('code-block-plain').locator('[data-slot="code-block-line"]').first()
        .evaluate(line => getComputedStyle(line, '::before').content)
      expect(plain).toBe('none')
    })

    test('line numbers stay out of the accessible text', async ({ page }) => {
      await open(page, edition)
      // Chromium's own accessibility tree: the pre's static text, without the ::before numbers.
      const cdp = await page.context().newCDPSession(page)
      const { root } = await cdp.send('DOM.getDocument', { depth: -1 })
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: "[data-testid='code-block-file'] pre" })
      const { node } = await cdp.send('DOM.describeNode', { nodeId })
      await cdp.send('Accessibility.enable')
      const { nodes } = await cdp.send('Accessibility.getFullAXTree')
      const byId = new Map(nodes.map(item => [item.nodeId, item]))
      const pre = nodes.find(item => item.backendDOMNodeId === node.backendNodeId)!
      expect(pre.role?.value).toBe('region')
      const texts: string[] = []
      const walk = (id: string) => {
        const item = byId.get(id)
        if (!item) return
        if (item.role?.value === 'StaticText') texts.push(String(item.name?.value ?? ''))
        for (const child of item.childIds ?? []) walk(child)
      }
      walk(pre.nodeId)
      expect(texts.length).toBeGreaterThan(0)
      expect(texts.filter(text => /^\d+$/.test(text.trim()))).toEqual([])
      expect(texts.join('').startsWith(sourceLines[0]!)).toBe(true)
      await cdp.detach()
    })

    test('line 100 starts its code where line 1 does', async ({ page }) => {
      await open(page, edition)
      const starts = await page.getByTestId('code-block-long').locator('[data-slot="code-block-line"]').evaluateAll(lines =>
        [lines[0]!, lines[8]!, lines[99]!, lines[119]!].map(line => line.firstElementChild!.getBoundingClientRect().left))
      expect(starts).toHaveLength(4)
      for (const start of starts) expect(Math.abs(start - starts[0]!)).toBeLessThan(0.5)
    })

    test('Copied resets when the copied content changes', async ({ page }) => {
      await page.clock.install()
      await open(page, edition)
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000)
      const fixture = page.getByTestId('code-block-command')
      const copy = fixture.getByRole('button', { name: 'Copy command' })
      // The fixture's <output> is a status too.
      const status = fixture.locator('[data-slot="code-block-status"]')
      await copy.click()
      await expect(copy).toHaveText('Copied')
      await expect(status).toHaveText('Copied')
      await fixture.getByRole('tab', { name: 'npm', exact: true }).click()
      await expect(copy).toHaveText('Copy')
      await expect(status).toHaveText('')
    })
  })
}
