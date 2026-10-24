import type { ConsumerEvidence } from './consumer-evidence.ts'
import { validateComponentPresetMeasurements } from './component-preset-measurement-evidence.ts'
import { validateComponentPresetConsumers } from './component-preset-consumer-evidence.ts'
export {
  componentPresetIsolationMethod,
  componentPresetMeasurementKeys,
  normalizedScreenshotsMatch,
  validateComponentPresetMeasurements,
  type ComponentPresetMeasurement,
} from './component-preset-measurement-evidence.ts'
export { validateComponentPresetConsumers } from './component-preset-consumer-evidence.ts'

export async function finalizeComponentPresetEvidence(
  input: { measurements: unknown; consumers: unknown },
  matrix: Record<string, ConsumerEvidence>,
) {
  const measurements = await validateComponentPresetMeasurements(
    input.measurements,
  )
  await validateComponentPresetConsumers(input.consumers, matrix)
  return { measurements, consumers: input.consumers }
}
