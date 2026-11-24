import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { chromium, type FullConfig } from '@playwright/test'
import { specimenArtifacts, specimenRunIsPartial } from '../helpers/specimen-run.js'

/**
 * Before any worker starts: forget every earlier run's parts (TST-14), give this run an id that each part
 * carries and the merge requires, and load both editions' audit pages once so the first configurations
 * do not pay for the preview server's cold module transforms inside their timeout.
 */
export default async function setup(config: FullConfig) {
  process.env.OMBELLE_SPECIMEN_RUN_ID = randomUUID()
  if (!specimenRunIsPartial()) {
    await fs.rm(`${specimenArtifacts}/parts`, { recursive: true, force: true })
    await fs.rm('.artifacts/specimen-audit.json', { force: true })
  }
  const use = config.projects[0]!.use
  const browser = await chromium.launch({ channel: use.channel })
  try {
    const page = await browser.newPage({ baseURL: use.baseURL })
    for (const edition of ['radix', 'base']) {
      await page.goto(`/audit/flat/${edition}/?mode=light`, { timeout: 180000 })
      await page.locator('main[data-audit-page][data-ready="true"]').waitFor({ timeout: 180000 })
    }
  } finally {
    await browser.close()
  }
}
