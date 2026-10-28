import { parseSnapshotReference } from '@ombelle/contracts'
import { PublishedPreset } from '../../../../snapshots/components/published-preset'
import { snapshotInstallCommand } from '../../../../snapshots/install-command'
import { readSnapshotConfig } from '../../../../snapshots/server/config'
import { SnapshotServiceError } from '../../../../snapshots/server/errors'
import { createRequestSnapshotService } from '../../../../snapshots/server/service'
import styles from '../../../../preset-editor/components/preset-editor.module.css'

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
    const ref = parseSnapshotReference(`${id}@${revision}`)
    const snapshot = await createRequestSnapshotService().read(ref)
    const { publicOrigin } = readSnapshotConfig(process.env)
    // Fail within the request boundary if an operator configured an authority
    // which cannot be shown safely in the private shell invocation.
    snapshotInstallCommand(
      {
        origin: publicOrigin,
        reference: `${snapshot.id}@${snapshot.revision}`,
        presetHash: snapshot.presetHash,
      },
      'new',
    )
    return <PublishedPreset snapshot={snapshot} origin={publicOrigin} />
  } catch (error) {
    const code = error instanceof SnapshotServiceError ? error.code : undefined
    const withdrawn = code === 'SNAPSHOT_WITHDRAWN'
    const missing = code === 'SNAPSHOT_NOT_FOUND'
    return (
      <main className={styles.editor}>
        <h1>
          {withdrawn
            ? 'Snapshot withdrawn'
            : missing
              ? 'Snapshot not found'
              : 'Snapshot unavailable'}
        </h1>
        <p>
          {withdrawn
            ? 'This snapshot is no longer publicly available. Cached copies and installed source cannot be recalled.'
            : missing
              ? 'No published snapshot exists at this exact reference.'
              : 'This snapshot could not be read. Check the reference or try again later.'}
        </p>
        <a href="/editor/preset">Open the preset editor</a>
      </main>
    )
  }
}
