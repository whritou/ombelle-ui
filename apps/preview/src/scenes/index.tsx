import type * as React from 'react'
import type { PresetScene } from '../../../www/src/preset-editor/preview-protocol'
import { DashboardScene } from './dashboard'
import { SettingsScene } from './settings'
import { SignInScene } from './sign-in'
import type { SceneProps } from './shared'

export type { SceneProps } from './shared'

const pages = {
  dashboard: DashboardScene,
  settings: SettingsScene,
  'sign-in': SignInScene,
} satisfies Record<Exclude<PresetScene, 'gallery'>, (props: SceneProps) => React.ReactNode>

export function PresetScenePage({
  scene,
  ...props
}: SceneProps & { scene: Exclude<PresetScene, 'gallery'> }) {
  const Page = pages[scene]
  return <Page {...props} />
}
