import fs from 'node:fs'
const schema = JSON.parse(fs.readFileSync('schemas/preset.schema.json', 'utf8'))
fs.writeFileSync(
  'packages/contracts/src/preset-schema.ts',
  '// Generated from schemas/preset.schema.json; do not edit independently.\nexport const presetSchema = ' +
    JSON.stringify(schema, null, 2) +
    ' as const\n',
)
