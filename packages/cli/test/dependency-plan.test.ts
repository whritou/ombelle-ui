// CLI-01: `add` must not re-pin or downgrade a dependency the project already declares.
import { expect, it } from 'vitest'
import type { ProjectContext } from '@ombelle/contracts'
import { formatPlan, planOutput } from '../src/format.js'
import { planDependencies } from '../src/plan/dependencies.js'

const context = (dependencies: Record<string, string>, manager = 'pnpm', devDependencies: Record<string, string> = {}) =>
  ({ manager, packageJson: { dependencies, devDependencies } }) as unknown as ProjectContext
const lucide = { name: 'lucide-react', version: '1.55.0' }

it.each([
  ['^1.66.0', 'a newer range in the same major'],
  ['1.66.0', 'a newer exact version'],
  ['~1.55.0', 'a range that starts at the catalog version'],
  ['1.55.0', 'the catalog version'],
])('leaves %s alone (%s)', (declared) => {
  expect(planDependencies(context({ 'lucide-react': declared }), [lucide])).toEqual({ plan: [], notices: [] })
})

it('never downgrades a newer major and says so', () => {
  const result = planDependencies(context({ 'lucide-react': '^2.0.0' }), [lucide])
  expect(result.plan).toEqual([])
  expect(result.notices).toEqual(['keep lucide-react@^2.0.0, newer than the 1.55.0 Ombelle was tested with'])
})

it.each(['latest', 'workspace:*', '>=1 <3', '1.x', 'npm:other@1.0.0'])('leaves a specifier it cannot compare (%s) alone', (declared) => {
  const result = planDependencies(context({ 'lucide-react': declared }), [lucide])
  expect(result.plan).toEqual([])
  expect(result.notices).toHaveLength(1)
})

it('raises an older declaration and records what it replaces', () => {
  expect(planDependencies(context({ 'lucide-react': '^1.10.0' }), [lucide]).plan)
    .toEqual([{ ...lucide, current: '^1.10.0' }])
  expect(planDependencies(context({ clsx: '0.6.0' }), [{ name: 'clsx', version: '0.7.1' }]).plan)
    .toEqual([{ name: 'clsx', version: '0.7.1', current: '0.6.0' }])
})

it('adds a missing dependency without a current version', () => {
  expect(planDependencies(context({}), [lucide]).plan).toEqual([lucide])
})

it('keeps the Bun adapter rule that only production dependencies count as present', () => {
  expect(planDependencies(context({}, 'bun', { 'lucide-react': '1.66.0' }), [lucide]).plan).toEqual([lucide])
  expect(planDependencies(context({}, 'pnpm', { 'lucide-react': '1.66.0' }), [lucide]).plan).toEqual([])
})

it('shows the current and planned version in both plan outputs', () => {
  const plan = {
    projectRoot: '/app', packageManager: 'pnpm', preconditions: {}, changes: [], managedDeclarations: [],
    preset: { hash: 'a'.repeat(64) }, provenance: { catalogRelease: '0.1.0', compilerVersion: '0.1.0' },
    dependencyPlan: [{ ...lucide, current: '^1.10.0' }], diagnostics: [], notices: [], networkAccess: false,
  } as never
  expect(formatPlan('add', 'planned', plan)).toContain('lucide-react@1.55.0 (replaces ^1.10.0)')
  expect(planOutput('add', 'planned', plan).dependencyPlan).toEqual([{ ...lucide, current: '^1.10.0' }])
})
