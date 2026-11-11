import * as React from 'react'
import { measureCatalogParts, type CatalogMatrixRender, type MeasuredParts } from '../../www/src/editor/catalog-preview-protocol'
import { CatalogSpecimenCell, useCatalogRoot, useCatalogScene } from './catalog-recipe-preview'
import { GlassBackdropArt } from './glass-backdrop-art'

type Cell = { row: string | number; column: string | number | null; current: boolean }

const unique = <T,>(values: T[]) => values.filter((value, index) => values.indexOf(value) === index)

/**
 * The variant matrix as a table: a caption naming the axes, a header for each column and
 * row value, and the current cell marked for assistive technology and in text.
 */
export function MatrixTable<C extends Cell>({ name, rows, columns, cells, render, extra }: {
  name: string; rows: string; columns: string | null; cells: C[]
  render(cell: C): React.ReactNode
  /** An extra row after the matrix, such as the Button's forced states. */
  extra?: { label: string; cells: { key: string; label: string; node: React.ReactNode }[] }
}) {
  const rowValues = unique(cells.map((cell) => cell.row))
  const columnValues = columns ? unique(cells.map((cell) => cell.column)) : [null]
  return <div className="recipe-matrix-scroll">
    <table className="recipe-matrix" data-testid="variant-matrix">
      <caption>{`${name} variants by ${rows}${columns ? ` and ${columns}` : ''}`}</caption>
      {columns && <thead><tr><td />{columnValues.map((value) => <th key={String(value)} scope="col">{String(value)}</th>)}</tr></thead>}
      <tbody>
        {rowValues.map((row) => <tr key={String(row)}>
          <th scope="row">{String(row)}</th>
          {columnValues.map((column) => {
            const cell = cells.find((item) => item.row === row && item.column === column)
            return <td key={String(column)} aria-current={cell?.current || undefined} data-current={cell?.current || undefined}>
              {cell?.current && <span className="recipe-matrix-current">Current</span>}
              {cell && render(cell)}
            </td>
          })}
        </tr>)}
      </tbody>
      {extra && <tbody>
        <tr><th scope="row">{extra.label}</th>
          <td colSpan={Math.max(1, columnValues.length)}>
            <div className="recipe-matrix-states">
              {extra.cells.map((item) => <figure key={item.key} className="recipe-matrix-state">
                {item.node}<figcaption>{item.label}</figcaption>
              </figure>)}
            </div>
          </td>
        </tr>
      </tbody>}
    </table>
  </div>
}

export function CatalogMatrixPreview({ message, onMeasure }: {
  message: CatalogMatrixRender; onMeasure?(requestId: number, parts: MeasuredParts): void
}) {
  const { component, cells, mode, viewport } = message
  const current = cells.find((cell) => cell.current)!
  const scene = useCatalogScene(current.result, mode)
  useCatalogRoot(mode, scene)
  // The current cell is the inspector's recipe, so its rendered values fill the empty fields.
  const measure = React.useCallback((stage: HTMLElement) => onMeasure?.(message.requestId, measureCatalogParts(stage, component)),
    [onMeasure, message.requestId, component])
  return <div className={mode === 'dark' ? 'editor-preview dark' : 'editor-preview'} data-viewport={viewport} data-layout="matrix" data-request={message.requestId}>
    {scene && <GlassBackdropArt scene={scene} />}
    <MatrixTable name={component} rows={message.rows} columns={message.columns} cells={cells}
      render={(cell) => <CatalogSpecimenCell component={component} result={cell.result} onRendered={cell.current ? measure : undefined} />} />
  </div>
}
