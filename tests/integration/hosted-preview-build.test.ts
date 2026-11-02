import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { expect, it } from 'vitest'

it('builds nested static runtime HTML/assets and workers without touching unrelated public files or a database', async () => {
  const sentinel = path.resolve('apps/www/public/.hosted-preview-test-sentinel')
  // A clean checkout has no tracked public files, so the directory may not exist yet.
  await fs.mkdir(path.dirname(sentinel), { recursive: true })
  await fs.writeFile(sentinel, 'unrelated public asset')
  try {
    const output = await new Promise<{ code: number | null; text: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/build-hosted-preview.mjs'], { windowsHide: true, env: { ...process.env, DATABASE_URL: '', DATABASE_URL_UNPOOLED: '', OMBELLE_SNAPSHOT_BACKEND: '' } })
      let text = ''; child.stdout.on('data', value => { text += value }); child.stderr.on('data', value => { text += value })
      child.on('error', reject); child.on('close', code => resolve({ code, text }))
    })
    expect(output.code, output.text).toBe(0)
    expect(await fs.readFile(sentinel, 'utf8')).toBe('unrelated public asset')
    for (const kind of ['editor', 'preset']) {
      const html = await fs.readFile(`apps/www/public/ombelle-preview/${kind}-preview/index.html`, 'utf8')
      const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match => match[1])
      expect(scripts.length).toBeGreaterThan(0)
      for (const script of scripts) {
        expect(script).toMatch(/^\/ombelle-preview\/assets\/.+\.js$/)
        const bytes = await fs.readFile('apps/www/public' + script, 'utf8')
        expect(bytes).not.toMatch(/<!doctype/i)
        expect(bytes.length).toBeGreaterThan(100)
      }
      expect(html).not.toMatch(/127\.0\.0\.1|localhost|\/src\/main.tsx|[A-Z]:\\/)
    }
    for (const worker of ['editor', 'preset']) {
      const bytes = await fs.readFile(`apps/www/public/${worker}-compiler.worker.js`, 'utf8')
      expect(bytes).toContain('onmessage')
      expect(bytes).not.toMatch(/<!doctype|postgres(?:ql)?:\/\//i)
    }
  } finally { await fs.rm(sentinel, { force: true }) }
}, 120_000)
