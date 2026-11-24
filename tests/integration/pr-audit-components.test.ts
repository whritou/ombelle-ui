import { expect, test } from 'vitest'
import { auditComponents, auditLimit, changedComponents, representativeComponents } from '../../scripts/pr-audit-components.js'

test('a change to a template or a component stylesheet audits that component', () => {
  expect(changedComponents([
    'packages/catalog/src/templates/toolbar.tsx',
    'packages/catalog/src/templates/base/code-block.tsx',
    'packages/catalog/src/styles/sheet/organic.css',
    'packages/catalog/src/styles/flat.css',
    'packages/catalog/src/templates/not-a-component.tsx',
    'README.md',
  ])).toEqual(['code-block', 'sheet', 'toolbar'])
})

test('every change audits the representative sample, and a large one leaves the rest to Foundation', () => {
  expect(auditComponents([]).components).toEqual([...representativeComponents])
  const many = Array.from({ length: 30 }, (_, i) => `packages/catalog/src/styles/${['accordion', 'alert', 'avatar', 'badge', 'breadcrumb', 'calendar', 'carousel', 'checkbox', 'chip', 'collapsible', 'combobox', 'command', 'context-menu', 'data-table', 'empty', 'field', 'hover-card', 'item', 'kbd', 'label', 'menubar', 'meter', 'pagination', 'popover', 'progress', 'prose', 'resizable', 'sheet', 'sidebar', 'slider'][i]}/flat.css`)
  const { components, deferred } = auditComponents(many)
  expect(components).toHaveLength(auditLimit)
  expect(components.slice(0, representativeComponents.length)).toEqual([...representativeComponents])
  expect(components.length + deferred.length).toBe(representativeComponents.length + 30)
})
