import Ajv, { type ValidateFunction } from 'ajv'
import { readFileSync } from 'node:fs'

const read = (name: string) => {
  const schema = JSON.parse(readFileSync(new URL('../fixtures/shadcn-schema/' + name, import.meta.url), 'utf8'))
  // Ajv registers this same draft-07 meta-schema under its canonical HTTP ID.
  if (schema.$schema === 'https://json-schema.org/draft-07/schema#') schema.$schema = 'http://json-schema.org/draft-07/schema#'
  return schema
}
// Upstream's conditional `required` fields are defined in the parent schema.
const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true })
ajv.addFormat('uri', value => { try { new URL(value); return true } catch { return false } })
ajv.addSchema(read('registry-item.json'), 'https://ui.shadcn.com/schema/registry-item.json')
const wrap = (validate: ValidateFunction) => ({
  safeParse(input: unknown) { return { success: validate(input), errors: validate.errors } },
})

// Published upstream JSON Schemas are the independent compatibility boundary.
// Keep these fixtures pinned; do not derive validators from Ombelle's output.
export const registryItemSchema = wrap(ajv.getSchema('https://ui.shadcn.com/schema/registry-item.json')!)
export const registrySchema = wrap(ajv.compile(read('registry.json')))
