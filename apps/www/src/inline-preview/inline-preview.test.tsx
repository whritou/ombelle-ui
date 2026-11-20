import { renderToPipeableStream } from 'react-dom/server'
import { Writable } from 'node:stream'
import { expect, it, vi } from 'vitest'
import type { ComponentId } from '@ombelle/contracts'
import { InlinePreview } from './inline-preview'
import { previewStylesheets } from './routing'

vi.mock('./routing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./routing')>()
  return { ...actual, clientOnly: new Set<ComponentId>(['calendar']) }
})

// No built-in family leaves a component unavailable today, so the gate is driven by this flag.
const gate = vi.hoisted(() => ({ unavailable: [] as string[] }))
vi.mock('@ombelle/contracts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ombelle/contracts')>()
  return {
    ...actual,
    componentsWithStyleSupport: (family: never, levels: never) =>
      (levels as string[]).includes('unavailable') ? gate.unavailable : actual.componentsWithStyleSupport(family, levels),
  }
})

// next/dynamic renders nothing under vitest (no Next loadable runtime), so the registry is replaced with the
// real specimen components, imported synchronously.
vi.mock('../generated/previews', async () => ({
  inlineSpecimens: {
    button: (await import('../generated/previews/specimens/button')).Specimen,
    calendar: (await import('../generated/previews/specimens/calendar')).Specimen,
  },
  specimenOnly: {},
}))

// Hoisted stylesheet links suspend, so wait for every boundary instead of using renderToString., so wait for every boundary instead of using renderToString.
function html(node: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = ''
    const sink = new Writable({
      write(chunk, _enc, done) {
        out += chunk.toString()
        done()
      },
    })
    sink.on('finish', () => resolve(out))
    const stream = renderToPipeableStream(node, {
      onAllReady: () => stream.pipe(sink),
      onError: reject,
    })
  })
}

it('server-renders the specimen with its stylesheets', async () => {
  const out = await html(<InlinePreview id="button" family="ombelle" mode="auto" height={420} />)
  expect(out).toContain('data-preview-family="ombelle"')
  expect(out).toContain('data-preview-mode="auto"')
  expect(out).toContain('data-focus="button"')
  expect(out).toContain('class="preset-gallery"')
  expect(out).toContain('data-slot="pv-button"')
  for (const href of previewStylesheets('ombelle', 'button')) {
    expect(out).toMatch(new RegExp(`<link rel="stylesheet" href="${href}"[^>]*data-precedence="ombelle-preview"`))
  }
})

it('renders the unavailable placeholder', async () => {
  gate.unavailable = ['button']
  const out = await html(<InlinePreview id="button" family="papier" mode="auto" height={300} />)
  gate.unavailable = []
  expect(out).toContain('data-unavailable=""')
  expect(out).toContain('data-component="button"')
  expect(out).toContain('<strong>Button</strong><span>Unavailable in <!-- -->Papier</span>')
  expect(out).not.toContain('data-slot="pv-button"')
})

it('server-renders a skeleton for client-only components', async () => {
  const out = await html(<InlinePreview id="calendar" family="papier" mode="light" height={333} />)
  expect(out).toMatch(/data-preview-skeleton[^>]*height:333px/)
  expect(out).not.toContain('data-slot="pv-calendar"')
})

it("preloads the Ombelle faces its specimen shows, before layout asks for them", async () => {
  const out = await html(<InlinePreview id="button" family="ombelle" mode="auto" height={420} />)
  const preloads = [...out.matchAll(/<link rel="preload"[^>]*as="font"[^>]*>/g)].map((match) => match[0])
  expect(preloads).toHaveLength(1)
  expect(preloads[0]).toContain('href="/previews/fonts/figtree-latin-wght-normal.woff2"')
  expect(preloads[0]).toContain('type="font/woff2"')
  expect(preloads[0]).toMatch(/crossorigin="(anonymous)?"/)
  // Another family's fonts load when it is picked (family-fonts.ts), so its stage preloads none of Ombelle's.
  expect(await html(<InlinePreview id="button" family="papier" mode="auto" height={420} />)).not.toMatch(/as="font"/)
})
