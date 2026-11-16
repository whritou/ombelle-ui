import { fontRuleBlock, resolveTypography } from '@ombelle/compiler'

// Loads the self-hosted fonts a previewed preset uses. The compiled CSS imports them by
// package name, which a browser cannot resolve, so the preview strips those imports and
// loads the same Fontsource files from its own bundle, one font at a time.
// Vite needs literal specifiers, so the list is written out; a test keeps it equal to the registry.
export const fontLoaders: Record<string, () => Promise<unknown>> = {
  'dm-sans': () => import('@fontsource-variable/dm-sans'),
  geist: () => import('@fontsource-variable/geist'),
  'geist-mono': () => import('@fontsource-variable/geist-mono'),
  'space-grotesk': () => import('@fontsource-variable/space-grotesk'),
  'work-sans': () => import('@fontsource-variable/work-sans'),
  'space-mono': () =>
    Promise.all([import('@fontsource/space-mono/400.css'), import('@fontsource/space-mono/700.css')]),
  'bricolage-grotesque': () => import('@fontsource-variable/bricolage-grotesque'),
  figtree: () => import('@fontsource-variable/figtree'),
  'inter-tight': () => import('@fontsource-variable/inter-tight'),
  inter: () => import('@fontsource-variable/inter'),
  'jetbrains-mono': () => import('@fontsource-variable/jetbrains-mono'),
  fraunces: () => import('@fontsource-variable/fraunces'),
  'instrument-sans': () => import('@fontsource-variable/instrument-sans'),
  'ibm-plex-mono': () =>
    Promise.all([import('@fontsource/ibm-plex-mono/400.css'), import('@fontsource/ibm-plex-mono/600.css')]),
  'dm-mono': () =>
    Promise.all([import('@fontsource/dm-mono/400.css'), import('@fontsource/dm-mono/500.css')]),
  'young-serif': () => import('@fontsource/young-serif/400.css'),
  nunito: () => import('@fontsource-variable/nunito'),
  michroma: () => import('@fontsource/michroma/400.css'),
  'exo-2': () => import('@fontsource-variable/exo-2'),
  'share-tech-mono': () => import('@fontsource/share-tech-mono/400.css'),
}

type PresetFonts = { fontFamilyId?: string; headingFontFamilyId?: string; monoFontFamilyId?: string }

/** The registry fonts a design uses, once each; system ids have nothing to load. */
export function presetFontIds(design: PresetFonts): string[] {
  const ids = [design.fontFamilyId, design.headingFontFamilyId, design.monoFontFamilyId]
  return [...new Set(ids.filter((id): id is string => id !== undefined && id in fontLoaders))]
}

/**
 * The registry fonts the recipes in a render message name. The compiled CSS imports them by package
 * name, which an iframe cannot resolve, so the preview loads the same Fontsource files itself.
 */
export function recipeFontIds(message: { type: string; [key: string]: any } | null): string[] {
  if (!message) return []
  const recipes: unknown[] =
    message.type === 'render' ? [message.state?.recipe]
      : message.type === 'matrix-render' ? message.cells.map((cell: any) => cell.recipe)
        : message.type === 'catalog-render' ? [message.result.recipe.data]
          : message.type === 'catalog-matrix-render' ? message.cells.map((cell: any) => cell.result.recipe.data) : []
  const fonts = recipes.flatMap((recipe: any) => [recipe?.overrides?.fontFamilyId, ...Object.values(recipe?.appearance?.fonts ?? {})])
  return [...new Set(fonts.filter((id): id is string => typeof id === 'string' && id in fontLoaders))]
}

const loading = new Map<string, Promise<void>>()
/** Loads each font's CSS once; later calls for the same id share the first request. */
export function loadPresetFonts(ids: readonly string[]): Promise<void> {
  return Promise.all(
    ids.map((id) => {
      let request = loading.get(id)
      if (!request) {
        request = (fontLoaders[id]?.() ?? Promise.resolve()).then(() => undefined)
        loading.set(id, request)
      }
      return request
    }),
  ).then(() => undefined)
}

/**
 * Audit pages only: the styles that put `<body>,<heading>,<mono>` (registry ids, empty for unset)
 * on every specimen, and the fonts to load for them. Recipe CSS pins its own --font-family, so
 * the override is !important, and slots match by suffix because recipe slots carry a prefix.
 * Rules use the compiler's own specificity and are rendered after specimen styles.
 */
export function auditFontStyles(list: string): { css: string; ids: string[] } {
  const [body, heading, mono] = list.split(',').map((id) => id.trim() || undefined)
  const design = { fontFamilyId: body, headingFontFamilyId: heading, monoFontFamilyId: mono }
  const typography = resolveTypography(design)
  const declarations = [
    `--font-family:${typography.family} !important`,
    ...(typography.heading ? [`--font-heading:${typography.heading} !important`] : []),
    ...(typography.mono ? [`--font-mono:${typography.mono} !important`] : []),
  ].join(';')
  const rules = fontRuleBlock(typography).replaceAll('[data-slot="', '[data-slot$="')
  return { css: `:root,[data-ombelle-recipe]{${declarations}}` + rules, ids: presetFontIds(design) }
}
