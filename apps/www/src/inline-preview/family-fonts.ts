import { fontById, styleFamilyFonts } from '@ombelle/catalog'
import type { BuiltInFamily } from './routing'

// The self-hosted fonts of the built-in families, as the iframe preview loads them
// (apps/preview/src/preset-fonts.ts). Literal specifiers, so the bundler can split each font out.
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
}

/** The font ids a family's preview uses: body, display and mono, once each. */
export function familyFontIds(family: BuiltInFamily): string[] {
  const { body, display, mono } = styleFamilyFonts[family]
  return [...new Set([body, display, mono])]
}

/**
 * Fetches a font's files, not only its @font-face rules: the browser downloads a face when text
 * first uses it, which would swap the text after the stage has switched and move it.
 */
async function loadFaces(id: string): Promise<void> {
  const font = fontById(id)
  if (!font || typeof document === 'undefined' || !document.fonts) return
  const name = font.stack.split(',')[0]!.trim()
  const weights = font.weights === 'variable' ? [400] : font.weights
  await Promise.all(weights.map((weight) => document.fonts.load(`${weight} 1em ${name}`, 'Aa')))
}

const loading = new Map<string, Promise<void>>()
/** Loads a family's font stylesheets and files once; later calls share the first request, and a failed one is retried. */
export function loadFamilyFonts(family: BuiltInFamily): Promise<void> {
  return Promise.all(
    familyFontIds(family).map((id) => {
      let request = loading.get(id)
      if (!request) {
        request = (fontLoaders[id]?.() ?? Promise.resolve())
          .then(() => loadFaces(id))
          .catch((error: unknown) => {
            // A failed load is forgotten, so the next switch to this family tries again.
            loading.delete(id)
            throw error
          })
        loading.set(id, request)
      }
      return request
    }),
  ).then(() => undefined)
}
