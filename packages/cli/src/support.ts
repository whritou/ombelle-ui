/**
 * The supported matrix for 1.0, in one place: `--help`, `doctor`, the project inspector and the runtime
 * resolver all read it, and docs/05-cli-specification.md states the same values.
 *
 * React: installed components use React 19 APIs only (a `ref` prop on function components, no
 * `forwardRef`) and no API newer than 19.0. `minimum` is the floor: older versions are refused, as they
 * are known not to work (React 18 lacks the `ref` prop). [minimum, below) is the tested range. A newer
 * version is accepted, untested, with a plan notice. Node and Bun run the package manager.
 */
export const supportMatrix = {
  react: { minimum: '19.0.0', below: '20.0.0', tested: '19.3.1' },
  node: { minimum: '24.19.0', below: '27.0.0', tested: '24.19.0' },
  bun: { minimum: '1.4.3', below: '2.0.0', tested: '1.4.3' },
  managers: ['npm', 'pnpm', 'yarn', 'bun'],
  frameworks: ['Vite React TSX', 'Next.js App Router TSX'],
  tailwind: '4',
  browsers: 'Chromium-tested; Safari and Firefox untested',
} as const

type Version = [number, number, number, string]
function parse(text: string): Version | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text.trim())
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ?? ''] : undefined
}
function compare(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return (a[i] as number) - (b[i] as number)
  // A prerelease sorts before its release.
  if (a[3] === b[3]) return 0
  return a[3] === '' ? 1 : b[3] === '' ? -1 : a[3] < b[3] ? -1 : 1
}
/** Whether an exact version lies in [minimum, below). */
export function versionWithin(version: string, range: { minimum: string; below: string }): boolean {
  const value = parse(version)
  return !!value && compare(value, parse(range.minimum)!) >= 0 && compare(value, parse(range.below)!) < 0
}

/**
 * The lowest and the exclusive highest version a package.json declaration admits, for the forms
 * create-vite, create-next-app, shadcn and package managers write: exact (`19.3.0`, `=19.3.0`), caret
 * (`^19.3.1`, `^19.2`, `^19`), tilde (`~19.3.1`), x-ranges (`19`, `19.3`, `19.x`, `19.3.x`, `19.*`) and
 * `>=19.3.1 <20`. Anything else (tags, URLs, `workspace:`, `catalog:`, unions) returns undefined.
 */
export function declaredBounds(spec: string): { low: string; high: string } | undefined {
  const text = spec.trim()
  const exact = /^=?\s*(v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(text)
  if (exact) {
    const version = parse(exact[1])!
    const next = version[3] ? [version[0], version[1], version[2]].join('.') : [version[0], version[1], version[2] + 1].join('.')
    return { low: exact[1].replace(/^v/, ''), high: version[3] ? next : next + '-0' }
  }
  const part = /^([\^~])\s*v?(\d+)(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?$/.exec(text)
  if (part) {
    const [, operator, major, minor, patch] = part
    const wild = (value: string | undefined) => value === undefined || /^[xX*]$/.test(value)
    const low = [major, wild(minor) ? '0' : minor, wild(patch) ? '0' : patch].join('.')
    const high = operator === '^'
      ? Number(major) > 0 || wild(minor) ? Number(major) + 1 + '.0.0'
        : Number(minor) > 0 || wild(patch) ? '0.' + (Number(minor) + 1) + '.0' : '0.0.' + (Number(patch) + 1)
      : wild(minor) ? Number(major) + 1 + '.0.0' : major + '.' + (Number(minor) + 1) + '.0'
    return { low, high: high + '-0' }
  }
  const x = /^v?(\d+)(?:\.(\d+|[xX*]))?(?:\.([xX*]))?$/.exec(text)
  if (x) {
    const [, major, minor] = x
    return minor === undefined || /^[xX*]$/.test(minor)
      ? { low: major + '.0.0', high: Number(major) + 1 + '.0.0-0' }
      : { low: major + '.' + minor + '.0', high: major + '.' + (Number(minor) + 1) + '.0-0' }
  }
  const between = /^>=\s*v?(\d+)(?:\.(\d+)(?:\.(\d+))?)?\s+<\s*v?(\d+)(?:\.(\d+)\.(\d+))?$/.exec(text)
  if (between)
    return {
      low: [between[1], between[2] ?? '0', between[3] ?? '0'].join('.'),
      high: [between[4], between[5] ?? '0', between[6] ?? '0'].join('.') + '-0',
    }
  return undefined
}

/**
 * How a version compares with a tested range: `refused` below the minimum (known not to work), `tested`
 * inside the range, `newer` at or above its end (accepted, untested; a notice says so).
 */
export type SupportClass = 'refused' | 'tested' | 'newer'
export function classifyVersion(version: string, range: { minimum: string; below: string }): SupportClass | undefined {
  const value = parse(version)
  if (!value) return undefined
  if (compare(value, parse(range.minimum)!) < 0) return 'refused'
  return compare(value, parse(range.below)!) < 0 ? 'tested' : 'newer'
}
/**
 * The same for a declaration: `refused` when its lowest admitted version is below the minimum, `newer`
 * when it can resolve to a version at or above the range's end, `tested` otherwise; undefined when the
 * declaration is not one of the forms {@link declaredBounds} reads.
 */
export function classifyDeclaration(spec: string, range: { minimum: string; below: string }): SupportClass | undefined {
  const bounds = declaredBounds(spec)
  if (!bounds) return undefined
  if (classifyVersion(bounds.low, range) === 'refused') return 'refused'
  const high = parse(bounds.high)!
  return compare([high[0], high[1], high[2], ''], parse(range.below)!) <= 0 ? 'tested' : 'newer'
}
/** The major of an exact version or of a declaration's lowest bound, for messages. */
export const majorOf = (value: string) => Number(/^\D*(\d+)/.exec(value)?.[1] ?? NaN)

/** Whether every version a declaration admits is in the range: low inside it, high at or below its end. */
export function declarationWithin(spec: string, range: { minimum: string; below: string }): boolean {
  const bounds = declaredBounds(spec)
  if (!bounds) return false
  const high = parse(bounds.high)!, below = parse(range.below)!
  // `<20.0.0-0` and `<20.0.0` admit the same releases for this purpose.
  const highRelease: Version = [high[0], high[1], high[2], '']
  return versionWithin(bounds.low, range) && compare(highRelease, below) <= 0
}
