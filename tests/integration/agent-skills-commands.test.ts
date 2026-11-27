import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { prepareEvalProject } from '../../scripts/agent-evals/projects.js'
import { jsonRecord, runBuiltCli } from '../helpers/cli-runtime.js'
import { extractSkillCommands } from '../helpers/skill-commands.js'

const skillsDir = path.resolve('skills')
const preset = path.resolve('packages/catalog/src/presets/flat.json')
const writing = new Set(['init', 'add', 'update', 'theme', 'preset'])

const managedPath = 'src/components/ui/button.tsx'
// --beside only takes a hand-written file of a component Ombelle does not manage yet,
// so those commands run against a hand-written badge instead of the installed button.
const besidePath = 'src/components/ui/badge.tsx'

type Case = { skill: string; original: string; args: string[] }

function toArgs(original: string): string[] {
  const args = original
    .replaceAll('<preset>', preset)
    .replaceAll('<code>', preset)
    .replaceAll('<component>', original.includes('--beside') ? 'badge' : 'button')
    .replaceAll('<block>', 'login-01')
    .replaceAll('<path>', original.includes('--beside') ? besidePath : managedPath)
    .split(/\s+/)
    .filter((arg) => arg && arg !== '--yes')
  if (args[0] === '--version') return args
  const first = args[0]!
  const second = args[1]
  const isWriting =
    writing.has(first) && !(first === 'preset' && second === 'show')
  if (isWriting && !args.includes('--dry-run')) args.push('--dry-run')
  if (!args.includes('--json')) args.push('--json')
  return args
}

async function collect(): Promise<Case[]> {
  const cases: Case[] = []
  const entries = await fs.readdir(skillsDir, { withFileTypes: true })
  for (const entry of entries.filter((e) => e.isDirectory()).sort()) {
    const file = path.join('skills', entry.name, 'SKILL.md')
    const markdown = await fs.readFile(path.join(skillsDir, entry.name, 'SKILL.md'), 'utf8')
    for (const original of extractSkillCommands(markdown))
      cases.push({ skill: file, original, args: toArgs(original) })
  }
  return cases
}

const cases = await collect()

describe('agent skill commands run against the built CLI', () => {
  let project: string
  beforeAll(async () => {
    project = await prepareEvalProject('vite-pnpm', 'initialized', {
      components: ['button'],
    })
    // --beside and --overwrite only resolve a file edited after install.
    const button = path.join(project, managedPath)
    await fs.appendFile(button, '// edited by the project' + String.fromCharCode(10))
    const own = path.join(project, besidePath)
    await fs.mkdir(path.dirname(own), { recursive: true })
    await fs.writeFile(own, 'export const Button = () => null' + String.fromCharCode(10))
  }, 600_000)
  afterAll(async () => {
    if (project) await fs.rm(project, { recursive: true, force: true })
  })

  it('extracts the commands shown in the skills', () => {
    expect(cases.length).toBeGreaterThanOrEqual(15)
  })

  for (const c of cases) {
    it(`${c.skill}: ${c.original}`, async () => {
      const result = await runBuiltCli('node', c.args, project)
      const label =
        `${c.skill}: npx @ombelle-ui/cli@<version> ${c.original}\n` +
        `ran: ${c.args.join(' ')}\nexit ${result.code}\n${result.output}`
      if (c.args[0] === '--version') {
        expect(result.code, label).toBe(0)
        expect(String(jsonRecord(result.data).version), label).toMatch(/^\d+\.\d+\.\d+/)
        return
      }
      expect([0, 4], label).toContain(result.code)
      expect(jsonRecord(result.data).command, label).not.toBe('')
    }, 120_000)
  }
})
