import type { ReactNode } from 'react'

export type TextPiece = { code: boolean; text: string }

/** Splits text on backtick pairs into plain and code pieces; an unmatched backtick stays plain text. */
export function splitCodeSpans(text: string): TextPiece[] {
  const pieces: TextPiece[] = []
  const pattern = /`([^`]+)`/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) pieces.push({ code: false, text: text.slice(last, match.index) })
    pieces.push({ code: true, text: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) pieces.push({ code: false, text: text.slice(last) })
  return pieces
}

/** Renders text with its backtick spans as `<code>`. */
export function ruleText(text: string): ReactNode {
  return splitCodeSpans(text).map((piece, index) => piece.code ? <code key={index}>{piece.text}</code> : piece.text)
}
