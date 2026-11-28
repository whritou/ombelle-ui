import { FoundationError, supportedComponentIds } from '@ombelle/contracts'
import type { Resolution } from './project/beside.js'

/** Every command the 1.0 CLI runs, by the name its output reports. */
export const commandNames = [
  'init', 'add', 'update', 'theme add', 'preset apply', 'preset show', 'info', 'doctor', 'diff',
] as const
export type CommandName = (typeof commandNames)[number]

export const booleanFlags = ['--json', '--yes', '--dry-run', '--offline'] as const
export const valueFlags = [
  '--cwd', '--preset', '--package-manager', '--recipe', '--snapshot-origin', '--preset-hash', '--recipe-hash', '--only',
] as const
export const repeatableFlags = ['--overwrite', '--beside'] as const

export type ParsedArgs = {
  command: CommandName
  /** Operands after the command words: component ids, or the preset input of theme add / preset apply. */
  operands: string[]
  flags: Partial<Record<(typeof booleanFlags)[number], true>> &
    Partial<Record<(typeof valueFlags)[number], string>>
  resolutions: [Resolution, string][]
}
export type Request =
  | { kind: 'help' }
  | { kind: 'version' }
  | ({ kind: 'run' } & ParsedArgs)

/** Flags each command accepts beyond --json and --cwd. Anything else is refused before any work. */
const accepted: Record<CommandName, readonly string[]> = {
  init: ['--preset', '--yes', '--dry-run', '--package-manager', '--snapshot-origin', '--preset-hash', '--offline'],
  add: ['--preset', '--recipe', '--yes', '--dry-run', '--package-manager', '--snapshot-origin', '--preset-hash', '--recipe-hash', '--offline', '--overwrite', '--beside'],
  update: ['--yes', '--dry-run', '--package-manager', '--overwrite'],
  'theme add': ['--yes', '--dry-run', '--package-manager', '--snapshot-origin', '--preset-hash', '--offline'],
  'preset apply': ['--only', '--yes', '--dry-run', '--package-manager', '--snapshot-origin', '--preset-hash', '--offline'],
  'preset show': [],
  info: [],
  doctor: ['--package-manager'],
  diff: [],
}

/**
 * Parses the 1.0 grammar: `--flag value` or `--flag=value`, `-h`/`--help`, `--version`. A token that
 * starts with `-` and is not a known flag is refused rather than read as a component id (PUB-16).
 */
export function parseArgs(args: readonly string[]): Request {
  if (args.includes('--help') || args.includes('-h')) return { kind: 'help' }
  if (args.includes('--version')) return { kind: 'version' }
  const flags: Record<string, string | true> = {}
  const resolutions: [Resolution, string][] = []
  const words: string[] = []
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!
    if (!token.startsWith('-') || token === '-') {
      words.push(token)
      continue
    }
    const equals = token.startsWith('--') ? token.indexOf('=') : -1
    const name = equals > 0 ? token.slice(0, equals) : token
    const inline = equals > 0 ? token.slice(equals + 1) : undefined
    const value = (): string => {
      const next = inline ?? args[i + 1]
      if (next === undefined || next === '' || (inline === undefined && next.startsWith('-')))
        throw new FoundationError('INVALID_DATA', 'Missing flag value', name)
      if (inline === undefined) i++
      return next
    }
    if ((repeatableFlags as readonly string[]).includes(name))
      resolutions.push([name.slice(2) as Resolution, value()])
    else if ((booleanFlags as readonly string[]).includes(name)) {
      if (inline !== undefined) throw new FoundationError('INVALID_DATA', name + ' takes no value', name)
      if (Object.hasOwn(flags, name)) throw new FoundationError('INVALID_DATA', 'Repeated flag', name)
      flags[name] = true
    } else if ((valueFlags as readonly string[]).includes(name)) {
      if (Object.hasOwn(flags, name)) throw new FoundationError('INVALID_DATA', 'Repeated flag', name)
      flags[name] = value()
    } else throw new FoundationError('INVALID_DATA', 'Unknown flag', name, 'Run --help for the supported flags.')
  }
  const [first, second] = words
  let command: CommandName
  let operands: string[]
  if (first === 'theme' && second === 'add') [command, operands] = ['theme add', words.slice(2)]
  else if (first === 'preset' && (second === 'apply' || second === 'show'))
    [command, operands] = [('preset ' + second) as CommandName, words.slice(2)]
  else if (first && ['init', 'add', 'update', 'info', 'doctor', 'diff'].includes(first))
    [command, operands] = [first as CommandName, words.slice(1)]
  else
    throw new FoundationError(
      'INVALID_DATA',
      first ? 'Unknown command: ' + words.slice(0, 2).join(' ') : 'Choose a command',
      undefined,
      'Run --help for the supported commands.',
    )
  for (const flag of [...Object.keys(flags), ...resolutions.map(([kind]) => '--' + kind)])
    if (flag !== '--json' && flag !== '--cwd' && !accepted[command].includes(flag))
      throw Object.assign(
        new FoundationError('INVALID_DATA', flag + ' is not an option of ' + command, flag, 'Run --help for the options of each command.'),
        { command },
      )
  return { kind: 'run', command, operands, flags: flags as ParsedArgs['flags'], resolutions }
}

