'use client'

import { useMemo, useState } from 'react'
import { matrixAxes, matrixCellLimit, matrixCells, matrixEnums, type MatrixComponent } from './matrix'
import { useRecipeBatch } from './use-recipe-batch'
import type { PreviewMatrix } from './components/preview-frame'

export type MatrixLayout = ReturnType<typeof useMatrixLayout>

/**
 * The editors' Matrix preview layout: whether it is on, its two axes, and the cells compiled
 * in one batch. Preview state only, never saved. matrix is null until every cell compiled.
 */
export function useMatrixLayout<R extends { props: Record<string, unknown> }>(component: MatrixComponent, recipe: R) {
  const [layout, setLayout] = useState<'single' | 'matrix'>('single')
  const [rowsProp, setRows] = useState<string | null>(null)
  const [columnsProp, setColumns] = useState<string | null | undefined>(undefined)
  const enums = useMemo(() => matrixEnums(component), [component])
  const defaults = useMemo(() => matrixAxes(component), [component])
  const rows = enums.find((axis) => axis.prop === rowsProp) ?? defaults?.rows ?? null
  const columns = columnsProp === null ? null
    : enums.find((axis) => axis.prop === columnsProp && axis !== rows) ?? (defaults?.columns !== rows ? defaults?.columns ?? null : null)
  const on = layout === 'matrix' && rows !== null
  const built = useMemo(() => on && rows ? matrixCells(recipe, rows, columns, component) : null, [on, recipe, rows, columns, component])
  const recipes = useMemo(() => built ? built.cells.map((cell) => cell.recipe) : null, [built])
  const batch = useRecipeBatch(component === 'button' ? 'button' : 'catalog', recipes)
  const matrix: PreviewMatrix | null = built && rows && batch.results && batch.results.length === built.cells.length
    ? {
      rows: rows.prop, columns: columns?.prop ?? null, states: component === 'button',
      cells: built.cells.map((cell, index) => ({ row: cell.row, column: cell.column, current: cell.current, result: batch.results![index]! })),
    }
    : null
  return {
    available: defaults !== null,
    layout, setLayout,
    enums, rows, columns, setRows, setColumns,
    matrix: on ? matrix : null,
    pending: on && batch.pending,
    error: on ? batch.error : null,
    /** Set when the axes make more cells than the matrix shows. */
    capped: built && built.total > matrixCellLimit ? built.total : null,
  }
}
