'use client'
import * as React from 'react'
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { cn } from './utils.js'
import './avatar.css'

/** Base UI parts accept a className function; these components take a string. */
type Part<T extends React.ElementType> = Omit<React.ComponentProps<T>, 'className'> & {
  className?: string
}

export type AvatarProps = Part<typeof AvatarPrimitive.Root> & {
  size?: 'sm' | 'default' | 'lg'
  /** Fallback colours: accent (default), primary or secondary. */
  variant?: 'default' | 'primary' | 'secondary'
  /** square suits workspaces and teams; circle (default) suits people. */
  shape?: 'circle' | 'square'
}

/** True when the Avatar holds an AvatarImage, so its fallback waits for the image. */
const AvatarHasImage = React.createContext(false)

export function Avatar({
  className,
  size = 'default',
  variant = 'default',
  shape,
  children,
  ...props
}: AvatarProps) {
  const hasImage = React.Children.toArray(children).some(child => React.isValidElement(child) && child.type === AvatarImage)
  return (
    <AvatarHasImage.Provider value={hasImage}>
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-variant={variant}
      data-shape={shape === 'square' ? 'square' : undefined}
      className={cn(className)}
      {...props}
    >
      {children}
    </AvatarPrimitive.Root>
    </AvatarHasImage.Provider>
  )
}

export function AvatarImage({
  className,
  ...props
}: Part<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * Beside an AvatarImage, the fallback waits 600 ms by default, so an image that loads quickly never
 * flashes initials. Without an image it shows at once. delayMs (or Base UI's delay) of 0 shows it at once.
 */
export function AvatarFallback({
  className,
  delayMs,
  delay,
  ...props
}: Part<typeof AvatarPrimitive.Fallback> & { delayMs?: number }) {
  const hasImage = React.useContext(AvatarHasImage)
  const wait = delayMs ?? delay ?? (hasImage ? 600 : undefined)
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(className)}
      delay={wait || undefined}
      {...props}
    />
  )
}

/**
 * A presence dot in the avatar's corner. It is decorative: put the status
 * in the avatar's accessible name, for example aria-label="Ada, online".
 */
export function AvatarStatus({
  className,
  status = 'online',
  ...props
}: React.ComponentProps<'span'> & { status?: 'online' | 'offline' }) {
  return (
    <span
      aria-hidden="true"
      {...props}
      data-slot="avatar-status"
      data-status={status}
      className={cn(className)}
    />
  )
}

/** Overlapping avatars. Name the group, for example aria-label="Reviewers". */
export function AvatarGroup({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      role="group"
      {...props}
      data-slot="avatar-group"
      className={cn(className)}
    />
  )
}

/** The count of avatars not shown, such as +4. Its name defaults to "4 more". */
export function AvatarOverflow({
  className,
  count,
  label,
  size = 'default',
  ...props
}: React.ComponentProps<'span'> & { count: number; label?: string; size?: 'sm' | 'default' | 'lg' }) {
  return (
    <span
      role="img"
      aria-label={label ?? `${count} more`}
      {...props}
      data-slot="avatar-overflow"
      data-size={size}
      className={cn(className)}
    >
      +{count}
    </span>
  )
}
