'use client'

import { usePathname } from 'next/navigation'
import { componentEditorLink } from '../../editor/editable-components'
import { componentDocs } from './catalog'

const groups = [
  { title: 'Getting started', links: [{ href: '/components', label: 'Overview' }, { href: '/#get-started', label: 'Installation' }] },
  { title: 'Components', links: componentDocs.map(doc => ({ href: `/components/${doc.id}`, label: doc.name })) },
  { title: 'Editors', links: [{ href: '/editor/preset', label: 'Preset editor' }, componentEditorLink] },
]

export function ComponentsSidebar({ label = 'Components' }: { label?: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className="space-y-6 text-sm">
      {groups.map(group => (
        <div key={group.title}>
          <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">{group.title}</p>
          <ul className="space-y-0.5">
            {group.links.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={link.href === pathname ? 'page' : undefined}
                  className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-foreground/10 aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
