import { SegmentedControl, previewLayoutOptions } from '../../editor-shell'
import { matrixCellLimit } from '../matrix'
import type { MatrixLayout } from '../use-matrix-layout'

/** "Preview layout: Single / Matrix", and in Matrix the Rows and Columns axes and the cap notice. */
export function MatrixControls({ matrix }: { matrix: MatrixLayout }) {
  if (!matrix.available) return null
  return <>
    <SegmentedControl<'single' | 'matrix'> label="Preview layout" value={matrix.layout} options={previewLayoutOptions} onChange={matrix.setLayout} />
    {matrix.layout === 'matrix' && <>
      <span className="be-matrix-axis"><label htmlFor="matrix-rows">Rows</label>
        <select id="matrix-rows" value={matrix.rows?.prop ?? ''} onChange={(event) => matrix.setRows(event.target.value)}>
          {matrix.enums.map((axis) => <option key={axis.prop} value={axis.prop}>{axis.prop}</option>)}
        </select>
      </span>
      <span className="be-matrix-axis"><label htmlFor="matrix-columns">Columns</label>
        <select id="matrix-columns" value={matrix.columns?.prop ?? ''} onChange={(event) => matrix.setColumns(event.target.value || null)}>
          <option value="">None</option>
          {matrix.enums.filter((axis) => axis !== matrix.rows).map((axis) => <option key={axis.prop} value={axis.prop}>{axis.prop}</option>)}
        </select>
      </span>
      {matrix.capped !== null && <p role="status" className="be-matrix-cap">
        {`This matrix has ${matrix.capped} cells; showing the first ${matrixCellLimit}. Choose other axes to see the rest.`}
      </p>}
      {matrix.error && <p role="alert" className="be-matrix-cap">{matrix.error}</p>}
    </>}
  </>
}
