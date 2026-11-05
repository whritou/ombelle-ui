import { expect, it } from 'vitest'
import { build, transform } from 'esbuild'
import { compile, compileRecipe, sha256 } from '../src/index.js'
import { getCatalog } from '@ombelle/catalog'
import example from '../../../examples/recipe.example.json'
const scopedArtifactHashes: Record<string, readonly string[]> = {
  flat: [
    'febe72ab5c88cf83e76060473786bc81df8de8f2018b550b3606866700d301d8',
    '51b699ec580af1a171d685f53fad6426cb45aeeb708917a8cd2a7adbb87f1fc5',
  ],
  minimalist: [
    'eb4f2cbf1ddef55b25ff6adab0bb75480e7161d13c397fd236ef1e82d47d82e6',
    '8a0fd18bd6c205cfa39aab34c28e9e01d8c8a5ec6612476e8a093238515e560f',
  ],
  'neo-brutalism': [
    'd9bd72559adb12d6b202922790ede3a949dea751940f8ba3a3265d6a0781248a',
    'be506c2c82e5941120e410ef544415e7413c26ea3d071c192bc39845d219652d',
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
      .filter(
        (artifact) =>
          artifact.kind === 'style' || artifact.kind === 'component',
      )
      .map(({ logicalPath, sha256 }) => [logicalPath, sha256]),
  ).toEqual([
    [
      'recipes/rc_primary-button/r2/button.css',
      'd9bd72559adb12d6b202922790ede3a949dea751940f8ba3a3265d6a0781248a',
    ],
    [
      'recipes/rc_primary-button/r2/button.tsx',
      'be506c2c82e5941120e410ef544415e7413c26ea3d071c192bc39845d219652d',
    ],
  ])
})

it('omits the unused Slot dependency only for native recipe Buttons and resolves their imports', async () => {
  const recipe = await compileRecipe({ recipe: example })
  const ordinary = await compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  expect(recipe.dependencies.map(({ name }) => name)).toEqual([
    'react',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ])
  expect(ordinary.dependencies).toContainEqual({
    name: '@radix-ui/react-slot',
    version: '1.5.0',
  })
  const source = recipe.artifacts.find(
    ({ kind }) => kind === 'component',
  )!.content
  const utility = recipe.artifacts.find(
    ({ kind }) => kind === 'utility',
  )!.content
  await expect(
    build({
      stdin: { contents: source, loader: 'tsx', resolveDir: process.cwd() },
      bundle: true,
      write: false,
      // Consumer packages are supplied by the returned manifest; local imports must resolve.
      external: recipe.dependencies.map(({ name }) => name),
      plugins: [
        {
          name: 'generated-recipe-artifacts',
          setup(builder) {
            builder.onResolve({ filter: /^@\/lib\/utils$/ }, () => ({
              path: 'utils',
              namespace: 'recipe',
            }))
            builder.onLoad({ filter: /.*/, namespace: 'recipe' }, () => ({
              contents: utility,
              loader: 'ts',
              resolveDir: process.cwd(),
            }))
            builder.onResolve({ filter: /^\.\/button\.css$/ }, () => ({
              path: 'button.css',
              external: true,
            }))
          },
        },
      ],
    }),
  ).resolves.toMatchObject({ errors: [] })
})
it('compiles recipe color overrides for the selected variant and rejects invalid colors', async () => {
  const result = await compileRecipe({
    recipe: {
      ...example,
      props: { ...example.props, variant: 'destructive' },
      overrides: { colors: { light: { background: '#123456' }, dark: { foreground: '#fedcba' } } },
    },
  })
  const css = result.artifacts.find((a) => a.kind === 'style')!.content
  expect(css).toContain('--destructive: #123456;')
  expect(css).toContain('--destructive-foreground: #fedcba;')
  await expect(
    compileRecipe({
      recipe: { ...example, overrides: { colors: { dark: { border: 'oklch(0.5 0.5 10)' } } } },
    }),
  ).rejects.toMatchObject({ code: 'INVALID_DATA', path: '/overrides/colors/dark/border' })
})
