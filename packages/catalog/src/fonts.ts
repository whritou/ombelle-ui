export type FontRole = 'display' | 'body' | 'mono'
export interface FontEntry {
  /** Kebab-case id; the value a preset stores. */
  id: string
  label: string
  /** The full CSS font-family value, with fallbacks. */
  stack: string
  roles: readonly FontRole[]
  /** Static weights that are imported, or 'variable' for a variable font. */
  weights: readonly number[] | 'variable'
  license: 'OFL-1.1'
  fontsource: { package: string; version: string; imports: readonly string[] }
}

const version = '5.3.0'
const sans = 'system-ui, sans-serif'
const serif = 'Georgia, serif'
const mono = 'ui-monospace, monospace'

/** A variable Fontsource font: one import, the family name Fontsource declares ends in "Variable". */
function variable(
  id: string,
  label: string,
  roles: readonly FontRole[],
  fallback: string,
): FontEntry {
  const pkg = '@fontsource-variable/' + id
  return {
    id,
    label,
    stack: `'${label} Variable', ${fallback}`,
    roles,
    weights: 'variable',
    license: 'OFL-1.1',
    fontsource: { package: pkg, version, imports: [pkg] },
  }
}

/** A static Fontsource font: one import per weight. */
function fixed(
  id: string,
  label: string,
  roles: readonly FontRole[],
  fallback: string,
  weights: readonly number[],
): FontEntry {
  const pkg = '@fontsource/' + id
  return {
    id,
    label,
    stack: `'${label}', ${fallback}`,
    roles,
    weights,
    license: 'OFL-1.1',
    fontsource: {
      package: pkg,
      version,
      imports: weights.map((weight) => `${pkg}/${weight}.css`),
    },
  }
}

const bodyAndDisplay = ['display', 'body'] as const

export const fontRegistry: readonly FontEntry[] = [
  variable('dm-sans', 'DM Sans', bodyAndDisplay, sans),
  variable('geist', 'Geist', bodyAndDisplay, sans),
  variable('geist-mono', 'Geist Mono', ['mono'], mono),
  variable('space-grotesk', 'Space Grotesk', bodyAndDisplay, sans),
  variable('work-sans', 'Work Sans', bodyAndDisplay, sans),
  fixed('space-mono', 'Space Mono', ['mono'], mono, [400, 700]),
  variable('bricolage-grotesque', 'Bricolage Grotesque', ['display'], sans),
  variable('figtree', 'Figtree', bodyAndDisplay, sans),
  variable('inter-tight', 'Inter Tight', bodyAndDisplay, sans),
  variable('inter', 'Inter', bodyAndDisplay, sans),
  variable('jetbrains-mono', 'JetBrains Mono', ['mono'], mono),
  variable('fraunces', 'Fraunces', bodyAndDisplay, serif),
  variable('instrument-sans', 'Instrument Sans', bodyAndDisplay, sans),
  fixed('ibm-plex-mono', 'IBM Plex Mono', ['mono'], mono, [400, 600]),
  fixed('young-serif', 'Young Serif', ['display'], serif, [400]),
  variable('nunito', 'Nunito', bodyAndDisplay, sans),
  fixed('michroma', 'Michroma', ['display'], sans, [400]),
  variable('exo-2', 'Exo 2', bodyAndDisplay, sans),
  fixed('share-tech-mono', 'Share Tech Mono', ['mono'], mono, [400]),
]

const byId = new Map(fontRegistry.map((font) => [font.id, font]))
/** Registry ids only: the system font ids and unknown ids return undefined. */
export function fontById(id: string): FontEntry | undefined {
  return byId.get(id)
}
