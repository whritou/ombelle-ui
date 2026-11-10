import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Alert, AlertActions, AlertDescription, AlertDismiss, AlertTitle } from '../src/templates/alert.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const css = (family: string) => readFileSync(new URL(`../src/styles/alert/${family}.css`, import.meta.url), 'utf8')

describe('Alert 0.7.3 variants', () => {
  it('renders a Dismiss button only with onDismiss, and calls it on click', () => {
    expect(renderToStaticMarkup(h(Alert, {}, h(AlertTitle, {}, 'Saved')))).not.toContain('alert-dismiss')
    const onDismiss = vi.fn()
    const element = Alert({ onDismiss, children: h(AlertTitle, {}, 'New version available') })
    const html = renderToStaticMarkup(element)
    const button = /<button[^>]*data-slot="alert-dismiss"[^>]*>/.exec(html)![0]
    expect(button).toContain('type="button"')
    expect(button).toContain('aria-label="Dismiss"')
    const dismiss = (element.props.children as React.ReactElement[]).flat().find(
      (child): child is React.ReactElement<{ onClick: () => void }> => typeof child === 'object' && child !== null && (child as React.ReactElement).type === AlertDismiss)!
    dismiss.props.onClick()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renames the Dismiss button with dismissLabel, and AlertDismiss with label', () => {
    expect(renderToStaticMarkup(h(Alert, { onDismiss: () => {}, dismissLabel: 'Close notice' }))).toContain('aria-label="Close notice"')
    expect(renderToStaticMarkup(h(AlertDismiss, { label: 'Hide' }))).toContain('aria-label="Hide"')
    expect(renderToStaticMarkup(h(AlertDismiss))).toMatch(/aria-hidden="true"/)
  })

  it('marks the Alert dismissible for onDismiss or a child AlertDismiss only', () => {
    expect(renderToStaticMarkup(h(Alert, {}, h(AlertTitle, {}, 'Saved')))).not.toContain('data-dismissible')
    expect(renderToStaticMarkup(h(Alert, { onDismiss: () => {} }))).toContain('data-dismissible="true"')
    expect(renderToStaticMarkup(h(Alert, {}, h(AlertTitle, {}, 'Saved'), h(AlertDismiss)))).toContain('data-dismissible="true"')
  })

  it('provides AlertActions and the compact layout', () => {
    expect(renderToStaticMarkup(h(AlertActions, {}, 'Copy'))).toContain('data-slot="alert-actions"')
    expect(renderToStaticMarkup(h(Alert, {}, h(AlertDescription, {}, 'One seat left')))).not.toContain('data-layout')
    expect(renderToStaticMarkup(h(Alert, { layout: 'compact' }))).toContain('data-layout="compact"')
  })

  it.each(families)('%s styles the dismiss button, actions and compact layout', family => {
    const text = css(family)
    expect(text).toContain("[data-slot='alert-dismiss']")
    expect(text).toMatch(/\[data-slot='alert-dismiss'\]\s*\{[^}]*inline-size: 1\.75rem/)
    expect(text).toContain("[data-slot='alert-actions']")
    expect(text).toContain("[data-slot='alert'][data-layout='compact']")
    expect(text).toMatch(/\[data-slot='alert'\]\[data-dismissible\]\s*\{[^}]*padding-inline-end/)
  })
})
