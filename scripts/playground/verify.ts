import { verifyExampleLayout } from './example-layout.js'
import path from 'node:path'
import fs from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { supportedComponentIds } from '../../packages/contracts/src/component-ids.js'
import { projectPath } from './projects.js'
import { startServer } from './servers.js'
import type { Options, ProjectSpec } from './model.js'
import type { RunRecorder } from './evidence.js'
export async function verifyProject(
  o: Options,
  s: ProjectSpec,
  run: RunRecorder,
) {
  const prefix = path.join(run.dir, s.id)
  const server = await startServer(
    projectPath(o, s),
    s.framework,
    s.port,
    'production',
    prefix,
    path.join(o.root, 'state', s.id + '.server.json'),
  )
  try {
    const bundled = await fs.access(chromium.executablePath()).then(
      () => true,
      () => false,
    )
    const channel =
      process.env.OMBELLE_BROWSER_CHANNEL ??
      (!bundled && process.platform === 'win32' ? 'msedge' : undefined)
    const browser = await chromium.launch({
      headless: true,
      ...(channel ? { channel } : {}),
    })
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      })
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(server.url + '/?view=gallery')
      await expect(page.locator('[data-playground-ready=true]')).toBeVisible()
      await expect(page.locator('[data-component]')).toHaveCount(
        supportedComponentIds.length,
      )
      await expect(page.locator('[data-example-error]')).toHaveCount(0)
      await verifyExampleLayout(page)
      for (const id of supportedComponentIds)
        await expect(
          page.locator('[data-component="' + id + '"]'),
        ).toBeVisible()
      await page.screenshot({
        path: prefix + '-gallery-light.png',
        fullPage: true,
      })
      await page.getByRole('button', { name: 'Dark mode', exact: true }).click()
      await expect(page.locator('html')).toHaveClass(/dark/)
      await page.screenshot({
        path: prefix + '-gallery-dark.png',
        fullPage: true,
      })
      await page.getByLabel('Filter components').fill('button')
      await expect(page.locator('[data-component="button"]')).toBeVisible()
      await page
        .getByRole('link', { name: 'Link to button', exact: true })
        .click()
      await expect(page.locator('[data-component]')).toHaveCount(1)
      await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
      await page
        .getByRole('button', { name: 'Complete review', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Reopen review', exact: true }),
      ).toBeVisible()
      await page.getByRole('tab', { name: 'Activity', exact: true }).click()
      await expect(page.getByRole('tabpanel')).toContainText('Preset installed')
      await page.screenshot({ path: prefix + '-dashboard.png', fullPage: true })
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await page
        .getByLabel('Workspace name', { exact: true })
        .fill('Verified workspace')
      await page
        .getByRole('button', { name: 'Save settings', exact: true })
        .click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page
        .getByRole('button', { name: 'Confirm save', exact: true })
        .click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('status')).toContainText(
        'Saved Verified workspace',
      )
      await page.screenshot({ path: prefix + '-settings.png', fullPage: true })
      await expect(page.locator('[data-example-error]')).toHaveCount(0)
      if (errors.length) throw Error(errors.join('\n'))
      await fs.writeFile(
        prefix + '-browser.json',
        JSON.stringify(
          {
            status: 'passed',
            components: supportedComponentIds,
            errors,
            browser: browser.version(),
            channel: channel ?? 'bundled',
          },
          null,
          2,
        ),
      )
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
}
