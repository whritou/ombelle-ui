import { expect, it } from 'vitest'
import type { ProjectContext } from '@ombelle/contracts'
import { assertKnownCatalogIds, closestCatalogIds, splitCatalogIds } from '../src/component-ids.js'
import { installedBlockIds } from '../src/project/status.js'

it('accepts component and block ids together', () => {
  expect(() => assertKnownCatalogIds(['login-01', 'button'])).not.toThrow()
})

it('names the closest block with the stable code', () => {
  expect(() => assertKnownCatalogIds(['login-1'])).toThrow(
    expect.objectContaining({
      code: 'UNKNOWN_COMPONENT',
      message: 'Unknown component or block: login-1 (did you mean login-01?)',
    }),
  )
  expect(closestCatalogIds('login-1')).toEqual(['login-01'])
})

it('lists components, then blocks, as the next action', () => {
  try {
    assertKnownCatalogIds(['zzz'])
    expect.unreachable()
  } catch (error) {
    const next = (error as { nextAction: string }).nextAction
    expect(next.indexOf('button')).toBeGreaterThan(-1)
    expect(next.indexOf('login-01')).toBeGreaterThan(next.indexOf('button'))
  }
})

it('splits ids into components and blocks', () => {
  expect(splitCatalogIds(['button', 'pricing-01'])).toEqual({ components: ['button'], blocks: ['pricing-01'] })
})

it('reads installed blocks from the lock', () => {
  const record = (logicalPath: string, kind: string) => ({ logicalPath, kind, sha256: 'x' })
  const context = {
    lock: {
      artifacts: {
        'src/components/blocks/login-01.tsx': record('blocks/login-01.tsx', 'block'),
        'src/components/blocks/login-01.css': record('blocks/login-01.css', 'block'),
        'src/components/ui/button.tsx': record('components/ui/button.tsx', 'component'),
      },
    },
  } as unknown as ProjectContext
  expect(installedBlockIds(context)).toEqual(['login-01'])
})
