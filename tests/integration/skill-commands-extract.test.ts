import { describe, expect, it } from 'vitest'
import { extractSkillCommands } from '../helpers/skill-commands.js'

describe('extractSkillCommands', () => {
  it('returns arguments of runner lines inside fences only', () => {
    const md = [
      'Run `npx @ombelle-ui/cli@<version> info` in prose.',
      'npx @ombelle-ui/cli@<version> doctor --json',
      '```sh',
      'npx @ombelle-ui/cli@<version> add <component> --dry-run --json',
      'echo unrelated',
      'pnpm dlx @ombelle-ui/cli@<version> doctor --json',
      'yarn dlx --quiet @ombelle-ui/cli@<version> info --json',
      'bunx @ombelle-ui/cli@<version> --version',
      'npx other-tool@<version> run',
      '```',
      'npx @ombelle-ui/cli@<version> after-fence',
    ].join('\n')
    expect(extractSkillCommands(md)).toEqual([
      'add <component> --dry-run --json',
      'doctor --json',
      'info --json',
      '--version',
    ])
  })

  it('handles longer fences and CRLF', () => {
    const md =
      '````\r\nnpx @ombelle-ui/cli@<version> info\r\n```\r\nnpx @ombelle-ui/cli@<version> doctor\r\n````\r\n'
    expect(extractSkillCommands(md)).toEqual(['info', 'doctor'])
  })
})
