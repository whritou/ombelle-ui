import { expect, it } from 'vitest'
import { collapseUnchanged, diffSummary, lineDiff } from './line-diff'

it('equal inputs give only same lines', () => {
  expect(lineDiff('a\nb', 'a\nb')).toEqual([
    { kind: 'same', text: 'a', before: 1, after: 1 },
    { kind: 'same', text: 'b', before: 2, after: 2 },
  ])
})

it('an added line', () => {
  const changed = lineDiff('a\nc', 'a\nb\nc').filter((line) => line.kind !== 'same')
  expect(changed).toEqual([{ kind: 'add', text: 'b', after: 2 }])
})

it('a removed line', () => {
  const changed = lineDiff('a\nb\nc', 'a\nc').filter((line) => line.kind !== 'same')
  expect(changed).toEqual([{ kind: 'remove', text: 'b', before: 2 }])
})

it('a moved line', () => {
  expect(diffSummary(lineDiff('a\nb\nc', 'b\nc\na'))).toEqual({ added: 1, removed: 1 })
})

it('CRLF equals LF', () => {
  expect(lineDiff('a\r\nb', 'a\nb').every((line) => line.kind === 'same')).toBe(true)
})

it('empty inputs', () => {
  expect(lineDiff('', '')).toEqual([])
  expect(lineDiff('', 'x')).toEqual([{ kind: 'add', text: 'x', after: 1 }])
})

it('collapse keeps 3 lines of context', () => {
  const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
  const rows = collapseUnchanged(lineDiff(before, before + '\nnew'))
  expect(rows[0]).toEqual({ kind: 'skip', count: 17 })
  expect(rows.slice(1, 4).every((row) => row.kind === 'same')).toBe(true)
  expect(rows[4]).toMatchObject({ kind: 'add', text: 'new' })
  const short = Array.from({ length: 6 }, (_, i) => `s${i}`).join('\n')
  expect(collapseUnchanged(lineDiff(short, short + '\nx')).some((row) => row.kind === 'skip')).toBe(false)
})
