import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'

const skillsDir = path.resolve('skills')
const skillNames = ['ombelle-install', 'ombelle-choose', 'ombelle-theme', 'ombelle-blocks', 'ombelle-check']
const dryRunExempt = new Set(['ombelle-choose'])

function frontmatter(source: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
  expect(match, 'file starts with YAML frontmatter').not.toBeNull()
  const fields: Record<string, string> = {}
  for (const line of match![1]!.split(/\r?\n/)) {
    const field = /^([a-z-]+):\s*(.*)$/.exec(line)
    if (field) fields[field[1]!] = field[2]!.replace(/^["']|["']$/g, '')
  }
  return fields
}

describe('agent skills', () => {
  it('has exactly the five skill folders', async () => {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    expect(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()).toEqual([...skillNames].sort())
  })

  for (const name of skillNames) {
    describe(name, () => {
      const file = path.join(skillsDir, name, 'SKILL.md')

      it('has frontmatter with a matching name and a description that says when to use it', async () => {
        const fields = frontmatter(await fs.readFile(file, 'utf8'))
        expect(fields.name).toBe(name)
        expect(fields.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        expect(fields.name!.length).toBeLessThanOrEqual(64)
        expect(fields.description).toBeTruthy()
        expect(fields.description!.length).toBeLessThanOrEqual(1024)
        expect(fields.description).toMatch(/\bUse when\b/)
      })

      it('never pins a literal CLI version', async () => {
        expect(await fs.readFile(file, 'utf8')).not.toMatch(/@ombelle-ui\/cli@\d/)
      })

      it('says how to get the CLI version', async () => {
        const source = await fs.readFile(file, 'utf8')
        expect(source).toContain('https://ombelle-ui.vercel.app/api/v1/catalog')
        expect(source).toContain('https://ombelle-ui.vercel.app/docs/getting-started')
      })

      it(dryRunExempt.has(name) ? 'has no writing command' : 'plans with --dry-run', async () => {
        const source = await fs.readFile(file, 'utf8')
        if (!dryRunExempt.has(name)) return expect(source).toContain('--dry-run')
        expect(source).not.toMatch(/--yes|```/)
      })
    })
  }

  it('README shows how to install the skills', async () => {
    const readme = await fs.readFile(path.join(skillsDir, 'README.md'), 'utf8')
    expect(readme).toContain('npx skills add whritou/ombelle-ui')
    for (const name of skillNames) expect(readme).toContain(name)
  })
})
