import * as React from 'react'
import { Prose, ProseLead } from '@/components/ui/prose'
import { NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu'

// The 0.9 app shell components in both editions (tests/e2e/app-shell-09.spec.ts).
// scripts/generate-preview.ts copies this file next to each edition's scenario.

function ProseArticle() {
  const [measure, setMeasure] = React.useState<'narrow' | 'default' | 'wide'>('default')
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div role="group" aria-label="Measure" style={{ display: 'flex', gap: '0.5rem' }}>
        {(['narrow', 'default', 'wide'] as const).map(value => (
          <button key={value} type="button" aria-pressed={measure === value} onClick={() => setMeasure(value)}>{value}</button>
        ))}
      </div>
      <Prose data-testid="s09-prose" measure={measure}>
        <h1>Building an app shell</h1>
        <ProseLead>A sidebar, a header and a content area that reads well at any width.</ProseLead>
        <h2>Install</h2>
        <p>Add the <code>sidebar</code> component, press <kbd>Ctrl</kbd> + <kbd>B</kbd> to fold it, and read <a href="#install">the install guide</a>.</p>
        <p>Long addresses wrap: https://ombelle.dev/docs/components/sidebar/collapsible-icon-mode-with-tooltips-and-a-phone-sheet</p>
        <h3>What changes</h3>
        <ul><li>Collapses to icons on desktop<ul><li>Names stay in tooltips</li></ul></li><li>Opens as a sheet on phones</li></ul>
        <ol><li>Install</li><li>Wrap the layout</li></ol>
        <blockquote>Keep navigation where people expect it.<footer>Sidebar design notes</footer></blockquote>
        <hr />
        <h4>Sizes</h4>
        <table data-testid="s09-prose-table">
          <thead><tr>{Array.from({ length: 12 }, (_, index) => <th key={index}>Column {index + 1}</th>)}</tr></thead>
          <tbody><tr>{Array.from({ length: 12 }, (_, index) => <td key={index}>{index * 16}px</td>)}</tr></tbody>
        </table>
      </Prose>
    </div>
  )
}

const docLinks = [
  { href: '#introduction', title: 'Introduction', description: 'What Ombelle is and how it works' },
  { href: '#installation', title: 'Installation', description: 'Add Ombelle to a project' },
  { href: '#theming', title: 'Theming', description: 'Presets, families and tokens' },
]

function SiteNavigation() {
  return (
    <div data-testid="s09-nav" style={{ minBlockSize: '18rem' }}>
      <NavigationMenu aria-label="Main">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              {docLinks.map(link => (
                <NavigationMenuLink key={link.href} href={link.href}><span>{link.title}</span><p>{link.description}</p></NavigationMenuLink>
              ))}
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Components</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#button"><span>Button</span></NavigationMenuLink>
              <NavigationMenuLink href="#sidebar"><span>Sidebar</span></NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#blog" variant="trigger" active>Blog</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

export function AppShellScenario09() {
  return (
    <section aria-label="0.9 app shell" data-testid="app-shell-09" style={{ display: 'grid', gap: '1.5rem', minInlineSize: 0 }}>
      <SiteNavigation />
      <ProseArticle />
    </section>
  )
}
