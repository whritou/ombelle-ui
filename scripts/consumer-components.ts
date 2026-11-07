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

export async function compileConsumerReference(family: StyleFamily) {
  return compile({
    preset: JSON.parse(
      await fs.readFile(
        'packages/catalog/src/presets/' + family + '.json',
        'utf8',
      ),
    ),
    componentIds: consumerAddBatches(family).flat(),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
}
