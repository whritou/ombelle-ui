import { it, expect } from 'vitest'
import { declarationWithin, declaredBounds, supportMatrix, versionWithin } from '../src/support.js'
import { supportedBunVersion, supportedNodeVersion } from '../src/apply/executable.js'

it.each([
  ['19.3.1', { low: '19.3.1', high: '19.3.2-0' }],
  ['=19.3.0', { low: '19.3.0', high: '19.3.1-0' }],
  ['^19.3.1', { low: '19.3.1', high: '20.0.0-0' }],
  ['^19', { low: '19.0.0', high: '20.0.0-0' }],
  ['~19.3.1', { low: '19.3.1', high: '19.4.0-0' }],
  ['19.x', { low: '19.0.0', high: '20.0.0-0' }],
  ['19.3', { low: '19.3.0', high: '19.4.0-0' }],
  ['>=19.2.0 <20', { low: '19.2.0', high: '20.0.0-0' }],
])('reads the bounds of %s', (spec, bounds) => {
  expect(declaredBounds(spec)).toEqual(bounds)
})
it.each(['latest', 'workspace:*', 'catalog:', '^18 || ^19', 'npm:react@19.3.1', 'file:../react', '*'])(
  'does not interpret %s', (spec) => {
    expect(declaredBounds(spec)).toBeUndefined()
    expect(declarationWithin(spec, supportMatrix.react)).toBe(false)
  },
)
it('accepts React 19 declarations and refuses React 18 and 20 (INS-01)', () => {
  for (const spec of ['^19.3.1', '19.3.0', '19.0.0', '~19.2.3', '19', '>=19.0.0 <20.0.0'])
    expect(declarationWithin(spec, supportMatrix.react), spec).toBe(true)
  for (const spec of ['18.3.1', '^18.3.1', '20.0.0', '^20', '>=19.0.0 <21', '19.0.0-rc.1'])
    expect(declarationWithin(spec, supportMatrix.react), spec).toBe(false)
})
it('accepts Node 24.19 and later through Node 26, and Bun 1.4.3 and later 1.x (INS-02, INS-03)', () => {
  for (const version of ['v24.19.0', 'v24.20.1', 'v25.0.0', 'v26.13.1']) expect(supportedNodeVersion(version), version).toBe(true)
  for (const version of ['v24.18.9', 'v22.12.0', 'v20.18.3', 'v27.0.0', '24.19.0']) expect(supportedNodeVersion(version), version).toBe(false)
  for (const version of ['1.4.3', '1.4.5', '1.9.0']) expect(supportedBunVersion(version), version).toBe(true)
  for (const version of ['1.4.2', '1.3.9', '2.0.0', 'v1.4.3']) expect(supportedBunVersion(version), version).toBe(false)
  expect(versionWithin('26.0.0-rc.1', supportMatrix.node)).toBe(true)
})
