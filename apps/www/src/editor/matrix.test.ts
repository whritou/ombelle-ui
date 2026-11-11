import { expect, it } from 'vitest'
import { componentRecipeComponents } from '@ombelle/contracts'
import { createCatalogDraft } from './catalog-draft'
import { createEditorDraft } from './model'
import { matrixAxes, matrixCellLimit, matrixCells, matrixEnums, propValue } from './matrix'

it('every component gets axes or none', () => {
  for (const component of componentRecipeComponents) {
    const enums = matrixEnums(component)
    const axes = matrixAxes(component)
    expect(axes === null, component).toBe(enums.length === 0)
    if (axes && enums.some((axis) => axis.prop === 'variant')) expect(axes.rows.prop, component).toBe('variant')
  }
})

it('Button axes', () => {
  const axes = matrixAxes('button')!
  expect(axes.rows).toMatchObject({ prop: 'variant' })
  expect(axes.rows.values).toHaveLength(7)
  expect(axes.columns).toMatchObject({ prop: 'size' })
  expect(axes.columns!.values).toHaveLength(4)
})

it('Badge uses size for columns and still offers appearance', () => {
  const axes = matrixAxes('badge')!
  expect(axes.rows.prop).toBe('variant')
  expect(axes.columns!.prop).toBe('size')
  expect(matrixEnums('badge').map((axis) => axis.prop)).toContain('appearance')
})

it('cells keep edits', () => {
  const recipe = { ...createCatalogDraft('badge').recipe, content: { label: 'Beta' },
    appearance: { parts: { badge: { colors: { light: { background: '#123456' } } } } } }
  const axes = matrixAxes('badge')!
  const { cells } = matrixCells(recipe, axes.rows, axes.columns, 'badge')
  for (const cell of cells) {
    expect(cell.recipe.content).toEqual({ label: 'Beta' })
    expect(cell.recipe.appearance).toEqual(recipe.appearance)
  }
  expect((cells[axes.columns!.values.length]!.recipe.props as Record<string, unknown>).variant).toBe(axes.rows.values[1])
})

it('the current cell treats absent props as their default', () => {
  const recipe = createCatalogDraft('badge').recipe
  expect((recipe.props as Record<string, unknown>).size).toBeUndefined()
  const axes = matrixAxes('badge')!
  const current = matrixCells(recipe, axes.rows, axes.columns, 'badge').cells.filter((cell) => cell.current)
  expect(current).toHaveLength(1)
  expect(current[0]).toMatchObject({ row: propValue(recipe, 'variant', 'badge'), column: 'default' })
})

it('the Button current cell follows its props', () => {
  const recipe = createEditorDraft('flat').recipe
  const axes = matrixAxes('button')!
  const current = matrixCells(recipe, axes.rows, axes.columns, 'button').cells.filter((cell) => cell.current)
  expect(current).toEqual([expect.objectContaining({ row: 'default', column: 'default' })])
})

it('the cap', () => {
  const rows = { prop: 'variant', values: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }
  const columns = { prop: 'size', values: ['1', '2', '3', '4', '5', '6', '7'] }
  const { cells, total } = matrixCells(createCatalogDraft('badge').recipe, rows, columns, 'badge')
  expect(cells).toHaveLength(matrixCellLimit)
  expect(total).toBe(56)
})
