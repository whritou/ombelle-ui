import type { CodeLanguage } from '../../generated/ui/components/ui/code-block'

/** The language a title names by its extension; CSS blocks titled "… styles" or "… material" read as CSS. */
export function codeLanguage(title: string | undefined): CodeLanguage {
  const name = (title ?? '').toLowerCase()
  if (name.endsWith('.css') || / styles$| material$/.test(name)) return 'css'
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.sh')) return 'shell'
  return 'tsx'
}
