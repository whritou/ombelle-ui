import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, SlidersHorizontal } from 'lucide-react'
import { getCatalog } from '@ombelle/catalog'
import { styleSupport } from '@ombelle/contracts'
import { editableComponents } from '../../../editor/editable-components'
import { componentDoc, componentDocs, componentInstallable, glassOnSite } from '../../../site/components/catalog'
import { CodeBlock, CommandTabs } from '../../../site/components/code-block'
import { ComponentPlayground } from '../../../site/components/playground'
import { publishedInstaller } from '../../../snapshots/install-command'
import { familyList } from '../../../site/families'

export const dynamicParams = false

export function generateStaticParams() {
  return componentDocs.map(doc => ({ id: doc.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const doc = componentDoc((await params).id)
  return doc ? { title: `${doc.name} · Ombelle UI`, description: doc.description } : {}
}

const release = `${publishedInstaller.packageName}@${publishedInstaller.version}`
const sections = [
  { id: 'installation', label: 'Installation' },
  { id: 'usage', label: 'Usage' },
  { id: 'api', label: 'API and states' },
]

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const doc = componentDoc((await params).id)
  if (!doc) notFound()
  const template = getCatalog('0.1.0').templates[doc.id]
  const index = componentDocs.indexOf(doc)
  const glass = styleSupport(doc.id, 'liquid-glass')
  const installable = componentInstallable(doc)
  const editor = editableComponents.find(component => component.id === doc.id)
  const previous = componentDocs[index - 1], next = componentDocs[index + 1]
  return (
    <div className="grid gap-10 py-10 xl:grid-cols-[minmax(0,1fr)_11rem]">
      <main className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Components</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black md:text-5xl">{doc.name}</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{doc.description}</p>
          </div>
          {editor && (
            <a href={editor.href} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground transition-[filter] hover:brightness-110 active:brightness-95">
              <SlidersHorizontal className="size-4" aria-hidden /> Customize
            </a>
          )}
        </div>

        <section aria-label="Example" className="mt-8">
          <ComponentPlayground id={doc.id} name={doc.name} source={template.content} styles={template.styles ?? {}} />
        </section>

        <section aria-labelledby="installation" className="mt-14 scroll-mt-24">
          <h2 id="installation" className="text-2xl font-black">Installation</h2>
          <p className="mt-2 text-muted-foreground">
            Run in a project initialized with an Ombelle preset (see <a href="/#get-started" className="font-medium text-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary hover:decoration-2">Get started</a>). The component uses the saved project preset. Run the command from your app folder; it shows the changes and asks before writing.
          </p>
          {installable ? (
            <>
              <div className="mt-4">
                <CommandTabs release={release} args={`add ${doc.id}`} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Adds <code className="font-mono text-foreground">{template.logicalPath}</code> and installs {template.dependencies.map(d => d.name).join(', ')} with lifecycle scripts disabled.
                {doc.client && ' This is a client component.'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {glassOnSite(doc.id)
                  ? `In a liquid glass project the plan adds a notice that liquid-glass is experimental for ${doc.id}.`
                  : `With the published CLI, add ${doc.id} is refused with STYLE_UNAVAILABLE in a liquid glass project.`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Requires CLI {doc.minimumCli}. The live preview uses the current catalog.
            </p>
          )}
        </section>

        <section aria-labelledby="usage" className="mt-14 scroll-mt-24">
          <h2 id="usage" className="text-2xl font-black">Usage</h2>
          <div className="mt-4">
            <CodeBlock code={doc.usage} title="example.tsx" />
          </div>
          {doc.note && <p className="mt-3 text-sm text-muted-foreground">{doc.note}</p>}
        </section>

        <section aria-labelledby="api" className="mt-14 scroll-mt-24">
          <h2 id="api" className="text-2xl font-black">API and states</h2>
          <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-card text-sm">
            {[['API', doc.api], ['Minimum states', doc.states], ['Native basis', doc.basis], ['Styles', `Stable in ${familyList()}, light and dark. Liquid glass: ${glass === 'experimental' ? 'experimental' : 'not available'}.`]].map(([term, value]) => (
              <div key={term} className="grid gap-1 p-4 sm:grid-cols-[10rem_1fr]">
                <dt className="font-medium">{term}</dt>
                <dd className="text-muted-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav aria-label="Pagination" className="mt-14 flex justify-between gap-4 border-t border-border pt-6 text-sm">
          {previous ? <a href={`/components/${previous.id}`} className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors hover:bg-muted active:bg-foreground/10"><ArrowLeft className="size-4" aria-hidden /> {previous.name}</a> : <span />}
          {next && <a href={`/components/${next.id}`} className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors hover:bg-muted active:bg-foreground/10">{next.name} <ArrowRight className="size-4" aria-hidden /></a>}
        </nav>
      </main>
      <div className="hidden xl:block">
        <nav aria-label="On this page" className="sticky top-24 text-sm">
          <p className="mb-2 font-semibold">On this page</p>
          <ul className="space-y-2">
            {sections.map(s => <li key={s.id}><a href={`#${s.id}`} className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline hover:decoration-primary">{s.label}</a></li>)}
          </ul>
        </nav>
      </div>
    </div>
  )
}
