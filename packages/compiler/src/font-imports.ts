/**
 * Removes the registry font `@import` lines, for a surface that cannot resolve a bare
 * package specifier (the editor preview loads the same files from its own bundle).
 */
export function stripFontImports(css: string): string {
  return css.replace(/@import\s+(?:url\(\s*)?(['"])@fontsource(?:-variable)?\/[^'"]*\1\s*\)?\s*;?/g, '')
}
