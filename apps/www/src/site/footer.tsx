import { GithubIcon, Logo } from './logo'
import { primaryLinks, repository } from './links'

const linkClass = 'text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline hover:decoration-primary'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Alpha release. APIs and styles may change. Components for Radix UI and Base UI projects.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {primaryLinks.slice(1).map(link => (
            <a key={link.href} href={link.href} className={linkClass}>{link.label}</a>
          ))}
          <a href="/privacy" className={linkClass}>Privacy and data retention</a>
          <a href="/security" className={linkClass}>Support and security</a>
          <a href={repository} className={`inline-flex items-center gap-1.5 ${linkClass}`}>
            <GithubIcon className="size-4" /> Source on GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
