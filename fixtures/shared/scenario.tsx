'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StateFixture } from './state-fixture'
import { RecipeFixture } from './recipe-fixture'
import { ComponentPresetFixture } from './component-preset-fixture'
import { BadgeFixture } from './badge-fixture'
import { CardFixture } from './card-fixture'
export default function Scenario() {
  const [ready, setReady] = React.useState(false)
  const [mode, setMode] = React.useState('light')
  const [states, setStates] = React.useState(false)
  const [recipes, setRecipes] = React.useState(false)
  const [componentPresets, setComponentPresets] = React.useState(false)
  const [badges, setBadges] = React.useState(false)
  const [cards, setCards] = React.useState(false)
  React.useEffect(() => {
    setBadges(new URLSearchParams(window.location.search).get('badges') === '1')
    setCards(new URLSearchParams(window.location.search).get('cards') === '1')
    setRecipes(
      new URLSearchParams(window.location.search).get('recipes') === '1',
    )
    setComponentPresets(
      new URLSearchParams(window.location.search).get('componentPresets') ===
        '1',
    )
  }, [])
  React.useEffect(() => {
    const enabled =
      new URLSearchParams(window.location.search).get('states') === '1'
    setStates(enabled)
    document.documentElement.dataset.states = String(enabled)
  }, [])
  React.useEffect(() => {
    const selected =
      new URLSearchParams(window.location.search).get('mode') === 'dark'
        ? 'dark'
        : 'light'
    document.documentElement.classList.toggle('dark', selected === 'dark')
    document.documentElement.style.colorScheme = selected
    setMode(selected)
    setReady(true)
  }, [])
  return (
    <main data-ready={String(ready)} data-style="STYLE_FAMILY">
      <header>
        <div>
          <h1>Ombelle foundation</h1>
          <p>STYLE_FAMILY · {mode} mode</p>
        </div>
        <nav aria-label="Color mode">
          <a href="?mode=light">Light</a>
          <a href="?mode=dark">Dark</a>
        </nav>
      </header>
      <section
        className="specimen"
        data-testid="specimen"
        aria-labelledby="settings-heading"
      >
        <h2 id="settings-heading">Project settings</h2>
        <p>Preview, export, install.</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" defaultValue="hello@ombelle.dev" />
        </div>
        <div className="actions">
          <Button>Save changes</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Confirm changes</DialogTitle>
            <DialogDescription>
              Review your project settings before continuing.
            </DialogDescription>
            <Button>Confirm</Button>
          </DialogContent>
        </Dialog>
      </section>
      {states && <StateFixture />}
      {recipes && <RecipeFixture />}
      {componentPresets && <ComponentPresetFixture />}
      {badges && <BadgeFixture />}
      {cards && <CardFixture />}
      <p className="note">
        Generated components · local preset · editable source
      </p>
    </main>
  )
}
