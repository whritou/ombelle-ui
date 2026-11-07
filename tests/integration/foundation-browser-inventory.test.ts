import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, test } from 'vitest'
import {
  consumerCases,
  assignConsumerPorts,
} from '../../scripts/consumer-matrix.js'
// @ts-expect-error JavaScript gate entry point
import { validateBrowserResults } from '../../scripts/foundation-evidence.mjs'

test('the foundation evidence contract accepts the complete current Playwright inventory', async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ombelle-browser-inventory-'),
  )
  try {
    const cases = consumerCases(),
      ports = assignConsumerPorts(cases)
    await fs.mkdir(path.join(root, '.artifacts'))
    // Collection needs descriptors, never installed apps or a browser. Use the
    // source matrix so a stale local report cannot hide conditional suites.
    await fs.writeFile(
      path.join(root, '.artifacts/consumers.json'),
      JSON.stringify(
        Object.fromEntries(
          cases.map((row) => [row.id, { ...row, port: ports[row.id] }]),
        ),
      ),
    )
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        path.resolve('node_modules/@playwright/test/cli.js'),
        'test',
        '--config',
        path.resolve('playwright.config.ts'),
        '--list',
        '--reporter=json',
      ],
      {
        cwd: root,
        windowsHide: true,
        timeout: 60000,
        maxBuffer: 8 * 1024 * 1024,
      },
    )
    const result = JSON.parse(stdout)
    let count = 0
    const complete = (suite: any) => {
      for (const spec of suite.specs ?? []) {
        count++
        spec.ok = true
        spec.tests = [
          {
            status: 'expected',
            expectedStatus: 'passed',
            results: [{ status: 'passed', retry: 0, errors: [] }],
          },
        ]
      }
      for (const child of suite.suites ?? []) complete(child)
    }
    for (const suite of result.suites) complete(suite)
    result.stats = { expected: count, unexpected: 0, skipped: 0, flaky: 0 }
    expect(count).toBeGreaterThan(561)
    expect(validateBrowserResults(result)).toMatchObject({ expected: count })
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}, 90000)
