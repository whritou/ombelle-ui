import fs from 'node:fs'
import path from 'node:path'
import {
  validateComponentPresetMeasurements,
  type ComponentPresetMeasurement,
} from '../../scripts/component-preset-evidence.js'

/** Where each component-presets.spec.ts worker writes its rows (the spec runs in parallel mode). */
export const componentPresetMeasurementParts = '.artifacts/component-preset-measurements-parts'
const measurements = '.artifacts/component-preset-measurements.json'

// Once, after every worker: merge the parts into the single evidence file and require the complete
// set, as one worker's afterAll did before the cases ran in parallel. Runs without the spec (another
// Foundation shard, or a filtered run) leave no parts and change nothing.
export default async function teardown() {
  if (!fs.existsSync(componentPresetMeasurementParts)) return
  const files = fs.readdirSync(componentPresetMeasurementParts).filter((file) => file.endsWith('.json')).sort()
  const rows: ComponentPresetMeasurement[] = files.flatMap((file) =>
    JSON.parse(fs.readFileSync(path.join(componentPresetMeasurementParts, file), 'utf8')))
  fs.rmSync(componentPresetMeasurementParts, { recursive: true, force: true })
  fs.rmSync(measurements, { force: true })
  if (!rows.length) return
  const key = (row: ComponentPresetMeasurement) => [row.hostFamily, row.presetId, row.mode, row.app].join('/')
  rows.sort((a, b) => key(a).localeCompare(key(b)))
  await validateComponentPresetMeasurements(rows)
  fs.writeFileSync(measurements, JSON.stringify(rows, null, 2))
}
