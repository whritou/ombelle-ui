'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { GithubIcon, Logo } from './logo'
import { primaryLinks, repository } from './links'
import { ThemeToggle } from './theme'

export function SiteHeader() {
  const pathname = usePathname()
  const current = (href: string) => (href === pathname ? 'page' : undefined)
  // Pages that embed preview iframes scroll the header away: a pinned header
  // would cover iframe content and intercept clicks inside it.
  const pinned = !/^\/(editor|presets|recipes)\//.test(pathname)
  return (
    <header className={`${pinned ? 'sticky top-0' : 'relative'} z-40 border-b border-border bg-background`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">alpha</span>
        </div>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {primaryLinks.map(link => (
            <a key={link.href} href={link.href} aria-current={current(link.href)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground">
              {link.label}
            </a>
          ))}
          <a href={repository} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <GithubIcon className="size-4" /> GitHub
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button type="button" aria-label="Open menu" className="inline-flex size-11 items-center justify-center rounded-full border border-border md:hidden">
                <Menu className="size-5" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
              <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-border bg-background p-6 text-foreground shadow-soft">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="font-display text-lg font-bold">Menu</Dialog.Title>
                  <Dialog.Close asChild>
                    <button type="button" aria-label="Close menu" className="inline-flex size-11 items-center justify-center rounded-full border border-border">
                      <X className="size-4" aria-hidden />
                    </button>
                  </Dialog.Close>
                </div>
                <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                  {[...primaryLinks, { href: repository, label: 'GitHub' }].map(link => (
                    <a key={link.href} href={link.href} aria-current={current(link.href)} className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted aria-[current=page]:bg-muted">
                      {link.label}
                    </a>
                  ))}
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  )
}
