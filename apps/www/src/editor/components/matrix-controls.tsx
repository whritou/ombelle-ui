import { SegmentedControl, previewLayoutOptions } from '../../editor-shell'
import { matrixCellLimit } from '../matrix'
import type { MatrixLayout } from '../use-matrix-layout'

/** "Preview layout: Single / Matrix", and in Matrix the Rows and Columns axes and the cap notice. */
export function MatrixControls({ matrix }: { matrix: MatrixLayout }) {
  if (!matrix.available) return null
  return <>
    <SegmentedControl<'single' | 'matrix'> label="Preview layout" value={matrix.layout} options={previewLayoutOptions} onChange={matrix.setLayout} />
    {matrix.layout === 'matrix' && <>
      <label className="be-matrix-axis">Rows
        <select value={matrix.rows?.prop ?? ''} onChange={(event) => matrix.setRows(event.target.value)}>
          {matrix.enums.map((axis) => <option key={axis.prop} value={axis.prop}>{axis.prop}</option>)}
        </select>
      </label>
      <label className="be-matrix-axis">Columns
        <select value={matrix.columns?.prop ?? ''} onChange={(event) => matrix.setColumns(event.target.value || null)}>
          <option value="">None</option>
          {matrix.enums.filter((axis) => axis !== matrix.rows).map((axis) => <option key={axis.prop} value={axis.prop}>{axis.prop}</option>)}
        </select>
      </label>
      {matrix.capped !== null && <p role="status" className="be-matrix-cap">
        {`This matrix has ${matrix.capped} cells; showing the first ${matrixCellLimit}. Choose other axes to see the rest.`}
      </p>}
      {matrix.error && <p role="alert" className="be-matrix-cap">{matrix.error}</p>}
    </>}
  </>
}
