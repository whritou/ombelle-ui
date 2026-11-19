'use client'

import { Menu } from 'lucide-react'
import { useRef, useState } from 'react'
import styles from './editor-shell.module.css'
import { primaryLinks, repository } from '../site/links'
import { GithubIcon, LogoImages } from '../site/logo'
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
        <SheetContent side="inline-start" className={styles.phoneSheet}
          onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus() }}>
          <SheetHeader>
            {/* The sheet is titled with the site's logo, as the header is; the name is for assistive technology.
                Its button says what it opens. */}
            <SheetTitle>
              <LogoImages className="h-7 w-auto" />
              <span className="sr-only">Ombelle</span>
            </SheetTitle>
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
