import { expect, it } from 'vitest'
import { previewPath, previewStylesheets } from './routing'

it('routes glass and sidebar to the iframe', () => {
  expect(previewPath('sidebar', 'papier')).toBe('iframe')
  expect(previewPath('button', 'liquid-glass')).toBe('iframe')
  expect(previewPath('button', 'papier')).toBe('inline')
})

it('names the base and component stylesheets', () => {
  expect(previewStylesheets('papier', 'button')).toEqual(['/previews/papier/base.css', '/previews/papier/button.css'])
})
