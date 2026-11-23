import { cache } from 'react'
import { parseSnapshotReference } from '@ombelle/contracts'
import { PublishedPreset } from '../../../../snapshots/components/published-preset'
import { prepareSnapshotFrame, snapshotContrastWarning } from '../../../../snapshots/preview-session'
import { snapshotInstallCommand } from '../../../../snapshots/install-command'
import { readSnapshotConfig } from '../../../../snapshots/server/config'
import { SnapshotServiceError } from '../../../../snapshots/server/errors'
import { createRequestSnapshotService } from '../../../../snapshots/server/service'
import { DocPage } from '../../../../site/doc-page'

// Availability, including withdrawal, must be checked on every request.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Anyone can publish these pages, so search engines must not index user-chosen text (RL-11).
export const metadata = { robots: { index: false, follow: false } }

// One read per request, shared by the title and the page.
const readSnapshot = cache((id: string, revision: string) =>
  createRequestSnapshotService().read(parseSnapshotReference(`${id}@${revision}`)))

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
    return { title: `${snapshot.preset.name} · Published preset · Ombelle UI` }
  } catch (error) {
    return { title: `${unavailableTitle(error)} · Ombelle UI` }
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
    snapshotInstallCommand(
      {
        origin: publicOrigin,
        reference: `${snapshot.id}@${snapshot.revision}`,
        presetHash: snapshot.presetHash,
      },
      'new',
    )
    return <PublishedPreset snapshot={snapshot} origin={publicOrigin} contrastWarning={snapshotContrastWarning(snapshot)} frame={prepareSnapshotFrame(snapshot)} />
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
          <a href="/editor/preset">Open the preset editor</a>
        </p>
      </DocPage>
    )
  }
}
