import { notFound } from 'next/navigation'
import { documentationGuides } from '../../../site/docs/navigation'
import { guideSections } from '../../../site/docs/guides'

export const dynamicParams = false
export function generateStaticParams() {
  return documentationGuides.map(({ slug }) => ({ slug }))
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const current = documentationGuides.find(guide => guide.slug === slug)
  return current ? { title: `${current.title} · Ombelle UI`, description: current.description } : {}
}
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const index = documentationGuides.findIndex(guide => guide.slug === slug)
  const guide = documentationGuides[index]
  if (!guide) notFound()
  const sections = guideSections[guide.slug]
  const previous = documentationGuides[index - 1], next = documentationGuides[index + 1]
  return <>
    <p className="text-sm text-muted-foreground"><a href="/docs" className="hover:text-primary">Documentation</a> / {guide.title}</p>
    <h1 className="mt-4 text-4xl font-black md:text-5xl">{guide.title}</h1>
    <p className="mt-5 text-lg text-muted-foreground">{guide.description}</p>
    <nav aria-label="On this page" className="mt-8 rounded-xl border border-border p-5">
      <p className="text-sm font-bold">On this page</p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">{sections.map(section => <li key={section.id}><a href={`#${section.id}`} className="hover:text-primary hover:underline">{section.title}</a></li>)}</ul>
    </nav>
    <div className="prose-doc mt-10 max-w-[75ch]">{sections.map(section => <section key={section.id} aria-labelledby={section.id}>
      <h2 id={section.id} className="scroll-mt-24">{section.title}</h2>
      {section.content}
    </section>)}</div>
    <nav aria-label="More guides" className="mt-14 flex flex-wrap justify-between gap-5 border-t border-border pt-6 text-sm font-semibold">
      {previous ? <a href={`/docs/${previous.slug}`} className="hover:text-primary">← {previous.title}</a> : <a href="/docs" className="hover:text-primary">← Documentation</a>}
      {next && <a href={`/docs/${next.slug}`} className="hover:text-primary">{next.title} →</a>}
    </nav>
  </>
}
