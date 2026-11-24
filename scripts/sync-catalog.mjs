import fs from 'node:fs'
import { writeFileAtomicSync } from './write-atomic.ts'
import {
  styleFamilies,
  styleSupport,
} from '../packages/contracts/src/style-families.ts'
import { supportedComponentIds } from '../packages/contracts/src/component-ids.ts'
import { componentSlots } from '../packages/catalog/src/component-slots.ts'
import { lintCatalogStyles, previewSlots, templateSlots } from './catalog-style-lint.ts'
const base = 'packages/catalog/src/'
const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
const templates = Object.fromEntries(
  supportedComponentIds.map((id) => [
    id,
    readText(base + 'templates/' + id + '.tsx'),
  ]),
)
// Base UI editions of components whose Radix template imports a primitive.
const baseTemplates = Object.fromEntries(
  supportedComponentIds
    .filter((id) => fs.existsSync(base + 'templates/base/' + id + '.tsx'))
    .map((id) => [id, readText(base + 'templates/base/' + id + '.tsx')]),
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
// Liquid glass starting points: the family base (liquid-glass.json) and every liquid-glass-*.json, keyed by id.
const startingPresets = Object.fromEntries(
  fs
    .readdirSync(base + 'presets')
    .filter((name) => name === 'liquid-glass.json' || /^liquid-glass-[a-z]+\.json$/.test(name))
    .sort()
    .map((name) => JSON.parse(readText(base + 'presets/' + name)))
    .map((preset) => [preset.id, preset]),
)
// Earlier revisions of built-in presets, kept resolvable by id@revision after a revision bump
// (docs/decisions/0009-snapshot-identity-and-contract-version.md). Files are named <id>@<revision>.json.
const retiredPresets = fs
  .readdirSync(base + 'presets/retired')
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => {
    const preset = JSON.parse(readText(base + 'presets/retired/' + name))
    const expected = `${preset.id.replace(/^builtin-/, '')}@${preset.revision}.json`
    if (name !== expected) throw new Error(`Retired preset ${name} must be named ${expected}`)
    return preset
  })
const glassLabStyle = readText(base + 'styles/liquid-glass-lab.css')
const lintMessages = lintCatalogStyles({
  componentStyles,
  familyStyles: { ...styles, 'liquid-glass-lab': glassLabStyle },
  slots: Object.fromEntries(supportedComponentIds.map((id) => [
    id,
    templateSlots(id, [templates[id], baseTemplates[id]].filter(Boolean), componentSlots[id]),
  ])),
  previewSlots,
})
if (lintMessages.length) throw new Error('Catalog style lint failed:\n' + lintMessages.join('\n'))
writeFileAtomicSync(
  base + 'generated.ts',
  '// Generated from reviewed catalog files.\nexport const catalogData = ' +
    JSON.stringify({
      templates,
      baseTemplates,
      styles,
      glassLabStyle,
      componentStyles,
      utility: readText(base + 'templates/utils.ts'),
      glassFilter: readText(base + 'templates/liquid-glass-filter.tsx'),
    }) +
    ' as const\n',
)
// The presets alone, so browser code that needs presets and fonts (the @ombelle/catalog/presets entry)
// does not load every template and stylesheet.
writeFileAtomicSync(
  base + 'generated-presets.ts',
  '// Generated from reviewed catalog files.\nexport const catalogPresetData = ' +
    JSON.stringify({ presets, startingPresets, retiredPresets }) +
    ' as const\n',
)
