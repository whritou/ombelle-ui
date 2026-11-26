import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { supportedBlockIds, type BlockId } from '@ombelle/contracts'
import { blockDoc, blockDocs, blockGlassAvailable } from '../../../site/blocks/catalog'
import { BlockPlayground } from '../../../site/blocks/block-playground'
import { componentDoc } from '../../../site/components/catalog'
import { CodeBlockCommand } from '../../../generated/ui/components/ui/code-block'
import { blockSources } from '../../../generated/previews/blocks'
import { publishedInstaller } from '../../../snapshots/install-command'

export const dynamicParams = false

export function generateStaticParams() {
  return supportedBlockIds.map(id => ({ id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const doc = blockDoc((await params).id)
  return doc ? { title: `${doc.title} block · Ombelle UI`, description: doc.description } : {}
}

const release = `${publishedInstaller.packageName}@${publishedInstaller.version}`
// The frame's height before the block reports its own.
const initialHeights: Record<BlockId, number> = { 'login-01': 640, 'settings-01': 900, 'pricing-01': 900, 'dashboard-01': 1100 }
const linkClass = 'font-medium text-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary hover:decoration-2'

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const doc = blockDoc((await params).id)
  if (!doc) notFound()
  const index = blockDocs.indexOf(doc)
  const previous = blockDocs[index - 1], next = blockDocs[index + 1]
  const glass = blockGlassAvailable(doc)
  return (
    <div className="py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary"><Link href="/blocks" className="underline-offset-4 hover:underline">Blocks</Link></p>
      <h1 className="mt-3 text-4xl font-black md:text-5xl">{doc.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{doc.description}</p>

      <section aria-label="Example" className="mt-8">
        {/* Keyed: links navigate on the client, and each block starts from its own default preview. */}
        <BlockPlayground key={doc.id} id={doc.id} title={doc.title} sources={blockSources[doc.id]} glassAvailable={glass} initialHeight={initialHeights[doc.id]} />
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="installation" className="min-w-0">
          <h2 id="installation" className="text-2xl font-black">Installation</h2>
          <p className="mt-2 text-muted-foreground">
            Run in a project initialized with an Ombelle preset (see <a href="/docs/getting-started" className={linkClass}>Get started</a>). The block uses the saved project preset. Run the command from your app folder; it shows the changes and asks before writing.
          </p>
          <div className="mt-4">
            <CodeBlockCommand args={`${release} add ${doc.id}`} runners={{ yarn: 'yarn dlx --quiet' }} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Adds <code className="font-mono text-foreground">components/blocks/{doc.id}.tsx</code> and <code className="font-mono text-foreground">{doc.id}.css</code> beside your components folder, and the components the block uses. A component you already installed and edited is kept as it is. Blocks need {publishedInstaller.packageName} 1.1.0 or later.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {glass
              ? 'In a liquid glass project the plan adds a notice that accessibility is not guaranteed, because text contrast depends on the background behind the glass.'
              : `${doc.title} is not available in liquid glass; the CLI refuses it in glass projects.`}
          </p>
        </section>
        <aside className="space-y-8">
          <section aria-labelledby="components">
            <h2 id="components" className="text-lg font-black">Components it installs</h2>
            <ul aria-labelledby="components" className="mt-3 flex flex-wrap gap-2">
              {doc.components.map(id => (
                <li key={id}>
                  <Link href={`/components/${id}`} className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-sm font-medium transition-colors hover:bg-muted active:bg-foreground/10">{componentDoc(id)?.name ?? id}</Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="example-only">
            <h2 id="example-only" className="text-lg font-black">Example only</h2>
            <p className="mt-2 text-sm text-muted-foreground">These flows show a notice instead of contacting a server. Replace them with your own calls.</p>
            <ul aria-labelledby="example-only" className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {doc.exampleOnly.map(flow => <li key={flow}>{flow}</li>)}
            </ul>
          </section>
        </aside>
      </div>

      <nav aria-label="Pagination" className="mt-14 flex justify-between gap-4 border-t border-border pt-6 text-sm">
        {previous ? <Link href={`/blocks/${previous.id}`} className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors hover:bg-muted active:bg-foreground/10"><ArrowLeft className="size-4" aria-hidden /> {previous.title}</Link> : <span />}
        {next && <Link href={`/blocks/${next.id}`} className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors hover:bg-muted active:bg-foreground/10">{next.title} <ArrowRight className="size-4" aria-hidden /></Link>}
      </nav>
    </div>
  )
}
