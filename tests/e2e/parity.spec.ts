import { test, expect } from '@playwright/test'
import fs from 'node:fs'
const map = JSON.parse(fs.readFileSync('.artifacts/consumers.json', 'utf8'))
test.beforeAll(async ({ browser }) => {
  fs.writeFileSync(
    '.artifacts/browser-version.json',
    JSON.stringify(
      {
        engine: browser.browserType().name(),
        version: browser.version(),
        channel: process.env.OMBELLE_BROWSER_CHANNEL || 'bundled Chromium',
      },
      null,
      2,
    ),
  )
})
for (const family of ['flat', 'neo-brutalism'])
  for (const mode of ['light', 'dark'])
    test(
      family + ' ' + mode + ' visual DOM and artifact parity',
      async ({ page }) => {
        let reference: Buffer | undefined, dom: unknown, styles: unknown
        for (const app of ['preview', 'vite', 'next', 'npm-vite', 'npm-next']) {
          const url =
            app === 'preview'
              ? 'http://127.0.0.1:4173/' + family + '/'
              : 'http://127.0.0.1:' + map[app + '-' + family].port + '/'
          await page.goto(url + '?mode=' + mode)
          await expect(page.locator('main')).toHaveAttribute(
            'data-ready',
            'true',
          )
          const specimen = page.getByTestId('specimen')
          await expect(specimen).toBeVisible()
          await page.evaluate(() => document.fonts.ready)
          const image = await specimen.screenshot({ animations: 'disabled' })
          const html = await specimen.evaluate((root) => {
            function serialize(node: Node): unknown {
              if (node.nodeType === 3) return node.textContent
              if (node.nodeType !== 1) return null
              const element = node as Element
              return {
                tag: element.tagName.toLowerCase(),
                attributes: Object.fromEntries(
                  Array.from(element.attributes)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((a) => [
                      a.name,
                      a.value.replace(/radix-[^" ]+/g, 'radix-ID'),
                    ]),
                ),
                children: Array.from(node.childNodes)
                  .filter((n) => n.nodeType === 1 || n.nodeType === 3)
                  .map(serialize),
              }
            }
            return serialize(root)
          })
          const computed = await page
            .getByRole('button', { name: 'Save changes' })
            .evaluate((el) => {
              const s = getComputedStyle(el)
              return {
                color: s.color,
                background: s.backgroundColor,
                border: s.borderWidth,
                radius: s.borderRadius,
                height: s.height,
              }
            })
          if (!reference) {
            reference = image
            dom = html
            styles = computed
            await test
              .info()
              .attach('page-' + family + '-' + mode, {
                body: await page.screenshot({ fullPage: true }),
                contentType: 'image/png',
              })
            await test.info().attach(family + '-' + mode, {
              body: image,
              contentType: 'image/png',
            })
            const hashes = await page.evaluate(() =>
              Promise.all((window as any).__artifactHashes),
            )
            const manifest = JSON.parse(
              fs.readFileSync(
                'apps/preview/src/generated/' + family + '/manifest.json',
                'utf8',
              ),
            )
            expect(hashes).toEqual(manifest.artifacts.map((a: any) => a.sha256))
          } else {
            expect(computed).toEqual(styles)
            expect(html).toEqual(dom)
            expect(image.equals(reference)).toBe(true)
          }
        }
      },
    )
