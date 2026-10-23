import fs from 'node:fs'
import { supportedStyleFamilies } from '../packages/contracts/src/style-families.ts'
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
  supportedStyleFamilies.map((id) => [
    id,
    readText(base + 'styles/' + id + '.css'),
  ]),
)
const componentStyles = {
  badge: Object.fromEntries(
    supportedStyleFamilies.map((family) => [
      family,
      readText(base + 'styles/badge/' + family + '.css'),
    ]),
  ),
}
const presets = Object.fromEntries(
  supportedStyleFamilies.map((id) => [
    id,
    JSON.parse(fs.readFileSync(base + 'presets/' + id + '.json', 'utf8')),
  ]),
)
fs.writeFileSync(
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
