import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Logo, LogoImages } from '../site/logo'

// The sheet itself renders in a portal when opened, so its title is checked through the part it is made of.
it('LogoImages draws both inks as decoration, so the place using the logo names itself', () => {
  const html = renderToStaticMarkup(<LogoImages className="h-7 w-auto" />)
  expect(html).toContain('/ombelle-logo-dark.png')
  expect(html).toContain('/ombelle-logo-white.png')
  expect(html.match(/alt=""/g)).toHaveLength(2)
  expect(html).toContain('dark:hidden')
  expect(html).toContain('dark:block')
  expect(html).not.toContain('<a')
})

it('Logo is still the home link, named "Ombelle UI home"', () => {
  const html = renderToStaticMarkup(<Logo />)
  expect(html).toContain('href="/"')
  expect(html).toContain('aria-label="Ombelle UI home"')
  expect(html).toContain('h-6 w-auto sm:h-7')
})
