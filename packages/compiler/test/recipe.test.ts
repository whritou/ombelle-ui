import { expect, it } from 'vitest'
import { transform } from 'esbuild'
import { compileRecipe, sha256 } from '../src/index.js'
import example from '../../../examples/recipe.example.json'
const scopedArtifactHashes: Record<string, readonly string[]> = {
  flat: [
    'be8f388fd95e15af2189aadf6f05190350fc31ad86cad5cd09720f4c2bd07277',
    '33eb185c5043ef9e3396be83a495f47af5f232b193893b598798ec017b1d8316',
  ],
  minimalist: [
    '7c41502a0bf5cb14e1efd14769e6a646db8d01bb84f2b995e6548aad53f3a846',
    '1fdd3d5120e4ef5c6f45268e435c5734169eb05d652b380984a41239e35700e6',
  ],
  'neo-brutalism': [
    'af7399ba6ebaa023666e374f2a286fff35bb822dc438ac62d66f93cd0a5d5d04',
    '38afc8b8846dd7932570a9979ef7554de570b1055a8abf76648e2b7a76c00dad',
  ],
} as const
it('normalizes defaults and stable identity across key order and dark context', async () => {
  const omitted = { ...example, props: {} }
  const a = await compileRecipe({ recipe: omitted })
  const b = await compileRecipe({
    recipe: { ...omitted, props: a.recipe.data.props },
  })
  expect(a).toEqual(b)
  const night = await compileRecipe({ recipe: omitted, darkSelector: '.night' })
  expect(night.scope).toBe(a.scope)
  expect(night.recipe.hash).toBe(a.recipe.hash)
  expect(night.artifacts.find((a) => a.kind === 'style')!.sha256).not.toBe(
    a.artifacts.find((a) => a.kind === 'style')!.sha256,
  )
})
it.each(['flat', 'minimalist', 'neo-brutalism'])(
  'pins self-contained %s recipe artifacts',
  async (family) => {
    const a = await compileRecipe({
      recipe: {
        ...example,
        presetRef: { ...example.presetRef, id: 'builtin-' + family },
      },
    })
    expect(
      a.artifacts
        .filter((artifact) => ['component', 'style'].includes(artifact.kind))
        .map(({ sha256 }) => sha256),
    ).toEqual(scopedArtifactHashes[family])
    expect(a.artifacts.map((a) => a.logicalPath)).toEqual([
      'examples/recipes/rc_primary-button/r2.tsx',
      'lib/utils.ts',
      'recipes/rc_primary-button/r2/button.css',
      'recipes/rc_primary-button/r2/button.tsx',
    ])
    for (const artifact of a.artifacts)
      expect(await sha256(artifact.content)).toBe(artifact.sha256)
    expect(a.artifacts.some((a) => a.logicalPath.includes('ui-tokens'))).toBe(
      false,
    )
  },
)
it('escapes content into valid source and keeps native loading and scope after caller props', async () => {
  const content = `</button>{alert('x')}\n"\\`
  const result = await compileRecipe({
    recipe: { ...example, content, props: { loading: true } },
  })
  const source = result.artifacts.find((a) => a.kind === 'component')!.content
  expect(source).toContain("import './button.css'")
  expect(source).toContain('disabled={disabled || loading}')
  expect(source).toContain('aria-busy={loading || undefined}')
  expect(source.indexOf('{...native}')).toBeLessThan(
    source.indexOf('data-ombelle-recipe='),
  )
  await expect(transform(source, { loader: 'tsx' })).resolves.toBeDefined()
})

it('keeps existing recipe CSS and source output byte-for-byte stable', async () => {
  const result = await compileRecipe({ recipe: example })
  expect(
    result.artifacts
      .filter((artifact) => artifact.kind === 'style' || artifact.kind === 'component')
      .map(({ logicalPath, sha256 }) => [logicalPath, sha256]),
  ).toEqual([
    [
      'recipes/rc_primary-button/r2/button.css',
      'af7399ba6ebaa023666e374f2a286fff35bb822dc438ac62d66f93cd0a5d5d04',
    ],
    [
      'recipes/rc_primary-button/r2/button.tsx',
      '38afc8b8846dd7932570a9979ef7554de570b1055a8abf76648e2b7a76c00dad',
    ],
  ])
})
