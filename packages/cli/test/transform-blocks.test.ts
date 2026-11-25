import { expect, it } from 'vitest'
import type { Artifact, ProjectContext } from '@ombelle/contracts'
import { transformArtifact } from '../src/project/transform.js'

const context = (componentsDir: string) =>
  ({ componentsDir, sourceDir: 'src', utilsAlias: '@/lib/utils', uiAlias: '@/components/ui' }) as ProjectContext
const block = (logicalPath: string, content = ''): Artifact =>
  ({ logicalPath, kind: 'block', content }) as Artifact

it('places blocks beside the ui directory', () => {
  expect(transformArtifact(context('src/components/ui'), block('blocks/login-01.tsx')).path).toBe('src/components/blocks/login-01.tsx')
  expect(transformArtifact(context('src/ui'), block('blocks/login-01.tsx')).path).toBe('src/blocks/login-01.tsx')
  expect(transformArtifact(context('ui'), block('blocks/login-01.tsx')).path).toBe('blocks/login-01.tsx')
  expect(transformArtifact(context('src/components/ui'), block('blocks/login-01.css')).path).toBe('src/components/blocks/login-01.css')
})

it('points beside components at the beside directory only', () => {
  const content = "import { Button } from '@/components/ui/button'\nimport { Card } from '@/components/ui/card'\nimport './login-01.css'\n"
  const out = transformArtifact(context('src/components/ui'), block('blocks/login-01.tsx', content), new Set(['button']))
  expect(out.content).toContain("'@/components/ui/ombelle/button'")
  expect(out.content).toContain("'@/components/ui/card'")
  expect(out.content).toContain("'./login-01.css'")
})
