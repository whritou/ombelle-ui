'use client'

import { useMemo, useRef, useState } from 'react'
import { matrixAxes, matrixCellLimit, matrixCells, matrixEnums, resolveMatrixAxes, type MatrixComponent } from './matrix'
import { useRecipeBatch } from './use-recipe-batch'
import type { PreviewMatrix } from './components/preview-frame'

export type MatrixLayout = ReturnType<typeof useMatrixLayout>

/**
 * The editors' Matrix preview layout: whether it is on, its two axes, and the cells compiled
 * in one batch. Preview state only, never saved. matrix is null until the first batch compiled.
 */
export function useMatrixLayout<R extends { props: Record<string, unknown> }>(component: MatrixComponent, recipe: R) {
  const [layout, setLayout] = useState<'single' | 'matrix'>('single')
  const [rowsProp, setRows] = useState<string | null>(null)
  const [columnsProp, setColumns] = useState<string | null | undefined>(undefined)
  const enums = useMemo(() => matrixEnums(component), [component])
  const defaults = useMemo(() => matrixAxes(component), [component])
  const { rows, columns } = useMemo(() => resolveMatrixAxes(enums, defaults, rowsProp, columnsProp), [enums, defaults, rowsProp, columnsProp])
  const on = layout === 'matrix' && rows !== null
  const built = useMemo(() => on && rows ? matrixCells(recipe, rows, columns, component) : null, [on, recipe, rows, columns, component])
  const recipes = useMemo(() => built ? built.cells.map((cell) => cell.recipe) : null, [built])
  const batch = useRecipeBatch(component === 'button' ? 'button' : 'catalog', recipes)
  // Memoised: the preview re-sends and re-verifies every cell whenever this object changes.
  const results = batch.results
  const matrix = useMemo<PreviewMatrix | null>(() => built && rows && results && results.length === built.cells.length
    ? {
      rows: rows.prop, columns: columns?.prop ?? null, states: component === 'button',
      cells: built.cells.map((cell, index) => ({ row: cell.row, column: cell.column, current: cell.current, result: results[index]! })),
    }
    : null, [built, rows, columns, results, component])
  // While an edit recompiles, the last matrix stays on screen if it has the same cells, so the
  // preview does not flip back to one specimen; the status says it is compiling. New axes drop it.
  const shown = useRef<PreviewMatrix | null>(null)
  const sameCells = (previous: PreviewMatrix | null) => !!previous && !!built && previous.rows === rows?.prop &&
    previous.columns === (columns?.prop ?? null) && previous.cells.length === built.cells.length &&
    previous.cells.every((cell, index) => cell.row === built.cells[index]!.row && cell.column === built.cells[index]!.column && cell.current === built.cells[index]!.current)
  if (matrix) shown.current = matrix
  else if (!sameCells(shown.current)) shown.current = null
  return {
    available: defaults !== null,
    layout, setLayout,
    enums, rows, columns, setRows, setColumns,
    matrix: on ? shown.current : null,
    pending: on && batch.pending,
    error: on ? batch.error : null,
    /** Set when the axes make more cells than the matrix shows. */
    capped: built && built.total > matrixCellLimit ? built.total : null,
  }
}
