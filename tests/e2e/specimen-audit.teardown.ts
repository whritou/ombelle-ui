import { mergeSpecimenParts } from '../helpers/specimen-run.js'

// Once, after every worker: merge this run's parts (a per-worker afterAll raced under fullyParallel).
export default async function teardown() {
  const runId = process.env.OMBELLE_SPECIMEN_RUN_ID
  if (runId) await mergeSpecimenParts(runId)
}
