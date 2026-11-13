import { expect, it } from 'vitest'
import { codeLanguage } from './code-language'

it('names the language by the title extension, with CSS for styles and material titles', () => {
  expect(codeLanguage('components/ui/button.css')).toBe('css')
  expect(codeLanguage('Ombelle styles')).toBe('css')
  expect(codeLanguage('Liquid Glass · shared material')).toBe('css')
  expect(codeLanguage('rc_primary-button.JSON')).toBe('json')
  expect(codeLanguage('install.sh')).toBe('shell')
  expect(codeLanguage('components/ui/button.tsx')).toBe('tsx')
  expect(codeLanguage('CLI commands')).toBe('tsx')
  expect(codeLanguage(undefined)).toBe('tsx')
})
