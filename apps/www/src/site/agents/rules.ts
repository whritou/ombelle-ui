import { accessibilityCaveatLabel, officialSnapshotOrigin } from '@ombelle/contracts'
import { publishedInstaller } from '../../snapshots/install-command'

export type AgentRuleId = 'published-cli' | 'preset' | 'no-preset' | 'dry-run' | 'apply' | 'conflict' | 'unsupported' | 'doctor' | 'glass'

/** One rule a coding agent follows when installing Ombelle. `text` uses backticks for code. */
export type AgentRule = { id: AgentRuleId; text: string }

type Installer = { packageName: string; version: string }

/** The single source of the install rules that llms.txt, the agents guide, the skill and the catalog JSON repeat. */
export function agentRules(installer: Installer = publishedInstaller): AgentRule[] {
  const cli = `${installer.packageName}@${installer.version}`
  return [
    {
      id: 'published-cli',
      text: `Run the published CLI with \`npx ${cli}\` (or the project's \`pnpm dlx\`, \`yarn dlx --quiet\` or \`bunx\` equivalent). Never run \`shadcn add\` and never hand-copy component source.`,
    },
    {
      id: 'preset',
      text: `Initialize with the preset code the developer gives you (\`init --preset ps_…@1\`), or with a preset JSON file they give you.`,
    },
    {
      id: 'no-preset',
      text: `If the developer gave no preset code or file, ask for one and point them to the preset editor at ${officialSnapshotOrigin}/editor/preset. Never write preset JSON yourself.`,
    },
    {
      id: 'dry-run',
      text: 'Run every command that writes files with `--dry-run --json` first, and show the developer the planned changes.',
    },
    {
      id: 'apply',
      text: 'When the plan has no warnings with `resolutions`, rerun the same command with `--yes`. Agents have no TTY, so `--yes` is required.',
    },
    {
      id: 'conflict',
      text: 'On `FILE_CONFLICT`, or any warning with `resolutions`, stop and ask the developer. Offer `--beside <path>` (component files only) or `--overwrite <path>`, and never choose either yourself.',
    },
    {
      id: 'unsupported',
      text: 'On `UNSUPPORTED_PROJECT` or `UNSUPPORTED_RELEASE`, explain the message and its next action to the developer. Do not work around it.',
    },
    {
      id: 'doctor',
      text: 'Finish with `doctor --json` and report its result.',
    },
    {
      id: 'glass',
      text: `Liquid glass is labelled \`${accessibilityCaveatLabel}\` because its contrast depends on the backdrop. Say so whenever you offer it.`,
    },
  ]
}

/** The rules as a numbered Markdown list. */
export function agentRulesMarkdown(installer: Installer = publishedInstaller): string {
  return agentRules(installer)
    .map((rule, index) => `${index + 1}. ${rule.text}`)
    .join('\n')
}
