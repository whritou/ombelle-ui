import type { ReactNode } from 'react'

export default function BlocksLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-7xl px-5 md:px-10">
      {children}
    </main>
  )
}
