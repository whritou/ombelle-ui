'use client'
import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from './utils.js'
import './breadcrumb.css'

export type BreadcrumbProps = React.ComponentProps<'nav'> & {
  /** `auto` folds middle items into a menu when the trail does not fit; the server renders the full trail. */
  collapse?: Collapse
}
export type BreadcrumbListProps = React.ComponentProps<'ol'>
export type BreadcrumbItemProps = React.ComponentProps<'li'>
export type BreadcrumbLinkProps = React.ComponentProps<'a'>
export type BreadcrumbPageProps = React.ComponentProps<'span'>
export type BreadcrumbSeparatorProps = React.ComponentProps<'li'>
export type BreadcrumbEllipsisProps = React.ComponentProps<'span'>

export function Breadcrumb({
  className,
  'aria-label': label = 'Breadcrumb',
  collapse = 'none',
  ...props
}: BreadcrumbProps) {
  const nav = (
    <nav
      {...props}
      aria-label={label}
      data-slot="breadcrumb"
      data-collapse={collapse === 'auto' ? 'auto' : undefined}
      className={cn(className)}
    />
  )
  return collapse === 'auto' ? <CollapseContext.Provider value="auto">{nav}</CollapseContext.Provider> : nav
}

export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
  if (React.useContext(CollapseContext) === 'auto') return <CollapsingList {...props} className={className} />
  return <ol {...props} data-slot="breadcrumb-list" className={cn(className)} />
}

export function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return <li {...props} data-slot="breadcrumb-item" className={cn(className)} />
}

export function BreadcrumbLink({ className, ...props }: BreadcrumbLinkProps) {
  return <a {...props} data-slot="breadcrumb-link" className={cn(className)} />
}

export function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
  return (
    <span
      {...props}
      aria-current="page"
      data-slot="breadcrumb-page"
      className={cn(className)}
    />
  )
}

export function BreadcrumbSeparator({
  className,
  children,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      {...props}
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      tabIndex={undefined}
      className={cn(className)}
    >
      {children ?? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m9 5 7 7-7 7" />
        </svg>
      )}
    </li>
  )
}

export function BreadcrumbEllipsis({
  className,
  children,
  ...props
}: BreadcrumbEllipsisProps) {
  const hidden = React.useContext(HiddenContext)
  if (hidden) return <BreadcrumbOverflowMenu hidden={hidden} className={className} />
  return (
    <span
      {...props}
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      tabIndex={undefined}
      className={cn(className)}
    >
      {children ?? '…'}
    </span>
  )
}

type Collapse = 'none' | 'auto'
const CollapseContext = React.createContext<Collapse>('none')
type Hidden = { count: number; links(): { label: string; href: string }[] }
const HiddenContext = React.createContext<Hidden | null>(null)
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

/**
 * How many middle items to fold, from the second onward, so the trail fits: the smallest count whose
 * width fits in `available`, every middle item when none does, and none for a trail of one or two.
 * `widths` are the items' widths in trail order; `separator` is one separator with its gap; `ellipsis`
 * is the ellipsis item.
 */
export function collapsedCount(widths: readonly number[], separator: number, ellipsis: number, available: number): number {
  const n = widths.length
  if (n <= 2) return 0
  const total = widths.reduce((sum, width) => sum + width, 0)
  let folded = 0
  for (let h = 0; h <= n - 2; h++) {
    if (h > 0) folded += widths[h]!
    const width = total - folded + separator * (n - 1 - h) + (h > 0 ? ellipsis + separator : 0)
    if (width <= available) return h
  }
  return n - 2
}

/** Children with fragments opened, so a trail mapped to fragments of item and separator still folds. */
function flattenTrail(children: React.ReactNode, prefix = ''): React.ReactNode[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return [child]
    if (child.type === React.Fragment) return flattenTrail(child.props.children, prefix + String(child.key) + '/')
    return [prefix ? React.cloneElement(child, { key: prefix + String(child.key) }) : child]
  })
}

