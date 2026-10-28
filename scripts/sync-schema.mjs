import fs from 'node:fs'
const schema = JSON.parse(fs.readFileSync('schemas/preset.schema.json', 'utf8'))
fs.writeFileSync(
  'packages/contracts/src/preset-schema.ts',
  '// Generated from schemas/preset.schema.json; do not edit independently.\nexport const presetSchema = ' +
    JSON.stringify(schema, null, 2) +
    ' as const\n',
)
const recipe = JSON.parse(fs.readFileSync('schemas/recipe.schema.json', 'utf8'))
fs.writeFileSync('packages/contracts/src/recipe-schema.ts', '// Generated from schemas/recipe.schema.json; do not edit independently.\nexport const recipeSchema = ' + JSON.stringify(recipe, null, 2) + ' as const\n')
for (const [name, binding] of [
  ['preset-snapshot', 'presetSnapshotSchema'],
  ['snapshot-source', 'snapshotSourceSchema'],
]) {
  const input = JSON.parse(fs.readFileSync(`schemas/${name}.schema.json`, 'utf8'))
  fs.writeFileSync(
    `packages/contracts/src/${name}-schema.ts`,
    `// Generated from schemas/${name}.schema.json; do not edit independently.\nexport const ${binding} = ` +
      JSON.stringify(input, null, 2) + ' as const\n',
  )
}
