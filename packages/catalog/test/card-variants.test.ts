import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement as h, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCatalog, getTemplate } from '../src/index.js'
import { Card, CardDescription, CardGroup, CardLink, CardMedia, CardOption, CardTitle } from '../src/templates/card.js'

const families = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass']
const css = (family: string) => readFileSync(new URL(`../src/styles/card/${family}.css`, import.meta.url), 'utf8')
const plans = (props: Record<string, unknown> = {}) => h(CardGroup, { name: 'plan', 'aria-label': 'Plan', defaultValue: 'team', ...props },
  h(CardOption, { value: 'starter', title: 'Starter', description: 'One project.' }),
  h(CardOption, { value: 'team', title: 'Team', description: 'Selected option.' }),
  h(CardOption, { value: 'enterprise', title: 'Enterprise', disabled: true }))
const inputs = (html: string) => [...html.matchAll(/<input[^>]*>/g)].map(match => match[0])

describe('Card 0.7.3 variants', () => {
  it('stays a server component in both editions, with the new parts and slots', () => {
    const catalog = getCatalog('0.1.0')
    const card = getTemplate(catalog, 'card')
    expect(card.content).not.toMatch(/use client/)
    expect(card.slots).toEqual(['card', 'card-header', 'card-title', 'card-description', 'card-content', 'card-footer',
      'card-link', 'card-media', 'card-group', 'card-option', 'card-option-check'])
    expect(getTemplate(catalog, 'card', 'base').content).toBe(card.content)
    expect(card.dependencies.map(d => d.name)).toEqual(['react', 'clsx', 'tailwind-merge'])
  })

  it('groups native radios under one name, named by their titles and described by their descriptions', () => {
    const html = renderToStaticMarkup(plans())
    expect(html).toMatch(/<div[^>]*role="radiogroup"[^>]*aria-label="Plan"/)
    const radios = inputs(html)
    expect(radios).toHaveLength(3)
    for (const radio of radios) {
      expect(radio).toContain('type="radio"')
      expect(radio).toContain('name="plan"')
    }
    const team = radios.find(radio => radio.includes('value="team"'))!
    expect(team).toContain('checked=""')
    expect(radios.filter(radio => radio.includes('checked=""'))).toHaveLength(1)
    const labelledby = /aria-labelledby="([^"]+)"/.exec(team)![1]
    const describedby = /aria-describedby="([^"]+)"/.exec(team)![1]
    expect(html).toContain(`id="${labelledby}">Team</span>`)
    expect(html).toContain(`id="${describedby}">Selected option.</p>`)
    expect(radios.find(radio => radio.includes('value="enterprise"'))).toContain('disabled=""')
    expect(radios.find(radio => radio.includes('value="enterprise"'))).not.toContain('aria-describedby')
    expect(html).toMatch(/data-slot="card-option-check"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-slot="card-option-check"/)
  })

  it('controls the checked option with value and reports changes through onValueChange', () => {
    const onValueChange = vi.fn()
    const html = renderToStaticMarkup(plans({ defaultValue: undefined, value: 'starter', onValueChange }))
    expect(inputs(html).find(radio => radio.includes('value="starter"'))).toContain('checked=""')
    const group = CardGroup({ name: 'plan', value: 'starter', onValueChange, children: [h(CardOption, { key: 'e', value: 'enterprise', title: 'Enterprise' })] })
    const option = (group.props.children as ReactElement<{ onValueChange?: (value: string) => void; value: string }>[])[0]!
    expect(option.props.value).toBe('enterprise')
    option.props.onValueChange?.('enterprise')
    expect(onValueChange).toHaveBeenCalledWith('enterprise')
  })

  it('renders CardLink as an anchor with its marker, leaving other controls outside it', () => {
    const html = renderToStaticMarkup(h(Card, {}, h(CardTitle, {}, h(CardLink, { href: '#featured' }, 'Website refresh')),
      h(CardDescription, {}, 'Whole card is the link.'), h('button', { type: 'button' }, 'Share')))
    expect(html).toMatch(/<a[^>]*href="#featured"[^>]*>Website refresh<\/a>/)
    expect(html).toMatch(/<a[^>]*data-slot="card-link"/)
    expect(html).toMatch(/<a[^>]*data-card-link=""/)
    expect(/<a[^>]*>([^]*?)<\/a>/.exec(html)![1]).not.toContain('<button')
    expect(html).toContain('<button type="button">Share</button>')
  })

  it('renders CardMedia as a cover image, or a custom cover', () => {
    expect(renderToStaticMarkup(h(CardMedia, { src: '/cover.png', alt: '' }))).toMatch(/<img[^>]*data-slot="card-media"[^>]*alt=""|<img[^>]*alt=""[^>]*data-slot="card-media"/)
    expect(renderToStaticMarkup(h(CardMedia, { src: '/cover.png', alt: 'Team photo' }))).toContain('data-card-media=""')
    expect(renderToStaticMarkup(h(CardMedia, { children: h('span', {}, 'Cover') }))).toMatch(/<div[^>]*data-slot="card-media"[^>]*aria-hidden="true"|<div[^>]*aria-hidden="true"[^>]*data-slot="card-media"/)
  })

  it.each(families)('%s styles the stretched link, options and media with one data-slot per selector', family => {
    const text = css(family)
    expect(text).toMatch(/\[data-slot='card-link'\]::after\s*\{[^}]*inset: 0/)
    expect(text).toMatch(/\[data-slot='card'\]:has\(\[data-card-link\]:focus-visible\)/)
    expect(text).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\[data-slot='card'\]:has\(\[data-card-link\]\):hover\s*\{[^}]*translateY\(-2px\)/)
    expect(text).toMatch(/\[data-slot='card-option'\]:has\(:checked\)\s*\{[^}]*var\(--primary\)/)
    expect(text).toMatch(/\[data-slot='card-option'\]:has\(:focus-visible\)/)
    expect(text).toMatch(/:checked ~ \[data-slot='card-option-check'\]/)
    expect(text).toMatch(/\[data-slot='card'\]:has\(> \[data-card-media\]\)/)
    expect(text).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*\[data-slot='card-option'\]:has\(:checked\)[^}]*Highlight/)
    // Older family rules are not this batch's; check the 0.7.3 block only.
    for (const match of text.slice(text.indexOf('/* 0.7.3 variants */')).matchAll(/^([^{}@\n][^{}]*)\{/gm))
      for (const selector of match[1]!.split(','))
        expect((selector.match(/data-slot=/g) ?? []).length, selector).toBeLessThanOrEqual(1)
  })
})
