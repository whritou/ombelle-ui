import { parseRecipeSnapshotReference } from '@ombelle/contracts'
import { PublishedRecipe } from '../../../../recipe-snapshots/components/published-recipe'
import { recipeSnapshotInstallCommand } from '../../../../recipe-snapshots/install-command'
import { readSnapshotConfig } from '../../../../snapshots/server/config'
import { SnapshotServiceError } from '../../../../snapshots/server/errors'
import { createRequestRecipeSnapshotService } from '../../../../snapshots/server/recipe-service'
import { DocPage } from '../../../../site/doc-page'

// Availability, including withdrawal, must be checked on every request.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; revision: string }>
}) {
  const { id, revision } = await params
  try {
    const ref = parseRecipeSnapshotReference(`${id}@${revision}`)
    const snapshot = await createRequestRecipeSnapshotService().read(ref)
    if (snapshot.snapshotVersion !== '1.0')
      throw new SnapshotServiceError({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' })
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
    return <PublishedRecipe snapshot={snapshot} origin={publicOrigin} />
  } catch (error) {
    const code = error instanceof SnapshotServiceError ? error.code : undefined
    const withdrawn = code === 'SNAPSHOT_WITHDRAWN'
    const missing = code === 'SNAPSHOT_NOT_FOUND'
    return (
      <DocPage
        eyebrow="Published code"
        title={
          withdrawn
            ? 'Snapshot withdrawn'
            : missing
              ? 'Snapshot not found'
              : 'Snapshot unavailable'
        }
      >
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
