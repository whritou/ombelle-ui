import fs from 'node:fs/promises'
import { compile } from '@ombelle/compiler'
import { isBlockId, type CatalogId, type ComponentId, type StyleFamily } from '@ombelle/contracts'

// These scenarios deliberately cover a subset of the catalog. Keep CLI installs
// and their independent compiler reference on the same component scope.
export function consumerAddBatches(family: StyleFamily): CatalogId[][] {
  return family === 'liquid-glass'
    ? [['button', 'dialog'], ['badge'], ['card'], ['tabs', 'tooltip']]
    : [
        ['button', 'dialog'],
        ['input'],
        ['badge'],
        ['card'],
        ['label', 'textarea', 'native-select'],
        ['checkbox', 'switch', 'tabs', 'tooltip'],
        // A block installs with its components and is checked against the same compiler reference.
        ['login-01'],
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
  const ids = consumerAddBatches(family).flat()
  return compile({
    preset: await consumerPreset(family, fonts),
    componentIds: ids.filter((id) => !isBlockId(id)) as ComponentId[],
    blockIds: ids.filter(isBlockId),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
}
