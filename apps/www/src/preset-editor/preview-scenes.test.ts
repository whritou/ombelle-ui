import { expect, it } from 'vitest'
import { presetScenes } from './preview-protocol'
import { sceneComponents, sceneOptions } from './preview-scenes'

it('offers the built pages but not the component gallery', () => {
  expect(sceneOptions.map((option) => option.value)).toEqual(['dashboard', 'projects', 'settings', 'sign-in'])
  expect(sceneOptions.map((option) => option.label)).toEqual(['Dashboard', 'Projects', 'Settings', 'Sign in'])
})

it('shows every catalog component across the pages', () => {
  const names = new Set(
    sceneOptions.flatMap((option) => sceneComponents[option.value].split(', ')),
  )
  expect(names.size).toBe(45)
})

it('still names the components of every scene the protocol accepts', () => {
  for (const scene of presetScenes) expect(sceneComponents[scene]).toBeTruthy()
})
