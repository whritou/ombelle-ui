'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { componentEditorLink } from '../editor/editable-components'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '../generated/ui/components/ui/navigation-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../generated/ui/components/ui/sheet'
import { categoryAnchor, categoryNames } from './components/component-names'
import { documentationGuides } from './docs/navigation'
import { GithubIcon, Logo } from './logo'
import { primaryLinks, repository } from './links'
import { ThemeToggle } from './theme'

// Each page's main landmark carries id="main" and tabIndex={-1}, so the link skips any sidebar too.
const skipLinkClass = 'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground'

export function SiteHeader() {
  const pathname = usePathname()
  const current = (href: string) => {
    const section = href === '/docs' || href === '/components' || href === '/blocks' || href === componentEditorLink.href
    return href === pathname || (section && pathname.startsWith(`${href}/`)) ? 'page' : undefined
  }
  // Pages that embed preview iframes scroll the header away: a pinned header
  // would cover iframe content and intercept clicks inside it.
  const pinned = !/^\/(editor|presets|recipes)\//.test(pathname)
  // Below 1200px the editors fill the viewport and carry their own navigation.
  const editor = pathname.startsWith('/editor/')
  return (
    <>
    {/* The editors hide the header below 1200px, so they keep their own skip link there. */}
    {editor && <a href="#main" className={`${skipLinkClass} min-[1200px]:hidden focus:z-50`}>Skip to content</a>}
    <header className={`${pinned ? 'sticky top-0' : 'relative'} z-40 border-b border-border bg-background ${editor ? 'max-[1199px]:hidden' : ''}`}>
      <a href="#main" className={skipLinkClass}>
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Logo />
          {/* Hidden from 768 to 1023 px, where the inline navigation needs the room. */}
          <span className="hidden rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline md:hidden lg:inline">alpha</span>
        </div>
        {/* The breakpoint sits on a wrapper: the catalog stylesheet sets the menu's own display. */}
        <div className="hidden md:block">
        <NavigationMenu aria-label="Primary" className="site-header-menu">
          <NavigationMenuList>
            <NavigationMenuItem><NavigationMenuLink href="/#get-started" variant="trigger">Get started</NavigationMenuLink></NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger data-current={current('/docs') ? '' : undefined}>Docs</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="/docs" active={pathname === '/docs'}><span>Documentation</span><p>Every guide, from installing to sharing presets</p></NavigationMenuLink>
                {documentationGuides.map(guide => (
                  <NavigationMenuLink key={guide.slug} href={`/docs/${guide.slug}`} active={pathname === `/docs/${guide.slug}`}><span>{guide.title}</span><p>{guide.description}</p></NavigationMenuLink>
                ))}
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger data-current={current('/components') ? '' : undefined}>Components</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="/components" active={pathname === '/components'}><span>All components</span><p>The catalog, by category, with live previews</p></NavigationMenuLink>
                {categoryNames().map(group => (
                  <NavigationMenuLink key={group.title} href={`/components#${categoryAnchor(group.title)}`}><span>{group.title}</span><p>{group.names.join(', ')}</p></NavigationMenuLink>
                ))}
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem><NavigationMenuLink href="/blocks" variant="trigger" active={current('/blocks') === 'page'}>Blocks</NavigationMenuLink></NavigationMenuItem>
            <NavigationMenuItem><NavigationMenuLink href="/editor/preset" variant="trigger" active={current('/editor/preset') === 'page'}>Preset editor</NavigationMenuLink></NavigationMenuItem>
            <NavigationMenuItem><NavigationMenuLink href={componentEditorLink.href} variant="trigger" active={current(componentEditorLink.href) === 'page'}>{componentEditorLink.label}</NavigationMenuLink></NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href={repository} variant="trigger" aria-label="GitHub"><GithubIcon className="size-4" /><span className="hidden lg:inline">GitHub</span></NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <button type="button" aria-label="Open menu" className="inline-flex size-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted active:bg-foreground/10 md:hidden">
                <Menu className="size-5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent side="inline-end" aria-describedby={undefined} className="site-menu-sheet">
              {/* The sheet draws its own Close button; a second one here would sit beside it. */}
              <SheetTitle>Menu</SheetTitle>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {[...primaryLinks, { href: repository, label: 'GitHub' }].map(link => (
                  <a key={link.href} href={link.href} aria-current={current(link.href)} className="rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-muted active:bg-foreground/10 aria-[current=page]:bg-muted">
                    {link.label}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
    </>
  )
}
