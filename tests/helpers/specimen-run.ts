import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { styleFamilies } from '../../packages/contracts/src/index.js'
import { specimenShard } from './specimen-shard.js'

export const specimenArtifacts = '.artifacts/specimen-audit'
export const editions = ['radix', 'base'] as const
export const modes = ['light', 'dark'] as const

/** A run limited to some components, fonts or families is never the gate's evidence. */
export function specimenRunIsPartial(): boolean {
  return Boolean(process.env.OMBELLE_AUDIT_COMPONENTS?.trim() || process.env.OMBELLE_AUDIT_FONTS || process.env.OMBELLE_AUDIT_FAMILIES?.trim())
}

type Part = { runId: string; family: string; edition: string; mode: string; transparency?: 'reduced'; half?: 'components' | 'blocks'; specimens: number; blocks: number; sections: number; checks: Record<string, number>; failures: number; contrastAdvisoryFindings: number; browser: unknown }

const partKey = (part: Part) => [part.family, part.edition, part.mode, part.transparency ?? ''].join('/')
/**
 * A configuration is measured in two tests, its components and its blocks: one row adds them up. A missing half
 * leaves its count at 0 (no specimens or no blocks), which the gate rejects as an incomplete audit.
 */
export function combineSpecimenHalves(parts: Part[]): Part[] {
  const rows = new Map<string, Part>()
  for (const part of parts) {
    const { half: _half, ...rest } = part
    const row = rows.get(partKey(part))
    if (!row) { rows.set(partKey(part), { ...rest, checks: { ...part.checks } }); continue }
    for (const [check, count] of Object.entries(part.checks)) row.checks[check] = (row.checks[check] ?? 0) + count
    row.specimens += part.specimens; row.blocks += part.blocks; row.sections += part.sections
    row.failures += part.failures; row.contrastAdvisoryFindings += part.contrastAdvisoryFindings
  }
  return [...rows.values()]
}

/**
 * Merge this run's configuration parts into the evidence file the Foundation gate validates, stamped with
 * where and when it was measured (TST-05). Parts from another run id are ignored (TST-14).
 */
export async function mergeSpecimenParts(runId: string) {
  if (specimenRunIsPartial()) return
  const directory = path.join(specimenArtifacts, 'parts')
  const names = (await fs.readdir(directory).catch(() => [] as string[])).filter(name => name.endsWith('.json') && !name.endsWith('.findings.json'))
  const parts = combineSpecimenHalves((await Promise.all(names.map(async name => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8')) as Part)))
    .filter(part => part.runId === runId))
  if (!parts.length) return
  const order = (part: Part) => [part.transparency ? 1 : 0, styleFamilies.indexOf(part.family as never), editions.indexOf(part.edition as never), modes.indexOf(part.mode as never)]
  parts.sort((a, b) => { const x = order(a), y = order(b); return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]! || x[3]! - y[3]! })
  const git = (...args: string[]) => spawnSync('git', args, { encoding: 'utf8', windowsHide: true }).stdout.trim()
  const shard = specimenShard()
  const evidence = {
    schemaVersion: 1,
    sourceCommit: git('rev-parse', 'HEAD'),
    workingTreeDirty: git('status', '--porcelain').length > 0,
    measuredAt: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID ? `github:${process.env.GITHUB_RUN_ID}/${process.env.GITHUB_RUN_ATTEMPT ?? '1'}` : `local:${runId}`,
    ...(shard ? { shard } : {}),
    node: process.version, browser: parts[0]!.browser,
    configurations: parts.map(({ family, edition, mode, transparency, specimens, blocks, sections, checks, contrastAdvisoryFindings }) =>
      ({ family, edition, mode, ...(transparency ? { transparency } : {}), specimens, blocks, sections, checks, contrastAdvisoryFindings })),
    failures: parts.reduce((sum, part) => sum + part.failures, 0),
  }
  await fs.writeFile('.artifacts/specimen-audit.json', JSON.stringify(evidence, null, 2) + '\n')
}
