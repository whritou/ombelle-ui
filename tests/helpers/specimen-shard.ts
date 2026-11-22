// @ts-expect-error JavaScript gate helper
import { parseShard, specimenSpecFiles as files } from '../../scripts/specimen-shard.mjs'

/** Every spec file playwright.specimen-audit.config.ts runs. Shards take the others by index. */
export const specimenSpecFiles: string[] = files

export type Shard = { current: number; total: number }
/** The shard this run measures (OMBELLE_SPECIMEN_SHARD=2/4), or undefined for all of it. */
export function specimenShard(): Shard | undefined {
  return parseShard(process.env.OMBELLE_SPECIMEN_SHARD) as Shard | undefined
}
/** Audit configurations are dealt round robin, so every shard gets an even share of the slow tests. */
export function inShard(index: number, shard = specimenShard()): boolean {
  return !shard || index % shard.total === shard.current - 1
}
