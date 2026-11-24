import { cache } from 'react'
import { parseRecipeSnapshotReference } from '@ombelle/contracts'
import { PublishedRecipe } from '../../../../recipe-snapshots/components/published-recipe'
import { prepareRecipePreview } from '../../../../recipe-snapshots/preview'
import { recipeSnapshotInstallCommand } from '../../../../recipe-snapshots/install-command'
import { readSnapshotConfig } from '../../../../snapshots/server/config'
import { SnapshotServiceError } from '../../../../snapshots/server/errors'
import { createRequestRecipeSnapshotService } from '../../../../snapshots/server/recipe-service'
import { DocPage } from '../../../../site/doc-page'
import { componentDoc } from '../../../../site/components/catalog'
import { catalogRecipesAvailable } from '../../../../snapshots/install-command'

// Availability, including withdrawal, must be checked on every request.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Anyone can publish these pages, so search engines must not index user-chosen text (RL-11).
// Published codes are anyone's text on the official domain, so they stay out of search indexes (RL-11).
const robots = { index: false, follow: false }

// One read per request, shared by the title and the page.
const readSnapshot = cache(async (id: string, revision: string) => {
  const snapshot = await createRequestRecipeSnapshotService().read(parseRecipeSnapshotReference(`${id}@${revision}`))
  if (snapshot.snapshotVersion === '2.0' && !catalogRecipesAvailable)
    throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' })
  return snapshot
})

function unavailableTitle(error: unknown) {
  const code = error instanceof SnapshotServiceError ? error.code : undefined
  return code === 'SNAPSHOT_WITHDRAWN'
    ? 'Snapshot withdrawn'
    : code === 'SNAPSHOT_NOT_FOUND'
      ? 'Snapshot not found'
      : 'Snapshot unavailable'
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; revision: string }> }) {
  const { id, revision } = await params
  try {
    const snapshot = await readSnapshot(id, revision)
    return { title: `Published ${componentDoc(snapshot.recipe.component)?.name ?? 'Button'} recipe · Ombelle UI`, robots }
  } catch (error) {
    return { title: `${unavailableTitle(error)} · Ombelle UI`, robots }
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; revision: string }>
}) {
  const { id, revision } = await params
  try {
    const snapshot = await readSnapshot(id, revision)
    const { publicOrigin } = readSnapshotConfig(process.env)
    // Fail within the request boundary if an operator configured an authority
    // which cannot be shown safely in the private shell invocation.
    recipeSnapshotInstallCommand(
      {
        origin: publicOrigin,
        reference: `${snapshot.id}@${snapshot.revision}`,
        recipeHash: snapshot.recipeHash,
      },
    )
    return <PublishedRecipe snapshot={snapshot} origin={publicOrigin} name={componentDoc(snapshot.recipe.component)?.name} result={await prepareRecipePreview(snapshot)} />
  } catch (error) {
    const code = error instanceof SnapshotServiceError ? error.code : undefined
    const withdrawn = code === 'SNAPSHOT_WITHDRAWN'
    const missing = code === 'SNAPSHOT_NOT_FOUND'
    return (
      <DocPage eyebrow="Published code" title={unavailableTitle(error)}>
        <p>
          {withdrawn
            ? 'This snapshot is no longer publicly available. Cached copies and installed source cannot be recalled.'
            : missing
              ? 'No published snapshot exists at this exact reference.'
              : 'This snapshot could not be read. Check the reference or try again later.'}
        </p>
        <p>
          <a href="/editor/component/button">Open the Button editor</a>
        </p>
      </DocPage>
    )
  }
}