export function usage(): string {
  return [
    'Usage: ombelle <command> [options]',
    '',
    'Commands:',
    '  init --preset <file|code>              Save a project preset and merge its theme',
    '  add <component...>                     Install components with the saved preset',
    '  add button --preset <file|code>        Install a Button with its own preset (Radix only)',
    '  add --recipe <file|code>               Install a recipe component (Radix only)',
    '  update [<component...>]                Refresh managed source the catalog changed',
    '  preset apply <file|code> [--only theme]  Switch the project preset and refresh components',
    '  theme add <file|code>                  Same as preset apply --only theme',
    '  preset show                            Print the saved preset and its provenance',
    '  info                                   Print project, installed files and their state',
    '  doctor                                 Check runtime, project and installed files',
    '  diff [<component...>]                  Show managed source that differs from the catalog',
    '',
    'Options:',
    '  --cwd <app>              Target application (default: current directory)',
    '  --dry-run                Plan and print; write nothing',
    '  --yes                    Apply a plan without the prompt; never resolves conflicts',
    '  --json                   One JSON record on stdout (outputVersion 1)',
    '  --package-manager <npm|pnpm|yarn|bun>',
    '  --overwrite <path>       add, update, preset apply: replace an unmanaged file or a managed file',
    '                           you edited after install',
    '  --beside <path>          add: install beside an unmanaged component file',
    '  --snapshot-origin <origin> --preset-hash <hex64> --recipe-hash <hex64> --offline',
    '                           Codes from another service, or offline from the verified cache',
    '  --help, -h   --version',
    '',
    'Preset inputs are a local JSON file or an exact code ps_<32 hex>@1; recipe inputs a file or rc_<32 hex>@1.',
    'Bare codes resolve at https://ombelle-ui.com. Other origins need --snapshot-origin and the',
    'matching --preset-hash or --recipe-hash. HTTPS is required except literal loopback HTTP. --offline needs',
    'an explicit origin, hash and verified cache entry, and cannot detect later withdrawals.',
    '',
    'Supported: React 19 (react and react-dom 19.x tested; React 18 and older refused; newer majors',
    'accepted untested, with a notice); Vite React TSX or Next.js App Router TSX with Tailwind CSS v4; npm,',
    'pnpm, Yarn 1 and 2+, Bun 1.4.3 or newer (tested below 2); Node 24.19.0 or newer (tested below 27).',
    'Browsers: Chromium-tested; Safari and Firefox are untested.',
    '',
    'Components: ' + supportedComponentIds.join(' '),
  ].join('\n')
}
