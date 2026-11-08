import type { ReactNode } from 'react'
import { DocumentationSidebar } from '../../site/docs/sidebar'

export default function DocumentationLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14 lg:py-16">
    <aside><DocumentationSidebar /></aside>
    <main className="min-w-0">{children}</main>
  </div>
}
