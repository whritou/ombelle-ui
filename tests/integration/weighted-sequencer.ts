import fs from 'node:fs'
import path from 'node:path'
import { BaseSequencer, type TestSpecification } from 'vitest/node'

// CI splits the integration suite into shards. Vitest's own split orders files by a hash of their
// path, which put the four slowest files in one shard (12 minutes against 7 or 8, TST-12). This one
// deals files longest first to the shard with the least recorded time so far. Durations are seconds
// measured on CI (durations.json); a file not recorded yet weighs as much as the median file.
// Refresh durations.json from a CI run when a shard drifts well above the others.
const durations: Record<string, number> = JSON.parse(fs.readFileSync(new URL('./durations.json', import.meta.url), 'utf8'))
const recorded = Object.values(durations).sort((a, b) => a - b)
const median = recorded[Math.floor(recorded.length / 2)] ?? 1

export function assignShards(files: string[], count: number): string[][] {
  const weight = (file: string) => durations[file] ?? median
  const ordered = [...files].sort((a, b) => weight(b) - weight(a) || (a < b ? -1 : 1))
  const shards = Array.from({ length: count }, () => ({ total: 0, files: [] as string[] }))
  for (const file of ordered) {
    const lightest = shards.reduce((best, shard) => shard.total < best.total ? shard : best)
    lightest.files.push(file)
    lightest.total += weight(file)
  }
  return shards.map(shard => shard.files)
}

export default class WeightedSequencer extends BaseSequencer {
  override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
    const { index, count } = this.ctx.config.shard!
    const root = this.ctx.config.root
    const name = (spec: TestSpecification) => path.relative(root, spec.moduleId).split(path.sep).join('/')
    const chosen = new Set(assignShards(files.map(name), count)[index - 1])
    return files.filter(spec => chosen.has(name(spec)))
  }
}
