import { describe, expect, it } from 'vitest'
import { officialSnapshotOrigin } from '@ombelle/contracts'
import { publishedInstaller } from '../../snapshots/install-command'
import { agentRules, agentRulesMarkdown } from './rules'

const ids = ['published-cli', 'preset', 'no-preset', 'dry-run', 'apply', 'conflict', 'unsupported', 'doctor', 'glass']

describe('agentRules', () => {
  const rules = agentRules()
  const text = (id: string) => rules.find((rule) => rule.id === id)?.text ?? ''

  it('has every rule once, in order', () => {
    expect(rules.map((rule) => rule.id)).toEqual(ids)
  })

  it('names both conflict resolutions and says to ask the developer', () => {
    expect(text('conflict')).toContain('--overwrite')
    expect(text('conflict')).toContain('--beside')
    expect(text('conflict')).toMatch(/ask the developer/i)
  })

  it('links the preset editor for a missing preset', () => {
    expect(text('no-preset')).toContain(`${officialSnapshotOrigin}/editor/preset`)
  })

  it('labels glass', () => {
    expect(text('glass')).toContain('Accessibility not guaranteed')
  })

  it('names only the installer version', () => {
    const versions = rules.flatMap((rule) => rule.text.match(/@\d+\.\d+\.\d+/g) ?? [])
    expect(versions.length).toBeGreaterThan(0)
    for (const version of versions) expect(version).toBe(`@${publishedInstaller.version}`)
    const custom = agentRules({ packageName: '@ombelle-ui/cli', version: '9.9.9' })
    expect(custom[0]!.text).toContain('@ombelle-ui/cli@9.9.9')
    expect(custom.map((rule) => rule.text).join('\n')).not.toContain(publishedInstaller.version)
  })

  it('renders a numbered list', () => {
    const lines = agentRulesMarkdown().split('\n')
    expect(lines).toHaveLength(ids.length)
    expect(lines[0]).toMatch(/^1\. /)
    expect(lines[8]).toMatch(/^9\. /)
  })
})