function CollapsingList({ className, children, ...props }: React.ComponentProps<'ol'>) {
  const list = React.useRef<HTMLOListElement | null>(null)
  const measured = React.useRef<{ signature: string; widths: number[]; separator: number } | null>(null)
  const [hidden, setHidden] = React.useState(0)
  const [ellipsis, setEllipsis] = React.useState(48)
  const nodes = flattenTrail(children)
  const items = nodes.filter(node => React.isValidElement(node) && node.type === BreadcrumbItem)
  const fold = Math.min(hidden, Math.max(0, items.length - 2))

  const recompute = React.useCallback(() => {
    const element = list.current
    if (!element) return
    // Parts are told apart by structure, not by slot names: recipe scoping renames the slots.
    // Separators are presentational list items; the ellipsis item is marked.
    const children = Array.from(element.children) as HTMLElement[]
    const entries = children.filter(child => child.getAttribute('role') !== 'presentation' && !child.hasAttribute('data-breadcrumb-overflow'))
    const signature = entries.map(entry => entry.textContent ?? '').join('\u0000')
    if (measured.current?.signature !== signature) {
      // Measure from the full trail: unfold first, then measure on the next layout.
      if (entries.some(entry => entry.hidden)) {
        measured.current = null
        setHidden(0)
        return
      }
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0
      const separators = children.filter(child => child.getAttribute('role') === 'presentation')
      measured.current = {
        signature,
        widths: entries.map(entry => entry.getBoundingClientRect().width + gap),
        separator: (separators[0]?.getBoundingClientRect().width ?? 0) + gap,
      }
    }
    const { widths, separator } = measured.current
    // The list shrinks to its content inside the nav, so the space to fill is the nav's.
    const container = element.parentElement ?? element
    const style = getComputedStyle(container)
    const available = container.clientWidth - parseFloat(style.paddingInlineStart || '0') - parseFloat(style.paddingInlineEnd || '0')
    setHidden(collapsedCount(widths, separator, ellipsis, available + 1))
  }, [ellipsis])

  useIsomorphicLayoutEffect(() => {
    recompute()
  })
  React.useEffect(() => {
    const element = list.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => recompute())
    observer.observe(element)
    if (element.parentElement) observer.observe(element.parentElement)
    return () => observer.disconnect()
  }, [recompute])

  const hiddenLinks = React.useCallback(() => Array.from(list.current?.querySelectorAll<HTMLAnchorElement>(':scope > [data-breadcrumb-hidden] a[href]') ?? [])
    .map(link => ({ label: link.textContent ?? '', href: link.getAttribute('href') ?? '' })), [])

  let itemIndex = -1
  let hideNextSeparator = false
  const rendered: React.ReactNode[] = []
  for (const node of nodes) {
    if (React.isValidElement<Record<string, unknown>>(node) && node.type === BreadcrumbItem) {
      itemIndex++
      const fold_ = itemIndex >= 1 && itemIndex <= fold
      hideNextSeparator = fold_
      rendered.push(fold_ ? React.cloneElement(node, { hidden: true, 'data-breadcrumb-hidden': '' }) : node)
      continue
    }
    if (React.isValidElement<Record<string, unknown>>(node) && node.type === BreadcrumbSeparator) {
      rendered.push(hideNextSeparator ? React.cloneElement(node, { hidden: true, 'data-breadcrumb-hidden': '' }) : node)
      if (itemIndex === 0 && fold > 0) rendered.push(
        <BreadcrumbItem key="breadcrumb-overflow" data-breadcrumb-overflow="" ref={(element: HTMLLIElement | null) => {
          if (element) setEllipsis(width => Math.abs(width - element.getBoundingClientRect().width) < 0.5 ? width : element.getBoundingClientRect().width)
        }}>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>,
        <BreadcrumbSeparator key="breadcrumb-overflow-separator" />,
      )
      hideNextSeparator = false
      continue
    }
    rendered.push(node)
  }
  return (
    <HiddenContext.Provider value={fold > 0 ? { count: fold, links: hiddenLinks } : null}>
      <ol {...props} ref={list} data-slot="breadcrumb-list" className={cn(className)}>{rendered}</ol>
    </HiddenContext.Provider>
  )
}

/** The folded items, as links in trail order, behind a button named "Show N more". */
function BreadcrumbOverflowMenu({ hidden, className }: { hidden: Hidden; className?: string }) {
  const [links, setLinks] = React.useState<{ label: string; href: string }[]>([])
  return (
    <DropdownMenuPrimitive.Root onOpenChange={open => open && setLinks(hidden.links())}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button type="button" data-slot="breadcrumb-ellipsis" aria-label={`Show ${hidden.count} more`} className={cn(className)}>
          <span aria-hidden="true">…</span>
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content data-slot="breadcrumb-menu" align="start" sideOffset={4}>
          {links.map(link => (
            <DropdownMenuPrimitive.Item key={link.href + link.label} asChild>
              <a data-slot="breadcrumb-menu-item" href={link.href}>{link.label}</a>
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
