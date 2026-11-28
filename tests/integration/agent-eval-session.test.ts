import { describe, expect, it } from 'vitest'
import { commandsFromList } from '../../scripts/agent-evals/session.js'

describe('commandsFromList', () => {
  it('reads one command per line and ignores fences and blank lines', () => {
    expect(commandsFromList('```commands\nls -la\n\nnpx @ombelle-ui/cli@1.1.2 doctor --json\r\n```\n')).toEqual([
      { command: 'ls -la' },
      { command: 'npx @ombelle-ui/cli@1.1.2 doctor --json' },
    ])
  })
})
