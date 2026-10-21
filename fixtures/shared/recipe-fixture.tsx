'use client'
import * as React from 'react'
import { RecipeButton as Flat } from '@/components/ui/recipes/rc_flat_button/r1/button'
import { RecipeButton as Minimalist } from '@/components/ui/recipes/rc_minimalist_button/r1/button'
import { RecipeButton as Brutalist } from '@/components/ui/recipes/rc_neo_brutalism_button/r1/button'
const entries = {
  rc_flat_button: Flat,
  rc_minimalist_button: Minimalist,
  rc_neo_brutalism_button: Brutalist,
}
export function RecipeFixture() {
  const query = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search,
  )
  const Component = entries[query.get('recipe') as keyof typeof entries] ?? Flat
  const [loading, setLoading] = React.useState(false),
    [disabled, setDisabled] = React.useState(false),
    [clicks, setClicks] = React.useState(0)
  const states = query.get('recipeStates') === '1',
    tamper = query.get('tamper') === '1'
  return (
    <section data-testid="recipe-fixture" aria-label="Recipe fixture">
      <style>
        {
          '@media(max-width:480px){body:has([data-testid="recipe-fixture"]) main{padding:24px 16px}body:has([data-testid="recipe-fixture"]) header{flex-wrap:wrap}}'
        }
      </style>
      <div
        data-testid="recipe-specimen"
        style={{
          width: 360,
          maxWidth: '100%',
          padding: 32,
          background: '#808080',
          boxSizing: 'border-box',
        }}
      >
        <Component
          data-testid="recipe-default"
          {...(tamper
            ? { 'data-ombelle-recipe': 'tampered', 'data-slot': 'button' }
            : {})}
          loading={loading}
          disabled={disabled}
          onClick={() => setClicks((n) => n + 1)}
        />
      </div>
      <div
        style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 24 }}
      >
        <button type="button" onClick={() => setLoading((v) => !v)}>
          Toggle recipe loading
        </button>
        <button type="button" onClick={() => setDisabled((v) => !v)}>
          Toggle recipe disabled
        </button>
        <output data-testid="recipe-clicks" aria-label="Recipe activations">
          {clicks}
        </output>
      </div>
      {states && (
        <div
          data-testid="recipe-states"
          style={{ display: 'grid', gap: 16, marginTop: 24 }}
        >
          {(
            [
              'default',
              'secondary',
              'outline',
              'ghost',
              'link',
              'destructive',
            ] as const
          ).map((variant) => (
            <Component
              key={variant}
              variant={variant}
              data-testid={'recipe-variant-' + variant}
            >
              {variant} action
            </Component>
          ))}
          {(['sm', 'default', 'lg', 'icon'] as const).map((size) => (
            <Component
              key={size}
              size={size}
              data-testid={'recipe-size-' + size}
            >
              Visible {size} text
            </Component>
          ))}
          <Component data-testid="recipe-long">
            {'Long escaped text " } <script> & \\ '.repeat(4)}
          </Component>
        </div>
      )}
    </section>
  )
}
