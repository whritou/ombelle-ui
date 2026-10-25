import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config.js'
import { workerBudget } from './scripts/worker-budget.js'

export default mergeConfig(
  base,
  defineConfig({
    test: {
      maxWorkers: workerBudget(
        'OMBELLE_INTEGRATION_WORKERS',
        process.env.OMBELLE_INTEGRATION_WORKERS,
        4,
      ),
    },
  }),
)
