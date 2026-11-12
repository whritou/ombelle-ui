import { expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ThemeToggle } from './theme'

it('renders the theme toggle as a catalog Toggle that is not pressed before mount', () => {
  // The page's theme class is applied by themeInitScript before React runs, so the first
  // render (server and hydration) must be the same "not pressed" markup; an effect syncs it after mount.
  const html = renderToString(<ThemeToggle />)
  expect(html).toMatch(/<button[^>]*data-slot="toggle"/)
  expect(html).toContain('aria-label="Dark theme"')
  expect(html).toContain('aria-pressed="false"')
  expect(html).toContain('data-variant="outline"')
  expect(html).toContain('data-size="sm"')
  expect(html).toContain('data-state="off"')
})
