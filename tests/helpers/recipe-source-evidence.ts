import { expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { sha256 } from '@ombelle/compiler'
import type { RecipeCompileResult } from '@ombelle/contracts'

/** Verify generated files and browser-loaded canonical hashes for this actual host. */
export async function verifyRecipeSourceEvidence(
  page: Page,
  {
    app,
    hostFamily,
    recipeId,
    compiled,
    consumers,
  }: {
    app: string
    hostFamily: string
    recipeId: string
    compiled: RecipeCompileResult
    consumers: Record<string, { root: string; port: number }>
  },
): Promise<Record<string, string>> {
  const transformedHashes: Record<string, string> = {}
  const transforms =
    app === 'preview'
      ? JSON.parse(
          fs.readFileSync(
            'apps/preview/src/generated/' +
              hostFamily +
              '/recipes-transforms.json',
            'utf8',
          ),
        )
      : undefined
  for (const artifact of compiled.artifacts.filter(
    (a) => a.kind !== 'utility',
  )) {
    const dest =
      artifact.kind === 'usage'
        ? 'src/ombelle-examples/' +
          artifact.logicalPath.slice('examples/'.length)
        : 'src/components/ui/' + artifact.logicalPath
    if (app === 'preview') {
      const file = path.join(
        'apps/preview/src/generated',
        hostFamily,
        artifact.kind === 'usage'
          ? artifact.logicalPath
          : 'components/ui/' + artifact.logicalPath,
      )
      const actualHash = await sha256(fs.readFileSync(file, 'utf8'))
      expect(actualHash).toBe(transforms[artifact.logicalPath].previewHash)
      transformedHashes[artifact.logicalPath] = actualHash
    } else {
      const content = fs.readFileSync(
        path.join(consumers[app + '-' + hostFamily].root, dest),
        'utf8',
      )
      expect(await sha256(content)).toBe(artifact.sha256)
      transformedHashes[artifact.logicalPath] = await sha256(content)
    }
  }
  if (app === 'preview') {
    const browserHashes = await page.evaluate(
      async (id) => Promise.all((window as any).__recipeArtifactHashes[id]),
      recipeId,
    )
    expect(browserHashes).toEqual(compiled.artifacts.map((a) => a.sha256))
  }

  return transformedHashes
}
