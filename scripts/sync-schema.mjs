import fs from 'node:fs'
import { writeFileAtomicSync } from './write-atomic.ts'
const schema = JSON.parse(fs.readFileSync('schemas/preset.schema.json', 'utf8'))
writeFileAtomicSync(
  'packages/contracts/src/preset-schema.ts',
  '// Generated from schemas/preset.schema.json; do not edit independently.\nexport const presetSchema = ' +
    JSON.stringify(schema, null, 2) +
    ' as const\n',
)
const recipe = JSON.parse(fs.readFileSync('schemas/recipe.schema.json', 'utf8'))
writeFileAtomicSync('packages/contracts/src/recipe-schema.ts', '// Generated from schemas/recipe.schema.json; do not edit independently.\nexport const recipeSchema = ' + JSON.stringify(recipe, null, 2) + ' as const\n')
for (const [name, binding] of [
  ['component-recipe', 'componentRecipeSchema'],
  ['preset-snapshot', 'presetSnapshotSchema'],
  ['snapshot-source', 'snapshotSourceSchema'],
  ['recipe-snapshot', 'recipeSnapshotSchema'],
  ['recipe-snapshot-source', 'recipeSnapshotSourceSchema'],
]) {
  const input = JSON.parse(fs.readFileSync(`schemas/${name}.schema.json`, 'utf8'))
  writeFileAtomicSync(
    `packages/contracts/src/${name}-schema.ts`,
    `// Generated from schemas/${name}.schema.json; do not edit independently.\nexport const ${binding} = ` +
      JSON.stringify(input, null, 2) + ' as const\n',
  )
}
