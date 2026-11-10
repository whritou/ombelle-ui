import { expect, it } from 'vitest'
import { build, transform } from 'esbuild'
import { compile, compileRecipe, sha256 } from '../src/index.js'
import { getCatalog } from '@ombelle/catalog'
import postcss from 'postcss'
import example from '../../../examples/recipe.example.json'

it.each([0, 1.25])(
  'honors the explicit Ombelle recipe radius %s over the family pill shape',
  async (radiusRem) => {
    const compileRadius = async (overrides: Record<string, number>) => {
      const result = await compileRecipe({
        recipe: {
          ...example,
          presetRef: { ...example.presetRef, id: 'builtin-ombelle' },
          overrides,
        },
      })
      const radii: string[] = []
      postcss
        .parse(result.artifacts.find((a) => a.kind === 'style')!.content)
        .walkDecls('border-radius', (declaration) => {
          const selectors = (declaration.parent as postcss.Rule).selectors
          if (
            selectors.some(
              (selector) =>
                selector.replaceAll("'", '"') ===
                `[data-slot="recipe-button"][data-ombelle-recipe="${result.scope}"]`,
            )
          )
            radii.push(declaration.value)
        })
      return radii.at(-1)
    }
    expect(await compileRadius({})).toBe('999px')
    expect(await compileRadius({ radiusRem })).toBe('var(--radius)')
  },
)
const scopedArtifactHashes: Record<string, readonly string[]> = {
  flat: [
    '2a92abe6b10aaab44f3cfee57a745ecc8d1e57a22fcd3518406da2085582aa89',
    '1bacf80adf26149b21be735415d2c474396ca2b79cefaff3cca965906a9e4a25',
  ],
  minimalist: [
    'e150148643389ac07075bc2d341fcf1fb14304df5187dc98016d8ea2d30c1091',
    '197360502dc451e210c7b5f27824154585c9356e7b659e6d2508f8d363102cda',
  ],
  'neo-brutalism': [
    '1ad832bd10dfed2aa04f8197e8598456afb43ee27d042c81e517b2b455e363b2',
    'f1890fe5a5b54a4b1306db6cf69d51b2fd8836975ff12eca9cef5650a12c894e',
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
      '1ad832bd10dfed2aa04f8197e8598456afb43ee27d042c81e517b2b455e363b2',
    ],
    [
      'recipes/rc_primary-button/r2/button.tsx',
      'f1890fe5a5b54a4b1306db6cf69d51b2fd8836975ff12eca9cef5650a12c894e',
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
