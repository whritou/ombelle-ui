// @ts-expect-error JavaScript gate helper
import { consumerShardSelection, parseConsumerShard } from '../../scripts/consumer-shards.mjs'

/** The spec files this consumers shard runs (OMBELLE_CONSUMERS_SHARD=2/3), or every file when unset. */
export function consumerShard(): { testMatch?: string[]; testIgnore?: string[] } {
  return consumerShardSelection(parseConsumerShard(process.env.OMBELLE_CONSUMERS_SHARD))
}
