import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config.js'
import { workerBudget } from './scripts/worker-budget.js'
import WeightedSequencer from './tests/integration/weighted-sequencer.js'

export default mergeConfig(
  base,
  defineConfig({
    test: {
      // CI shards by recorded file durations instead of path hashes (TST-12).
      sequence: { sequencer: WeightedSequencer },
      maxWorkers: workerBudget(
        'OMBELLE_INTEGRATION_WORKERS',
        process.env.OMBELLE_INTEGRATION_WORKERS,
        4,
      ),
    },
  }),
)
