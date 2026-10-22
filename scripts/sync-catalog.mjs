import fs from 'node:fs'
import { supportedStyleFamilies } from '../packages/contracts/src/style-families.ts'
const base = 'packages/catalog/src/'
const readText = (file) =>
  fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
const templates = Object.fromEntries(
  ['button', 'dialog', 'input'].map((id) => [
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
      presets,
      utility: readText(base + 'templates/utils.ts'),
    }) +
    ' as const\n',
)
