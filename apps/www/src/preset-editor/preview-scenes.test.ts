import { expect, it } from 'vitest'
import { presetScenes } from './preview-protocol'
import { sceneComponents, sceneOptions } from './preview-scenes'

it('offers the built pages but not the component gallery', () => {
  expect(sceneOptions.map((option) => option.value)).toEqual(['dashboard', 'settings', 'sign-in'])
  expect(sceneOptions.map((option) => option.label)).toEqual(['Dashboard', 'Settings', 'Sign in'])
})

it('still names the components of every scene the protocol accepts', () => {
  for (const scene of presetScenes) expect(sceneComponents[scene]).toBeTruthy()
})
