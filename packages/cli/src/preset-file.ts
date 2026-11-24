import { validatePreset, type Preset } from '@ombelle/contracts'
import { readJsonFile } from './json-file.js'
export async function readPresetFile(file: string): Promise<Preset> {
  return validatePreset(await readJsonFile(file, 'Preset', 262144))
}
