import fs from 'node:fs'
import { writeFileAtomicSync } from './write-atomic.ts'
import {
  styleFamilies,
  styleSupport,
} from '../packages/contracts/src/style-families.ts'
import { supportedComponentIds } from '../packages/contracts/src/component-ids.ts'
const base = 'packages/catalog/src/'
const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
const templates = Object.fromEntries(
  supportedComponentIds.map((id) => [
    id,
    readText(base + 'templates/' + id + '.tsx'),
  ]),
)
const styles = Object.fromEntries(
  styleFamilies.map((id) => [
    id,
    readText(base + 'styles/' + id + '.css'),
  ]),
)
const componentStyles = Object.fromEntries(
  supportedComponentIds
    .filter((id) => fs.existsSync(base + 'styles/' + id))
    .map((id) => [
      id,
      Object.fromEntries(
        styleFamilies
          .filter((family) => styleSupport(id, family) !== 'unavailable')
          .map((family) => [
            family,
            readText(base + 'styles/' + id + '/' + family + '.css'),
          ]),
      ),
    ]),
)
const presets = Object.fromEntries(
  styleFamilies.map((id) => [
    id,
    JSON.parse(readText(base + 'presets/' + id + '.json')),
  ]),
)
writeFileAtomicSync(
  base + 'generated.ts',
  '// Generated from reviewed catalog files.\nexport const catalogData = ' +
    JSON.stringify({
      templates,
      styles,
      componentStyles,
      presets,
      utility: readText(base + 'templates/utils.ts'),
    }) +
    ' as const\n',
)
