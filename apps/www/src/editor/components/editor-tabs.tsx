import type { EditorView } from '../model'

const panels: EditorView['panel'][] = ['preview', 'customize', 'code']

export function EditorTabs({ active, onChange }: {
  active: EditorView['panel']
  onChange: (panel: EditorView['panel']) => void
}) {
  return (
    <nav aria-label="Editor workspace" className="mobileTabs">
      {panels.map((panel) => (
        <button key={panel} type="button" aria-current={active === panel ? 'page' : undefined}
          onClick={() => onChange(panel)}>
          {panel[0]!.toUpperCase() + panel.slice(1)}
        </button>
      ))}
    </nav>
  )
}
