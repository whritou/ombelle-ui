import type * as React from 'react'
import type { PresetScene } from '../../../www/src/preset-editor/preview-protocol'
import { DashboardScene } from './dashboard'
import { ProjectsScene } from './projects'
import { SettingsScene } from './settings'
import { SignInScene } from './sign-in'
import type { SceneProps } from './shared'

export type { SceneProps } from './shared'

type ScenePage = Exclude<PresetScene, 'gallery'>

const pages = {
  dashboard: DashboardScene,
  projects: ProjectsScene,
  settings: SettingsScene,
  'sign-in': SignInScene,
} satisfies Record<ScenePage, (props: SceneProps) => React.ReactNode>

const addresses: Record<ScenePage, string> = {
  dashboard: 'acme.app/overview',
  projects: 'acme.app/projects',
  settings: 'acme.app/settings',
  'sign-in': 'acme.app/sign-in',
}

/** Shows a scene as a page in a browser window on a dotted stage. */
export function PresetScenePage({ scene, ...props }: SceneProps & { scene: ScenePage }) {
  const Page = pages[scene]
  return (
    <div className="scene-stage">
      <div className="scene-window">
        <div className="scene-chrome" aria-hidden="true">
          <span className="scene-chrome-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="scene-chrome-address">{addresses[scene]}</span>
        </div>
        <Page {...props} />
      </div>
    </div>
  )
}
