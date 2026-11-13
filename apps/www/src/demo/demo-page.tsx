'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultGlassPresetId } from '@ombelle/catalog'
import { styleSupport, validateRecipe, type ComponentId, type ComponentRecipe, type StyleFamily } from '@ombelle/contracts'
import exampleRecipe from '../../../../examples/recipe.example.json'
import { siteFamilyOrder } from '../snapshots/install-command'
import { editableComponents } from '../editor/editable-components'
import { catalogPresetRef, createCatalogDraft } from '../editor/catalog-draft'
import { changeDraftFamily, type EditorView } from '../editor/model'
import { useCatalogCompiler } from '../editor/use-catalog-compiler'
import { useCompiler } from '../editor/use-compiler'
import { useMatrixLayout } from '../editor/use-matrix-layout'
import { MatrixControls } from '../editor/components/matrix-controls'
import { PreviewFrame } from '../editor/components/preview-frame'
import { familyNames } from '../editor/components/family-picker'
import { PresetPreviewFrame } from '../preset-editor/components/preset-preview-frame'
import { createPresetDraft, materializePreset } from '../preset-editor/model'
import { usePresetCompiler } from '../preset-editor/use-preset-compiler'
import { presetScenes, type PresetScene } from '../preset-editor/preview-protocol'
import { labInkFor, pickGlassScene } from '../site/glass-backdrops'
import editorStyles from '../editor/components/button-editor.module.css'
import styles from './demo.module.css'

type Mode = 'light' | 'dark'
type Width = 'wide' | 'narrow'
type Page = { kind: 'scene'; id: PresetScene; label: string } | { kind: 'component'; id: ComponentId; label: string }

const sceneLabels: Record<PresetScene, string> = { gallery: 'Gallery', dashboard: 'Dashboard', projects: 'Projects', settings: 'Settings', 'sign-in': 'Sign-in' }
/** Every page the demo shows: the preset scenes, then every component editor in alphabetical order. */
export const demoPages: readonly Page[] = [
  ...presetScenes.map((id) => ({ kind: 'scene' as const, id, label: sceneLabels[id] })),
  ...editableComponents
    .map((entry): Page => ({ kind: 'component', id: entry.id, label: entry.label })),
]
const pageKey = (page: Page) => `${page.kind}:${page.id}`

type DemoState = { family: StyleFamily; page: string; mode: Mode; width: Width }
const initial: DemoState = { family: siteFamilyOrder[0]!, page: pageKey(demoPages[0]!), mode: 'light', width: 'narrow' }

/** Reads the state from the query string, falling back to the defaults for anything unknown. */
export function readDemoState(search: string): DemoState {
  const params = new URLSearchParams(search)
  const family = siteFamilyOrder.find((value) => value === params.get('style')) ?? initial.family
  const page = demoPages.find((value) => pageKey(value) === params.get('page'))
  return {
    family,
    page: page ? pageKey(page) : initial.page,
    mode: params.get('mode') === 'dark' ? 'dark' : 'light',
    width: params.get('width') === 'wide' ? 'wide' : 'narrow',
  }
}
const writeDemoState = (state: DemoState) =>
  `?style=${state.family}&page=${encodeURIComponent(state.page)}&mode=${state.mode}&width=${state.width}`

function SceneDemo({ family, scene, mode, width }: { family: StyleFamily; scene: PresetScene; mode: Mode; width: Width }) {
  const draft = useMemo(() => createPresetDraft(family), [family])
  const compiled = usePresetCompiler(draft)
  const glass = family === 'liquid-glass'
  // The preset editor's automatic scene and lab ink for an unedited preset.
  const glassPreset = useMemo(() => (glass ? materializePreset(draft) : null), [glass, draft])
  const backdrop = glassPreset ? pickGlassScene(glassPreset, mode, defaultGlassPresetId) : 'kit'
  const labInk = glassPreset ? labInkFor(glassPreset, mode, backdrop) : null
  const [status, setStatus] = useState('connecting')
  return <>
    <p className={styles.status} data-status={status}>Preview {status}</p>
    <PresetPreviewFrame key={family} result={compiled.result} stale={compiled.stale} onStatus={setStatus}
      title={`${familyNames[family]} ${sceneLabels[scene]} demo`}
      // Tall enough for the longest scene at 320 px, so the whole page shows without an inner scroll.
      height={width === 'narrow' ? 4600 : 2600} caption={false}
      view={{
        mode, viewport: width,
        ...(scene === 'gallery' ? {} : { scene }),
        ...(glass && backdrop !== 'kit' ? { backdrop } : {}),
        ...(glass && labInk ? { labInk } : {}),
      }} />
  </>
}

/** Turns the matrix on once, so each component page opens on its default matrix. */
function useMatrixOn(matrix: ReturnType<typeof useMatrixLayout>) {
  const { available, setLayout } = matrix
  useEffect(() => { if (available) setLayout('matrix') }, [available, setLayout])
}

