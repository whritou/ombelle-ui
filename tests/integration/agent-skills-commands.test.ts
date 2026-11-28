import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { prepareEvalProject } from '../../scripts/agent-evals/projects.js'
import { jsonRecord, runBuiltCli } from '../helpers/cli-runtime.js'
import { extractSkillCommands } from '../helpers/skill-commands.js'

const skillsDir = path.resolve('skills')
const preset = path.resolve('packages/catalog/src/presets/flat.json')
const writing = new Set(['init', 'add', 'update', 'theme', 'preset'])
const NL = os.EOL

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
const isConflict = (c: Case) =>
  c.original.includes('--overwrite') || c.original.includes('--beside')

function expectedCommand(args: string[]): string {
  const [first, second] = args
  return first === 'theme' || first === 'preset' ? first + ' ' + second : first!
}

describe('agent skill commands run against the built CLI', () => {
  let project: string
  const exits: string[] = []
  beforeAll(async () => {
    project = await prepareEvalProject('vite-pnpm', 'initialized', {
      components: ['button'],
    })
  }, 600_000)
  afterAll(async () => {
    if (project) await fs.rm(project, { recursive: true, force: true })
    console.log('skill command exit codes' + NL + exits.join(NL))
  })

  async function check(c: Case, expectedCode: number) {
    const result = await runBuiltCli('node', c.args, project)
    exits.push(result.code + '  ' + c.skill + ': ' + c.original)
    const label =
      c.skill + ': npx @ombelle-ui/cli@<version> ' + c.original + NL +
      'ran: ' + c.args.join(' ') + NL + 'exit ' + result.code + NL + result.output
    expect(result.code, label).toBe(expectedCode)
    const record = jsonRecord(result.data)
    if (c.args[0] === '--version') {
      expect(String(record.version), label).toMatch(/^\d+\.\d+\.\d+/)
      return
    }
    expect(record.command, label).toBe(expectedCommand(c.args))
    if (expectedCode === 0) expect(record.status, label).not.toBe('error')
  }

  it('extracts the commands shown in the skills', () => {
    expect(cases.length).toBeGreaterThanOrEqual(15)
  })

  it('finds commands in every skill that runs the CLI', async () => {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    for (const entry of entries.filter((e) => e.isDirectory())) {
      if (entry.name === 'ombelle-choose') continue
      expect(
        cases.filter((c) => c.skill.includes(entry.name)).length,
        entry.name,
      ).toBeGreaterThan(0)
    }
  })

  // The project is pristine here: button installed and unedited, so any conflict is a skill bug.
  for (const c of cases.filter((c) => !isConflict(c)))
    it(`${c.skill}: ${c.original}`, () => check(c, 0), 120_000)

  describe('commands that resolve a conflict', () => {
    beforeAll(async () => {
      // --overwrite needs a managed file edited after install; --beside a hand-written one.
      await fs.appendFile(path.join(project, managedPath), '// edited by the project' + NL)
      const own = path.join(project, besidePath)
      await fs.mkdir(path.dirname(own), { recursive: true })
      await fs.writeFile(own, 'export const Button = () => null' + NL)
    })
    for (const c of cases.filter(isConflict))
      it(`${c.skill}: ${c.original}`, () => check(c, 0), 120_000)
  })
})
