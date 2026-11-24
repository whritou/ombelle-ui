/**
 * A unified diff of two texts by lines, with three lines of context, for `ombelle diff`. Longest common
 * subsequence on lines; inputs beyond a few thousand lines each fall back to one replaced hunk.
 */
export function unifiedDiff(before: string, after: string, fromLabel: string, toLabel: string): string {
  if (before === after) return ''
  const a = split(before), b = split(after)
  const ops = a.length * b.length > 16_000_000 ? replaceAll(a, b) : lcsOps(a, b)
  const hunks: string[] = []
  const context = 3
  let i = 0
  while (i < ops.length) {
    if (ops[i]!.type === ' ') { i++; continue }
    const start = Math.max(0, i - context)
    let end = i
    // Extend the hunk while changes are within 2 * context of each other.
    for (let j = i; j < ops.length; j++) {
      if (ops[j]!.type !== ' ') end = j
      else if (j - end > context * 2) break
    }
    end = Math.min(ops.length - 1, end + context)
    const slice = ops.slice(start, end + 1)
    const oldStart = slice[0]!.a, newStart = slice[0]!.b
    const oldCount = slice.filter((op) => op.type !== '+').length
    const newCount = slice.filter((op) => op.type !== '-').length
    hunks.push(
      '@@ -' + (oldCount ? oldStart + 1 : oldStart) + ',' + oldCount + ' +' + (newCount ? newStart + 1 : newStart) + ',' + newCount + ' @@\n' +
        slice.map((op) => op.type + op.text + '\n').join(''),
    )
    i = end + 1
  }
  return '--- ' + fromLabel + '\n+++ ' + toLabel + '\n' + hunks.join('')
}
type Op = { type: ' ' | '-' | '+'; text: string; a: number; b: number }
function split(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}
function replaceAll(a: string[], b: string[]): Op[] {
  return [
    ...a.map((text, index) => ({ type: '-' as const, text, a: index, b: 0 })),
    ...b.map((text, index) => ({ type: '+' as const, text, a: a.length, b: index })),
  ]
}
function lcsOps(a: string[], b: string[]): Op[] {
  // Trim the common head and tail first; most catalog changes touch a few lines.
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++
  const x = a.slice(head, a.length - tail), y = b.slice(head, b.length - tail)
  const table = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1))
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      table[i]![j] = x[i] === y[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
  const ops: Op[] = a.slice(0, head).map((text, index) => ({ type: ' ', text, a: index, b: index }))
  let i = 0, j = 0
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) {
      ops.push({ type: ' ', text: x[i]!, a: head + i, b: head + j }); i++; j++
    } else if (i < x.length && (j === y.length || table[i + 1]![j]! >= table[i]![j + 1]!)) {
      ops.push({ type: '-', text: x[i]!, a: head + i, b: head + j }); i++
    } else {
      ops.push({ type: '+', text: y[j]!, a: head + i, b: head + j }); j++
    }
  }
  for (let k = 0; k < tail; k++)
    ops.push({ type: ' ', text: a[a.length - tail + k]!, a: a.length - tail + k, b: b.length - tail + k })
  return ops
}
