/** One line of a unified diff, with 1-based line numbers in the files it belongs to. */
export type DiffLine = { kind: 'same' | 'add' | 'remove'; text: string; before?: number; after?: number }
/** A diff row as shown: a line, or a run of unchanged lines folded away. */
export type DiffRow = DiffLine | { kind: 'skip'; count: number }

const lines = (text: string) => (text === '' ? [] : text.split(/\r?\n/))

/**
 * The shortest edit script between two texts, line by line (Myers' greedy O(ND)
 * algorithm). Removals come before additions where both replace a run.
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = lines(before), b = lines(after)
  const n = a.length, m = b.length, max = n + m
  const offset = max
  let v = new Array<number>(2 * max + 2).fill(0)
  const trace: number[][] = []
  outer: for (let d = 0; d <= max; d++) {
    trace.push(v.slice())
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!) ? v[offset + k + 1]! : v[offset + k - 1]! + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) { x++; y++ }
      v[offset + k] = x
      if (x >= n && y >= m) break outer
    }
  }
  // Walk the trace back from the end to recover the edits.
  const out: DiffLine[] = []
  let x = n, y = m
  for (let d = trace.length - 1; d >= 0; d--) {
    v = trace[d]!
    const k = x - y
    const prevK = k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!) ? k + 1 : k - 1
    const prevX = v[offset + prevK]!
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) { out.push({ kind: 'same', text: a[x - 1]!, before: x, after: y }); x--; y-- }
    if (d === 0) break
    if (x === prevX) out.push({ kind: 'add', text: b[y - 1]!, after: y })
    else out.push({ kind: 'remove', text: a[x - 1]!, before: x })
    x = prevX
    y = prevY
  }
  return out.reverse()
}

export function diffSummary(diff: DiffLine[]): { added: number; removed: number } {
  return {
    added: diff.filter((line) => line.kind === 'add').length,
    removed: diff.filter((line) => line.kind === 'remove').length,
  }
}

/** Folds unchanged runs longer than threshold, keeping context lines next to each change. */
export function collapseUnchanged(diff: DiffLine[], context = 3, threshold = 6): DiffRow[] {
  const rows: DiffRow[] = []
  let i = 0
  while (i < diff.length) {
    if (diff[i]!.kind !== 'same') { rows.push(diff[i]!); i++; continue }
    let end = i
    while (end < diff.length && diff[end]!.kind === 'same') end++
    const run = diff.slice(i, end)
    const keepBefore = i === 0 ? 0 : context
    const keepAfter = end === diff.length ? 0 : context
    if (run.length > threshold && run.length > keepBefore + keepAfter) {
      rows.push(...run.slice(0, keepBefore))
      rows.push({ kind: 'skip', count: run.length - keepBefore - keepAfter })
      rows.push(...run.slice(run.length - keepAfter))
    } else rows.push(...run)
    i = end
  }
  return rows
}
