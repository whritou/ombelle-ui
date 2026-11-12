'use client'
import * as React from 'react'

// highlight:start
type CodeLanguage = 'tsx' | 'css' | 'json' | 'shell' | 'text'

type CodeToken = 'comment' | 'string' | 'keyword' | 'tag' | 'attr' | 'number' | 'property' | 'punct' | 'flag'

/**
 * One alternation per language; the first group that matches names the token kind.
 * Line-based on purpose: generated output keeps comments and strings on one line,
 * and a missed multi-line token only loses colour, never text.
 */
const codeGrammars: Record<Exclude<CodeLanguage, 'text'>, { pattern: RegExp; kinds: CodeToken[] }> = {
  tsx: {
    pattern:
      /(\/\/.*$|\/\*.*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|\b(import|from|export|default|function|return|const|let|type|interface|extends|as|true|false|null|undefined|if|else)\b|(?<=<\/?)([A-Za-z][\w.]*)|([A-Za-z_][\w-]*)(?==)|(\b\d+(?:\.\d+)?\b)|([{}()[\]<>/=;,.])/gm,
    kinds: ['comment', 'string', 'keyword', 'tag', 'attr', 'number', 'punct'],
  },
  css: {
    pattern:
      /(\/\*.*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(@[\w-]+)|(--[\w-]+|[a-z-]+)(?=\s*:)|(-?\b\d*\.?\d+(?:px|rem|em|%|ms|s|deg)?\b)|([{}()[\];:,>])/gm,
    kinds: ['comment', 'string', 'keyword', 'property', 'number', 'punct'],
  },
  json: {
    pattern: /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)|([{}[\]:,])/gm,
    kinds: ['property', 'string', 'keyword', 'number', 'punct'],
  },
  shell: {
    pattern: /(#.*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(^\s*[\w@./-]+)|(\s--?[\w-]+)/gm,
    kinds: ['comment', 'string', 'keyword', 'flag'],
  },
}

function highlightLine(line: string, language: CodeLanguage): React.ReactNode[] {
  if (language === 'text') return line ? [line] : []
  const { pattern, kinds } = codeGrammars[language]
  const nodes: React.ReactNode[] = []
  let last = 0
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(line.slice(last, index))
    const group = match.slice(1).findIndex((value) => value !== undefined)
    nodes.push(
      <span key={index} data-token={kinds[group] ?? 'punct'}>
        {match[0]}
      </span>,
    )
    last = index + match[0].length
  }
  if (last < line.length) nodes.push(line.slice(last))
  return nodes
}

/**
 * Highlighted lines for a read-only code view. Each line is a span so CSS counters
 * can number them; the text content stays exactly the input, newlines included.
 */
function highlightCode(code: string, language: CodeLanguage): React.ReactNode[] {
  const trailing = code.endsWith('\n')
  const lines = (trailing ? code.slice(0, -1) : code).split('\n')
  return lines.map((line, index) => (
    <span key={index} data-slot="code-block-line">
      {highlightLine(line, language)}
      {index < lines.length - 1 || trailing ? '\n' : null}
    </span>
  ))
}
// highlight:end

export { highlightCode }
export type { CodeLanguage, CodeToken }
