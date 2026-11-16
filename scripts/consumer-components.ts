import fs from 'node:fs/promises'
import { compile } from '@ombelle/compiler'
import type { ComponentId, StyleFamily } from '@ombelle/contracts'

// These scenarios deliberately cover a subset of the catalog. Keep CLI installs
// and their independent compiler reference on the same component scope.
export function consumerAddBatches(family: StyleFamily): ComponentId[][] {
  return family === 'liquid-glass'
    ? [['button', 'dialog'], ['badge'], ['card'], ['tabs', 'tooltip']]
    : [
        ['button', 'dialog'],
        ['input'],
        ['badge'],
        ['card'],
        ['label', 'textarea', 'native-select'],
        ['checkbox', 'switch', 'tabs', 'tooltip'],
      ]
}

export async function consumerPreset(family: StyleFamily, fonts = false) {
  const preset = JSON.parse(
      await fs.readFile(
        'packages/catalog/src/presets/' + family + '.json',
        'utf8',
      ),
    )
  if (fonts) {
    preset.schemaVersion = '1.1'
    Object.assign(preset.design, { fontFamilyId: 'inter', headingFontFamilyId: 'fraunces', monoFontFamilyId: 'jetbrains-mono' })
  }
  return preset
}

export async function compileConsumerReference(family: StyleFamily, fonts = false) {
  return compile({
    preset: await consumerPreset(family, fonts),
    componentIds: consumerAddBatches(family).flat(),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
}
