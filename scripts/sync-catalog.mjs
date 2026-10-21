import fs from 'node:fs'
import { supportedStyleFamilies } from '../packages/contracts/src/style-families.ts'
const base = 'packages/catalog/src/'
const templates = Object.fromEntries(
  ['button', 'dialog', 'input'].map((id) => [
    id,
    fs.readFileSync(base + 'templates/' + id + '.tsx', 'utf8'),
  ]),
)
const styles = Object.fromEntries(
  supportedStyleFamilies.map((id) => [
    id,
    fs.readFileSync(base + 'styles/' + id + '.css', 'utf8'),
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
      utility: fs.readFileSync(base + 'templates/utils.ts', 'utf8'),
    }) +
    ' as const\n',
)
