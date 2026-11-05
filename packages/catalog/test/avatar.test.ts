import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarStatus,
} from '../src/templates/avatar.js'
import { expectComponentContract } from './new-component-contract.js'

describe('Avatar catalog contract', () => {
  it('provides Radix Avatar parts, sizes, variants and family styles', () => {
    expectComponentContract('avatar', {
      client: true,
      parts: [
        'Avatar',
        'AvatarImage',
        'AvatarFallback',
        'AvatarStatus',
        'AvatarGroup',
      ],
      slots: [
        'avatar',
        'avatar-image',
        'avatar-fallback',
        'avatar-status',
        'avatar-group',
      ],
      dependencies: [
        { name: 'react', version: '19.3.1' },
        { name: '@radix-ui/react-avatar', version: '1.3.1' },
        { name: 'clsx', version: '2.1.1' },
        { name: 'tailwind-merge', version: '3.7.0' },
      ],
      selectors: [
        "[data-slot='avatar']",
        "[data-slot='avatar'][data-size='sm']",
        "[data-slot='avatar'][data-size='lg']",
        "[data-slot='avatar'][data-variant='primary']",
        "[data-slot='avatar'][data-variant='secondary']",
        "[data-slot='avatar-image']",
        "[data-slot='avatar-fallback']",
        "[data-slot='avatar-status']",
        "[data-slot='avatar-status'][data-status='offline']",
        "[data-slot='avatar-group'] > [data-slot='avatar'] + [data-slot='avatar']",
      ],
      glass: 'unavailable',
    })
  })

  it('renders a named avatar with a decorative status and a labelled group', () => {
    const html = renderToStaticMarkup(
      createElement(
        AvatarGroup,
        { 'aria-label': 'Reviewers' },
        createElement(
          Avatar,
          { size: 'lg', variant: 'primary', role: 'img', 'aria-label': 'Ada, online' },
          createElement(AvatarFallback, null, 'AL'),
          createElement(AvatarStatus, { status: 'offline' }),
        ),
      ),
    )
    for (const text of [
      'role="group"',
      'aria-label="Reviewers"',
      'data-slot="avatar"',
      'data-size="lg"',
      'data-variant="primary"',
      'role="img"',
      'aria-label="Ada, online"',
      'aria-hidden="true"',
      'data-status="offline"',
    ])
      expect(html).toContain(text)
  })
})
