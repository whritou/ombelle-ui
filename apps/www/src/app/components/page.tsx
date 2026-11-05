import { ComponentDirectory } from '../../site/components/directory'
import { familyList } from '../../site/families'

export const metadata = {
  title: 'Components · Ombelle UI',
  description: `Browse Ombelle components in ${familyList()} and compare Liquid Glass presets.`,
}

export default function ComponentsPage() {
  return (
    <main className="min-w-0 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Components</p>
      <h1 className="mt-3 text-4xl font-black md:text-5xl">Components</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Explore the Ombelle catalog in light and dark mode. Choose a Liquid Glass preset to use it when opening a component preview.
      </p>
      <ComponentDirectory />
    </main>
  )
}
