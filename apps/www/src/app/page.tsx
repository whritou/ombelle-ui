import { ArrowRight, MousePointerClick, Palette, Sparkles } from 'lucide-react'
import { componentEditorLink } from '../editor/editable-components'
import { HeroSection } from '../site/home/hero'
import { JourneySection } from '../site/home/journey'
import { CascadeSection, MatrixSection, PresetSection, TerminalSection } from '../site/home/sections'
import { StyleMorphSection } from '../site/home/style-morph'
import { repository } from '../site/links'
import { familyList } from '../site/families'
import { glassComponentList, glassGatedOnSite } from '../site/components/catalog'
import { installerRunner, publishedInstaller } from '../snapshots/install-command'

export const metadata = {
  title: 'Ombelle UI — Your components. Your style.',
  description:
    `Editable, accessible React components on shadcn and Radix UI for Vite and Next.js with Tailwind v4, in ${familyList()} styles with persistent project presets.`,
}

const release = `${publishedInstaller.packageName}@${publishedInstaller.version}`
const npx = installerRunner(publishedInstaller)

const steps = [
  {
    title: 'Set up your project',
    text: 'Run it from your app folder with your preset code. The installer shows every file and dependency change and asks before writing anything. Dependency installs run with lifecycle scripts disabled.',
    command: `${npx} init --preset PRESET`,
  },
  {
    title: 'Add components',
    text: 'Components use the saved project preset. Add several at once, for example button dialog input.',
    command: `${npx} add button`,
  },
]

const editors = [
  {
    href: '/editor/preset',
    icon: Palette,
    title: 'Global preset editor',
    text: 'Choose a style family, palette and tokens for the whole project, then publish a preset code or download its JSON.',
  },
  {
    href: componentEditorLink.href,
    icon: MousePointerClick,
    title: componentEditorLink.label,
    text: 'Customize one Button and export it as a recipe that installs next to your existing components.',
  },
]

const eyebrow = 'font-mono text-xs uppercase tracking-[0.2em] text-primary'
const codeBlock = 'whitespace-pre-wrap break-all rounded-xl border border-border bg-ink px-4 py-3 font-mono text-sm text-paper dark:bg-card dark:text-card-foreground'

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <MatrixSection />
      <StyleMorphSection />

      <section aria-label="Liquid glass" className="mx-auto max-w-6xl px-5 py-12">
        <div className="o-glass flex flex-col items-start justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <div>
              <p className="font-display font-bold">Liquid Glass</p>
              <p className="text-sm text-muted-foreground">Translucent surfaces with blur, an opaque fallback, and contrast checked for their text pairs over any backdrop. Experimental for {glassComponentList({ published: true })}{glassGatedOnSite() ? '; the other components need a newer installer.' : '.'}</p>
            </div>
          </div>
          <a href="/editor/preset" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground/30 hover:bg-muted active:bg-foreground/10">
            <span className="font-mono text-xs uppercase tracking-wider text-primary">Experimental</span> Try it in the preset editor
          </a>
        </div>
      </section>

      <CascadeSection />
      <TerminalSection release={release} />
      <PresetSection />
      <JourneySection release={release} />

      <section aria-labelledby="editors" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className={eyebrow}>No install needed</p>
        <h2 id="editors" className="mt-3 text-4xl font-black md:text-5xl">Design in the browser.</h2>
        <p className="mt-4 max-w-lg text-muted-foreground">Drafts stay in your browser until you publish. Ombelle has no accounts.</p>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {editors.map(editor => (
            <li key={editor.href}>
              <a href={editor.href} className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary hover:bg-muted/50 active:bg-muted">
                <editor.icon className="size-6 text-primary" aria-hidden />
                <span className="mt-4 font-display text-2xl font-black">{editor.title}</span>
                <span className="mt-2 text-muted-foreground">{editor.text}</span>
                <span className="mt-6 inline-flex items-center gap-2 font-semibold">
                  Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="get-started" className="scroll-mt-20 border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <p className={eyebrow}>Get started</p>
          <h2 id="get-started" className="mt-3 text-4xl font-black md:text-5xl">Three commands.<br />Nothing hidden.</h2>
          <p className="mt-5 max-w-2xl text-muted-foreground">
            You need Node 24 and an existing Vite React TSX or Next.js App Router TSX app with Tailwind v4. Replace{' '}
            <code className="font-mono text-foreground">APP</code> with its directory and{' '}
            <code className="font-mono text-foreground">PRESET</code> with a published preset code (such as{' '}
            <code className="font-mono text-foreground">ps_…@1</code>) or the path to a downloaded{' '}
            <code className="font-mono text-foreground">project-preset.json</code>. React Native is not supported.
          </p>
          <ol className="mt-10 space-y-6">
            {steps.map((step, i) => (
              <li key={step.title} className="grid gap-3 md:grid-cols-[3rem_1fr]">
                <span aria-hidden className="font-mono text-sm text-primary">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="mt-1 text-muted-foreground">{step.text}</p>
                  <pre className={`mt-3 ${codeBlock}`}><code>{step.command}</code></pre>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-16 grid gap-10 lg:grid-cols-2">
            <div className="min-w-0">
              <h3 className="text-2xl font-black">Already using shadcn?</h3>
              <p className="mt-3 text-muted-foreground">
                If you already initialized shadcn, add the styling to the project instead. This command merges the palette and tokens into your globals.css and saves the preset for later installs, without reinstalling your existing component source. It shows the changes and asks before writing.
              </p>
              <pre className={`mt-4 ${codeBlock}`}><code>{`${npx} theme add PRESET`}</code></pre>
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-black">Other package runners</h3>
              <p className="mt-3 text-muted-foreground">
                Every command works the same way through pnpm, Bun or Yarn 4. The runner you choose does not change your app&apos;s package manager.
              </p>
              <ul className="mt-4 space-y-2">
                {[`pnpm dlx ${release}`, `bunx ${release}`, `yarn dlx --quiet ${release}`].map(runner => (
                  <li key={runner}><code className={`block ${codeBlock}`}>{runner}</code></li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Yarn 4 refuses package versions published less than 24 hours ago, so <code className="font-mono text-foreground">yarn dlx</code> works from a day after each release. Keep <code className="font-mono text-foreground">--quiet</code> so Yarn&apos;s own output does not break <code className="font-mono text-foreground">--json</code>. Yarn Classic has no <code className="font-mono text-foreground">dlx</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="feedback" className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 id="feedback" className="text-3xl font-black md:text-4xl">Local-first. Early. Open to feedback.</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Ombelle is in alpha — try the components in your own app and help shape what ships next.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#get-started" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-foreground px-6 font-semibold text-background transition-colors hover:bg-foreground/85 active:bg-foreground/75">
            Get started <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href={`${repository}/issues`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-6 font-semibold transition-colors hover:border-foreground/30 hover:bg-muted active:bg-foreground/10">
            Share feedback on GitHub
          </a>
        </div>
      </section>
    </main>
  )
}
