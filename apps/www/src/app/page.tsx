import { installerRunner, publishedInstaller } from '../snapshots/install-command'

export const metadata = {
  title: 'Ombelle',
  description:
    'Source-distributed React components for Vite and Next.js with Tailwind v4, three style families and persistent project presets.',
}

const repository = 'https://github.com/whritou/ombelle-ui'
const release = `${publishedInstaller.packageName}@${publishedInstaller.version}`
const npx = installerRunner(publishedInstaller)

const steps = [
  {
    title: 'Review the setup plan',
    text: 'Point the installer at your app and a preset. A dry run reports every file and dependency change as JSON and writes nothing.',
    command: `${npx} init --preset PRESET --cwd APP --dry-run --json`,
  },
  {
    title: 'Apply it',
    text: 'Accept the reviewed plan. --yes never bypasses schema, compatibility or modified-file conflicts, and dependency installs run with lifecycle scripts disabled.',
    command: `${npx} init --preset PRESET --cwd APP --yes`,
  },
  {
    title: 'Add components',
    text: 'Components use the saved project preset. Add several at once, for example button dialog input.',
    command: `${npx} add button --cwd APP --yes`,
  },
]

export default function HomePage() {
  return (
    <main>
      <h1>Ombelle</h1>
      <p>
        Ombelle installs editable React component source into your own Vite or
        Next.js App Router project using Tailwind v4. Choose one of three style
        families — flat, minimalist or neo brutalism — each with light and dark
        modes, and save it as a project preset so every component you add later
        uses the same defaults. The installed code is yours to change.
      </p>
      <p>
        The web alpha covers Button, Badge, Card, Input, Textarea, Label,
        Checkbox, Switch, Native Select, Dialog, Tabs and Tooltip. Liquid glass
        is not available yet, and React Native is not supported. Ombelle has no
        accounts.
      </p>

      <nav aria-label="Editors">
        <h2>Design in the browser</h2>
        <ul>
          <li>
            <a href="/editor/preset">Global preset editor</a>: choose a style
            family, palette and tokens for the whole project, then publish a
            preset code or download its JSON.
          </li>
          <li>
            <a href="/editor/component/button">Button editor</a>: customize one
            Button and export it as a recipe.
          </li>
        </ul>
        <p>Drafts stay in your browser until you publish.</p>
      </nav>

      <section aria-labelledby="get-started">
        <h2 id="get-started">Get started</h2>
        <p>
          You need Node 24 and an existing Vite React TSX or Next.js App Router
          TSX app with Tailwind v4. Replace <code>APP</code> with its directory
          and <code>PRESET</code> with a published preset code (such as{' '}
          <code>ps_…@1</code>) or the path to a downloaded{' '}
          <code>project-preset.json</code>.
        </p>
        <ol>
          {steps.map(step => (
            <li key={step.title}>
              <p>
                <strong>{step.title}.</strong> {step.text}
              </p>
              <pre>
                <code>{step.command}</code>
              </pre>
            </li>
          ))}
        </ol>

        <h2>Already using shadcn?</h2>
        <p>
          If you already initialized shadcn, add the styling to the project
          instead. This command merges the palette and tokens into your
          globals.css and saves the preset for later installs, without
          reinstalling your existing component source. Review the plan, then run
          it again with <code>--yes</code>.
        </p>
        <pre>
          <code>{`${npx} theme add PRESET --cwd APP --dry-run --json`}</code>
        </pre>

        <h2>Other package runners</h2>
        <p>
          Every command works the same way through pnpm, Bun or Yarn 4. The
          runner you choose does not change your app&apos;s package manager.
        </p>
        <ul>
          <li>
            <code>pnpm dlx {release}</code>
          </li>
          <li>
            <code>bunx {release}</code>
          </li>
          <li>
            <code>yarn dlx --quiet {release}</code>
          </li>
        </ul>
        <p>
          Yarn 4 refuses package versions published less than 24 hours ago, so{' '}
          <code>yarn dlx</code> works from a day after each release. Keep{' '}
          <code>--quiet</code> so Yarn&apos;s own output does not break{' '}
          <code>--json</code>. Yarn Classic has no <code>dlx</code>.
        </p>
      </section>

      <footer>
        <p>
          <a href={repository}>Source on GitHub</a> ·{' '}
          <a href="/privacy">Privacy and data retention</a> ·{' '}
          <a href="/security">Support and security</a>
        </p>
      </footer>
    </main>
  )
}
