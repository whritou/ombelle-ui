import { documentationGuides } from '../../site/docs/navigation'
import { componentDocs } from '../../site/components/catalog'
import { publishedInstaller } from '../../snapshots/install-command'

export const metadata = { title: 'Documentation · Ombelle UI', description: 'Step-by-step guides to installing Ombelle, creating presets, customizing components, and sharing recipes.' }

export default function DocumentationPage() {
  return <>
    <h1 className="text-4xl font-black md:text-5xl">Build with Ombelle.</h1>
    <p className="mt-5 max-w-2xl text-lg text-muted-foreground">Start with a project theme, add editable React components, then customize the details. These guides cover the current website and CLI {publishedInstaller.version}.</p>
    <div className="prose-doc mt-8">
      <p>Ombelle installs source into your app. You own the component files, while a saved preset supplies shared colors and design values. The catalog contains {componentDocs.length} components, four stable style families, and experimental Liquid Glass, with light and dark modes.</p>
      <h2>Your first project</h2>
      <ol>
        <li><a href="/docs/preset-editor">Design a global preset</a> and download its JSON.</li>
        <li><a href="/docs/getting-started">Initialize your app and add components</a> with the CLI.</li>
        <li><a href="/docs/component-editor">Create a component recipe</a> when one component needs its own look.</li>
      </ol>
    </div>
    <h2 className="mt-12 text-2xl font-black">Guides and reference</h2>
    <ul className="mt-5 divide-y divide-border border-y border-border">
      {documentationGuides.map(guide => <li key={guide.slug}><a href={`/docs/${guide.slug}`} className="group grid gap-1 py-5 sm:grid-cols-[15rem_1fr]">
        <span className="font-bold group-hover:text-primary">{guide.title} →</span>
        <span className="text-sm text-muted-foreground">{guide.description}</span>
      </a></li>)}
    </ul>
    <p className="mt-8 text-sm text-muted-foreground">For component imports, props, states, and live previews, use the <a href="/components" className="font-semibold text-foreground underline underline-offset-4">component API reference</a>. Ombelle is in alpha; check generated output in your app before shipping.</p>
  </>
}
