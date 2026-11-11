import * as React from 'react'
import { createRoot } from 'react-dom/client'
import type { RecipeSpecimen as RecipeSpecimenNode } from '@ombelle/compiler'
import type { AuditData, AuditEdition, AuditSpecimen } from '../../../scripts/generate-audit'
import { auditData } from './generated/audit'
import { scopedCatalogComponents } from './generated/catalog-recipes'
import { LiquidGlassFilter as RecipeGlassFilter } from './generated/catalog-recipes/liquid-glass-filter'
// The glass scenes are page backdrop, not editor stage CSS: the kit scene exists only in this stylesheet.
import './glass-backdrop.css'
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'
import { renderSpecimen, type Primitives } from './render-specimen'

type Module = Record<string, unknown>
const stylesheets = import.meta.glob('./generated/editions/*/preview.css')
const editionModules = import.meta.glob<Module>('./generated/editions/*/components/ui/*.tsx')

// Base UI parts are forwardRef or memo objects, not plain functions.
const isComponent = (value: unknown) => typeof value === 'function' ||
  (typeof value === 'object' && value !== null && '$$typeof' in value)
const asPrimitives = (modules: Module[]): Primitives =>
  Object.assign({}, ...modules.map(module => Object.fromEntries(Object.entries(module).filter(([, value]) => isComponent(value)))))

const find = (specimen: RecipeSpecimenNode, tag: string): RecipeSpecimenNode | undefined => specimen.tag === tag ? specimen
  : specimen.children.flatMap(child => typeof child === 'string' ? [] : [find(child, tag)]).find(Boolean)
const text = (specimen: RecipeSpecimenNode | undefined) => specimen?.children.filter(child => typeof child === 'string').join('') ?? ''

/** Base UI Toast has no open prop: it is shown through its manager, as the catalog's Base usage example does. */
function BaseToastSpecimen({ specimen, primitives }: { specimen: RecipeSpecimenNode; primitives: Primitives }) {
  const { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } = primitives
  const useToastManager = primitives.useToastManager as unknown as () => {
    add(toast: { title: string; description: string }): void; toasts: { id: string; title?: React.ReactNode; description?: React.ReactNode }[]
  }
  const close = find(specimen, 'ToastClose')?.props ?? {}
  function Notifications() {
    const manager = useToastManager()
    return <>
      <button type="button" onClick={() => manager.add({ title: text(find(specimen, 'ToastTitle')), description: text(find(specimen, 'ToastDescription')) })}>
        Show notification
      </button>
      <ToastViewport>{manager.toasts.map(item => <Toast key={item.id} toast={item}>
        <ToastTitle>{item.title}</ToastTitle><ToastDescription>{item.description}</ToastDescription><ToastClose {...close} />
      </Toast>)}</ToastViewport>
    </>
  }
  return <ToastProvider><Notifications /></ToastProvider>
}

/** One recipe specimen as `add --recipe` installs it: scoped primitives, its own CSS and, for glass, its own filter. */
function RecipeSpecimen({ item, factory, glass }: { item: AuditSpecimen; factory: Module; glass: boolean }) {
  const id = React.useId()
  const scope = item.scope!
  const instance = glass ? scope + id.replace(/[^a-zA-Z0-9_-]/g, '_') : undefined
  const primitives = React.useMemo(() => (factory.createScopedPrimitives as (scope: string, instance?: string) => Primitives)(scope, instance), [factory, scope, instance])
  return <>
    <style>{item.css}</style>
    {instance && <RecipeGlassFilter scope={scope} instance={instance} />}
    {renderSpecimen(item.specimen, primitives, id)}
  </>
}

function OrdinarySpecimen({ item, primitives, edition }: { item: AuditSpecimen; primitives: Primitives; edition: AuditEdition }) {
  const id = React.useId()
  if (edition === 'base' && item.component === 'toast') return <BaseToastSpecimen specimen={item.specimen} primitives={primitives} />
  return renderSpecimen(item.specimen, primitives, id)
}

function AuditPage({ data, mode, ordinary, factories }: {
  data: AuditData; mode: 'light' | 'dark'; ordinary: Primitives; factories: Record<string, Module>
}) {
  const main = React.useRef<HTMLElement>(null)
  const glass = data.family === 'liquid-glass'
  const scene = data.backdrop[mode]
  React.useEffect(() => {
    let active = true
    document.fonts.ready.then(() => {
      if (active) main.current?.setAttribute('data-ready', 'true')
    })
    return () => { active = false }
  }, [])
  const OrdinaryFilter = ordinary.LiquidGlassFilter
  return <main ref={main} data-audit-page="" style={{ display: 'grid', gap: '2rem', padding: '2rem', position: 'relative' }}>
    {scene && <GlassBackdropArt scene={scene} />}
    {glass && OrdinaryFilter && <OrdinaryFilter />}
    <h1>Specimen audit: {data.family} / {data.edition} / {mode}</h1>
    {data.specimens.map(item => <section key={item.component} data-audit={item.component}
      style={{ display: 'grid', gap: '0.75rem', inlineSize: 'min(100%, 40rem)', position: 'relative' }}>
      <h2>{item.component}</h2>
      {/* Normal flow, as in an app: grid items would stretch inline components such as Badge to the full width. */}
      <div>
        {item.scope
          ? <RecipeSpecimen item={item} factory={factories[item.component]} glass={glass} />
          : <OrdinarySpecimen item={item} primitives={ordinary} edition={data.edition} />}
      </div>
    </section>)}
  </main>
}

export async function mountAuditPage(root: HTMLElement, family: string, edition: AuditEdition): Promise<void> {
  const mode = new URLSearchParams(window.location.search).get('mode') === 'dark' ? 'dark' : 'light'
  const load = auditData[`${family}-${edition}`]
  const page = createRoot(root)
  if (!load) return page.render(<main><h1>Unknown audit page</h1></main>)
  const data = (await load()).default
  const folder = `./generated/editions/${family}-${edition}`
  await stylesheets[`${folder}/preview.css`]!()
  // Ordinary components: all of them on Base pages; Button (no recipe) and the glass filter on Radix pages.
  const ordinaryNames = edition === 'base'
    ? Object.keys(editionModules).filter(path => path.startsWith(`${folder}/components/ui/`))
    : [`${folder}/components/ui/button.tsx`, `${folder}/components/ui/liquid-glass-filter.tsx`].filter(path => path in editionModules)
  const ordinary = asPrimitives(await Promise.all(ordinaryNames.map(path => editionModules[path]!())))
  const recipes = data.specimens.filter(item => item.scope)
  const factories = Object.fromEntries(await Promise.all(recipes.map(async item =>
    [item.component, await scopedCatalogComponents[item.component as keyof typeof scopedCatalogComponents]()] as const)))
  document.documentElement.classList.toggle('dark', mode === 'dark')
  setGlassBackdrop(document.documentElement, data.backdrop[mode] ?? undefined)
  page.render(<AuditPage data={data} mode={mode} ordinary={ordinary} factories={factories} />)
}
