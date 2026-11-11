import type { DiffRow } from '../line-diff'
import code from './code-view.module.css'

const sign = { add: '+ ', remove: '− ', same: '  ' } as const

/**
 * A unified diff of one generated file against the catalog default. Each line starts with
 * "+", "−" or a space in its text, so the change reads without colour.
 */
export function DiffView({ rows, added, removed, id }: { rows: DiffRow[]; added: number; removed: number; id?: string }) {
  if (!added && !removed) return <p className="artifactNote" id={id} tabIndex={-1}>No change from the catalog default.</p>
  return <div className={code.diff} role="region" aria-label={`Changes: ${added} added, ${removed} removed`}>
    <p className={code.diffCount}>{`+${added} −${removed}`}</p>
    <pre id={id} tabIndex={0} className={`${code.code} ${code.diffCode}`}><code>
      {rows.map((row, index) => row.kind === 'skip'
        ? <span key={index} className={code.diffSkip}>{`${row.count} unchanged lines`}</span>
        : <span key={index} className={code.diffLine} data-kind={row.kind}>{sign[row.kind] + row.text}</span>)}
    </code></pre>
  </div>
}
