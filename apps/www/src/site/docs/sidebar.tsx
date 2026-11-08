'use client'

import { usePathname } from 'next/navigation'
import { documentationGuides } from './navigation'

export function DocumentationSidebar() {
  const pathname = usePathname()
  return <nav aria-label="Documentation" className="lg:sticky lg:top-24">
    <a href="/docs" aria-current={pathname === '/docs' ? 'page' : undefined} className="block rounded-md px-3 py-2 font-bold hover:bg-muted aria-[current=page]:bg-muted">Documentation</a>
    <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
      {documentationGuides.map(guide => {
        const href = `/docs/${guide.slug}`
        return <li key={guide.slug}><a href={href} aria-current={pathname === href ? 'page' : undefined} className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:font-semibold aria-[current=page]:text-foreground">{guide.title}</a></li>
      })}
    </ul>
    <a href="/components" className="mt-4 block border-t border-border px-3 py-3 text-sm font-semibold hover:text-primary">Component API reference →</a>
  </nav>
}
