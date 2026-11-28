import { describe, expect, it } from 'vitest'
import { splitCodeSpans } from './rule-text'

describe('splitCodeSpans', () => {
  it('splits backtick spans from plain text', () => {
    expect(splitCodeSpans('Run `npx x` now, then `doctor`.')).toEqual([
      { code: false, text: 'Run ' },
      { code: true, text: 'npx x' },
      { code: false, text: ' now, then ' },
      { code: true, text: 'doctor' },
      { code: false, text: '.' },
    ])
  })

  it('returns plain text unchanged and drops empty pieces', () => {
    expect(splitCodeSpans('plain')).toEqual([{ code: false, text: 'plain' }])
    expect(splitCodeSpans('`a`')).toEqual([{ code: true, text: 'a' }])
  })

  it('leaves an unmatched backtick as text', () => {
    expect(splitCodeSpans('a ` b')).toEqual([{ code: false, text: 'a ` b' }])
  })
})
