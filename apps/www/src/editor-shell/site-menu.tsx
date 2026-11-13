'use client'

import { Menu } from 'lucide-react'
import { useRef, useState } from 'react'
import styles from './editor-shell.module.css'
import { primaryLinks, repository } from '../site/links'
import { GithubIcon } from '../site/logo'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../generated/ui/components/ui/sheet'

/**
 * The site's navigation for the editors below 1200px, where the site header is not shown: a
 * button at the start of the top bar opening the site links in a side sheet.
 */
export function SiteMenu() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={trigger} type="button" className={styles.siteMenuButton} aria-label="Site menu" aria-haspopup="dialog"
        aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu aria-hidden="true" size={18} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="inline-start" aria-label="Site menu" className={styles.phoneSheet}
          onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus() }}>
          <SheetHeader>
            <SheetTitle>Site menu</SheetTitle>
            <SheetDescription className="sr-only">Site navigation.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Site" className={styles.siteMenuLinks}>
            {primaryLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
            <a href={repository}><GithubIcon className="size-4" /> GitHub</a>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
