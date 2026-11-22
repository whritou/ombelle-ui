/**
 * The supported matrix for 1.0, in one place: `--help`, `doctor`, the project inspector and the runtime
 * resolver all read it, and docs/05-cli-specification.md states the same values.
 *
 * React: installed components use React 19 APIs only (a `ref` prop on function components, no
 * `forwardRef`) and no API newer than 19.0, so every React 19 release is accepted. React 18 lacks the
 * `ref` prop; React 20 is unknown. Node and Bun run the package manager for dependency installs.
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
  const between = /^>=\s*v?(\d+\.\d+\.\d+)\s+<\s*v?(\d+)(?:\.(\d+)\.(\d+))?$/.exec(text)
  if (between)
    return { low: between[1], high: [between[2], between[3] ?? '0', between[4] ?? '0'].join('.') + '-0' }
  return undefined
}

/** Whether every version a declaration admits is in the range: low inside it, high at or below its end. */
export function declarationWithin(spec: string, range: { minimum: string; below: string }): boolean {
  const bounds = declaredBounds(spec)
  if (!bounds) return false
  const high = parse(bounds.high)!, below = parse(range.below)!
  // `<20.0.0-0` and `<20.0.0` admit the same releases for this purpose.
  const highRelease: Version = [high[0], high[1], high[2], '']
  return versionWithin(bounds.low, range) && compare(highRelease, below) <= 0
}