function CatalogDemo({ family, component, name, view }: { family: StyleFamily; component: ComponentRecipe['component']; name: string; view: EditorView }) {
  const recipe = useMemo(() => ({ ...createCatalogDraft(component).recipe, presetRef: catalogPresetRef(family) }), [component, family])
  const { result } = useCatalogCompiler(recipe)
  const matrix = useMatrixLayout(component, recipe)
  useMatrixOn(matrix)
  return <>
    <div className={styles.matrixControls}><MatrixControls matrix={matrix} /></div>
    {matrix.pending && <p className={styles.status} role="status">Compiling the matrix…</p>}
    <div className={editorStyles.specimen}>
      <PreviewFrame result={result} view={view} component={component} componentName={name} matrix={matrix.matrix} />
    </div>
  </>
}

const buttonRecipe = validateRecipe(exampleRecipe)
function ButtonDemo({ family, view }: { family: StyleFamily; view: EditorView }) {
  const recipe = useMemo(() => changeDraftFamily({ storageVersion: 1, recipe: buttonRecipe }, family).recipe, [family])
  const compilation = useCompiler(recipe)
  const matrix = useMatrixLayout('button', recipe)
  useMatrixOn(matrix)
  return <>
    <div className={styles.matrixControls}><MatrixControls matrix={matrix} /></div>
    {matrix.pending && <p className={styles.status} role="status">Compiling the matrix…</p>}
    <div className={editorStyles.specimen}>
      <PreviewFrame result={compilation.result} view={view} matrix={matrix.matrix} />
    </div>
  </>
}

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly { value: T; label: string }[]; onChange(value: T): void
}) {
  const id = `demo-${label.toLowerCase()}`
  return <span className={styles.choice}>
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </span>
}

/**
 * Visual review pages: every preset scene and every component matrix, with each family's
 * default preset, in the editors' own sandboxed previews. Read only; nothing is saved.
 */
export function DemoPage() {
  const [state, setState] = useState<DemoState>(initial)
  useEffect(() => setState(readDemoState(window.location.search)), [])
  const update = useCallback((next: Partial<DemoState>) => setState((previous) => {
    const merged = { ...previous, ...next }
    window.history.replaceState(null, '', writeDemoState(merged))
    return merged
  }), [])
  const index = Math.max(0, demoPages.findIndex((page) => pageKey(page) === state.page))
  const page = demoPages[index]!
  const previous = demoPages[(index - 1 + demoPages.length) % demoPages.length]!
  const next = demoPages[(index + 1) % demoPages.length]!
  const view: EditorView = { mode: state.mode, viewport: state.width, panel: 'customize', forcedState: 'none' }
  const unavailable = page.kind === 'component' && styleSupport(page.id, state.family) === 'unavailable'
  return <main className={styles.root} aria-labelledby="demo-title">
    <header className={styles.bar}>
      <h1 id="demo-title" className={styles.title}>Demo</h1>
      <Choice label="Style" value={state.family} onChange={(family) => update({ family })}
        options={siteFamilyOrder.map((family) => ({ value: family, label: familyNames[family] }))} />
      <Choice label="Page" value={state.page} onChange={(page) => update({ page })}
        options={demoPages.map((item) => ({ value: pageKey(item), label: item.kind === 'scene' ? `Scene: ${item.label}` : item.label }))} />
      <Choice<Mode> label="Mode" value={state.mode} onChange={(mode) => update({ mode })}
        options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      <Choice<Width> label="Width" value={state.width} onChange={(width) => update({ width })}
        options={[{ value: 'narrow', label: page.kind === 'scene' ? '320 px' : 'Narrow' }, { value: 'wide', label: 'Wide' }]} />
      <nav className={styles.steps} aria-label="Demo pages">
        <button type="button" onClick={() => update({ page: pageKey(previous) })}>← {previous.label}</button>
        <button type="button" onClick={() => update({ page: pageKey(next) })}>{next.label} →</button>
      </nav>
    </header>
    <section className={styles.stage} aria-label={`${page.label}, ${familyNames[state.family]}, ${state.mode}, ${state.width}`}>
      <h2 className={styles.heading}>{page.label} <span>· {familyNames[state.family]} · {state.mode} · {state.width === 'narrow' && page.kind === 'scene' ? '320 px' : state.width}</span></h2>
      {unavailable ? <p>{page.label} is not available in {familyNames[state.family]}.</p>
        : page.kind === 'scene' ? <SceneDemo family={state.family} scene={page.id} mode={state.mode} width={state.width} />
          : page.id === 'button' ? <ButtonDemo key={state.family} family={state.family} view={view} />
            : <CatalogDemo key={`${page.id}:${state.family}`} family={state.family} component={page.id as ComponentRecipe['component']} name={page.label} view={view} />}
    </section>
  </main>
}
