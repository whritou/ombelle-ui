import type { Dependency, PlannedDependency, ProjectContext } from '@ombelle/contracts'

type Version = { major: number; minor: number; patch: number; pre: string }

function parseVersion(value: string): Version | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value)
  return match ? { major: +match[1], minor: +match[2], patch: +match[3], pre: match[4] ?? '' } : undefined
}
function compare(a: Version, b: Version): number {
  for (const key of ['major', 'minor', 'patch'] as const) if (a[key] !== b[key]) return a[key] - b[key]
  if (a.pre === b.pre) return 0
  // A prerelease sorts before its release; prereleases compare as text, which is enough to order them here.
  return !a.pre ? 1 : !b.pre ? -1 : a.pre < b.pre ? -1 : 1
}
/** The caret compatibility group: the major, or the minor for 0.x releases. */
const sameGroup = (a: Version, b: Version) => a.major === b.major && (a.major > 0 || a.minor === b.minor)

/**
 * The lowest version a declared specifier allows, for the plain forms package managers write
 * (`1.2.3`, `=1.2.3`, `^1.2.3`, `~1.2.3`, `>=1.2.3`). Anything else (tags, unions, workspace,
 * file, git and alias specifiers) is undefined: Ombelle cannot reason about it and leaves it alone.
 */
function lowerBound(spec: string): Version | undefined {
  const match = /^(?:\^|~|>=|=)?\s*(.+)$/.exec(spec.trim())
  return match ? parseVersion(match[1]) : undefined
}

export type DependencyPlanResult = { plan: PlannedDependency[]; notices: string[] }

/**
 * Plan only the dependency changes a component needs (CLI-01). A dependency the project already declares
 * is left alone when its declared range starts at or above the catalog version in the same compatibility
 * group, or at a newer major: Ombelle never downgrades or narrows it. An older declaration is raised to the
 * catalog version, and the plan records the current declaration so both outputs show the change.
 */
export function planDependencies(context: ProjectContext, dependencies: readonly Dependency[]): DependencyPlanResult {
  // Bun's adapter only treats production dependencies as present; it promotes the others explicitly.
  const declared: Record<string, string> = context.manager === 'bun'
    ? { ...context.packageJson.dependencies }
    : { ...context.packageJson.devDependencies, ...context.packageJson.dependencies }
  const plan: PlannedDependency[] = []
  const notices: string[] = []
  for (const dependency of dependencies) {
    const current = Object.hasOwn(declared, dependency.name) ? declared[dependency.name] : undefined
    if (current === undefined) {
      plan.push({ ...dependency })
      continue
    }
    if (current === dependency.version) continue
    const wanted = parseVersion(dependency.version)
    const floor = lowerBound(current)
    if (!wanted || !floor) {
      notices.push(`keep ${dependency.name}@${current} (Ombelle was tested with ${dependency.version})`)
      continue
    }
    if (compare(floor, wanted) >= 0) {
      if (!sameGroup(floor, wanted))
        notices.push(`keep ${dependency.name}@${current}, newer than the ${dependency.version} Ombelle was tested with`)
      continue
    }
    plan.push({ ...dependency, current })
  }
  return { plan, notices }
}
