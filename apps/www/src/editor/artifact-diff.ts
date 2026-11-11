import type { Artifact, InstallableRecipeCompileResult } from '@ombelle/contracts'
import { diffSummary, lineDiff, type DiffLine } from './line-diff'

export type FileChange = { kind: Artifact['kind'] | 'recipe'; name: string; lines: DiffLine[]; added: number; removed: number }

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The parts of a generated file that only name this compile: the 64-character scope, the
 * recipe id and its revision. Both sides of a diff get the same tokens, so only real edits differ.
 */
export function normalizeArtifact(content: string, result: InstallableRecipeCompileResult): string {
  const { id, revision } = result.recipe.data
  return content
    .replaceAll(result.scope, '<scope>')
    .replace(new RegExp(`(^|[^\\w-])${escape(id)}(?![\\w-])`, 'g'), '$1<recipe>')
    .replace(new RegExp(`(^|[^\\w])r${revision}(?!\\d)`, 'g'), '$1r<n>')
}

function recipeJson(result: InstallableRecipeCompileResult): string {
  const { id: _id, revision: _revision, ...rest } = result.recipe.data as unknown as Record<string, unknown>
  return JSON.stringify({ id: '<recipe>', revision: '<n>', ...rest }, null, 2)
}

const fileName = (path: string) => path.split('/').at(-1) ?? path

function change(kind: FileChange['kind'], name: string, before: string, after: string): FileChange {
  const lines = lineDiff(before, after)
  return { kind, name, lines, ...diffSummary(lines) }
}

/**
 * Each generated file of result against the same file of reference, paired by kind and file
 * name, plus the recipe itself. Usage and utility files are left out: they do not carry edits.
 */
export function artifactChanges(result: InstallableRecipeCompileResult, reference: InstallableRecipeCompileResult): FileChange[] {
  const changes: FileChange[] = []
  for (const artifact of result.artifacts) {
    if (artifact.kind === 'usage' || artifact.kind === 'utility') continue
    const name = fileName(artifact.logicalPath)
    const other = reference.artifacts.find((candidate) => candidate.kind === artifact.kind && fileName(candidate.logicalPath) === name)
    changes.push(change(artifact.kind, name, other ? normalizeArtifact(other.content, reference) : '', normalizeArtifact(artifact.content, result)))
  }
  changes.push(change('recipe', 'recipe.json', recipeJson(reference), recipeJson(result)))
  return changes
}

/** One line for Get code: what the edits change, or that there are none. */
export function changesSummary(changes: FileChange[]): string {
  const changed = changes.filter((item) => item.added + item.removed > 0)
  if (!changed.length) return 'Same as the catalog default.'
  const added = changed.reduce((sum, item) => sum + item.added, 0)
  const removed = changed.reduce((sum, item) => sum + item.removed, 0)
  return `Changes from the catalog default: ${changed.length} ${changed.length === 1 ? 'file' : 'files'}, +${added} −${removed}`
}
