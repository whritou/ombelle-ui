import { it, expect } from 'vitest'
import { classifyDeclaration, classifyVersion, declarationWithin, declaredBounds, supportMatrix, versionWithin } from '../src/support.js'
import { runtimeNotice, supportedBunVersion, supportedNodeVersion } from '../src/apply/executable.js'

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
it('refuses React 18 and older, tests React 19, and accepts newer majors untested (INS-01)', () => {
  for (const spec of ['^19.3.1', '19.3.0', '19.0.0', '~19.2.3', '19', '>=19.0.0 <20.0.0'])
    expect(classifyDeclaration(spec, supportMatrix.react), spec).toBe('tested')
  for (const spec of ['18.3.1', '^18.3.1', '>=18 <20', '19.0.0-rc.1', '17'])
    expect(classifyDeclaration(spec, supportMatrix.react), spec).toBe('refused')
  for (const spec of ['20.0.0', '^20', '>=19.0.0 <21', '21.x'])
    expect(classifyDeclaration(spec, supportMatrix.react), spec).toBe('newer')
  expect(classifyDeclaration('latest', supportMatrix.react)).toBeUndefined()
  expect(declarationWithin('^20', supportMatrix.react)).toBe(false)
  expect(classifyVersion('20.1.0', supportMatrix.react)).toBe('newer')
})
it('refuses runtimes below the tested minimum and accepts newer majors with a notice (INS-02, INS-03)', () => {
  for (const version of ['v24.19.0', 'v24.20.1', 'v25.0.0', 'v26.13.1', 'v27.0.0', 'v28.1.0']) expect(supportedNodeVersion(version), version).toBe(true)
  for (const version of ['v24.18.9', 'v22.12.0', 'v20.18.3', '24.19.0']) expect(supportedNodeVersion(version), version).toBe(false)
  for (const version of ['1.4.3', '1.4.5', '1.9.0', '2.0.0']) expect(supportedBunVersion(version), version).toBe(true)
  for (const version of ['1.4.2', '1.3.9', 'v1.4.3']) expect(supportedBunVersion(version), version).toBe(false)
  expect(versionWithin('26.0.0-rc.1', supportMatrix.node)).toBe(true)
  expect(runtimeNotice('node', 'v26.13.1')).toBeUndefined()
  expect(runtimeNotice('node', 'v27.0.0')).toBe('Node 27.0.0 is newer than the versions this release was tested with (24.19.0 to below 27.0.0); dependency installs run on it, but check the result.')
  expect(runtimeNotice('bun', '2.0.1')).toMatch(/^Bun 2\.0\.1 is newer than/)
  // The running Node (the newest reachable here) resolves for installs without an error.
  expect(supportedNodeVersion(process.version)).toBe(true)
})
