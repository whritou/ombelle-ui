import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { desktopQuery, phoneQuery, tabletQuery, useViewportClass, viewportClass } from './breakpoints'

/** Evaluates the min-width and max-width parts of a media query at one viewport width. */
function evaluate(query: string, width: number): boolean {
  const min = /min-width:\s*(\d+)px/.exec(query)
  const max = /max-width:\s*(\d+)px/.exec(query)
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]))
}

it('uses the decided breakpoints', () => {
  expect(phoneQuery).toBe('(max-width: 767px)')
  expect(tabletQuery).toBe('(min-width: 768px) and (max-width: 1199px)')
  expect(desktopQuery).toBe('(min-width: 1200px)')
})

it('classifies widths at 767, 768, 1199 and 1200', () => {
  const at = (width: number) => (query: string) => evaluate(query, width)
  expect(viewportClass(at(320))).toBe('phone')
  expect(viewportClass(at(767))).toBe('phone')
  expect(viewportClass(at(768))).toBe('tablet')
  expect(viewportClass(at(1199))).toBe('tablet')
  expect(viewportClass(at(1200))).toBe('desktop')
})

function Probe() {
  return <span>{useViewportClass()}</span>
}

it('renders desktop on the server', () => {
  expect(renderToStaticMarkup(<Probe />)).toBe('<span>desktop</span>')
})
