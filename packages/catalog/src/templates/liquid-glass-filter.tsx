'use client'
import * as React from 'react'

// Edge-refraction map. Red encodes horizontal and green vertical displacement:
// neutral (0.5) in the middle, bending the backdrop inward towards each rim.
const ramp = (axis: 'x' | 'y') => {
  const color = (value: number) =>
    axis === 'x' ? `rgb(${value},0,0)` : `rgb(0,${value},0)`
  const direction = axis === 'x' ? "x2='1' y2='0'" : "x2='0' y2='1'"
  const svg =
    // A large map keeps the stretched gradient free of visible steps.
    `<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000' preserveAspectRatio='none'>` +
    `<linearGradient id='g' ${direction}>` +
    `<stop offset='0' stop-color='${color(255)}'/>` +
    `<stop offset='0.14' stop-color='${color(128)}'/>` +
    `<stop offset='0.86' stop-color='${color(128)}'/>` +
    `<stop offset='1' stop-color='${color(1)}'/>` +
    `</linearGradient><rect width='1000' height='1000' fill='url(#g)'/></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// One displaced copy per colour channel, offset slightly for a soft prism edge.
const channels = [
  { scale: 0.055, matrix: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' },
  { scale: 0.05225, matrix: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' },
  { scale: 0.0495, matrix: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' },
] as const

// Surfaces the pointer halo can light. Kept in step with glassHaloSelector in @ombelle/catalog by its tests.
export const haloSelector =
  '[data-slot="card"], [data-slot="tooltip-content"], [data-slot="alert"], [data-slot="button"], [data-slot="badge"], ' +
  '[data-slot="tabs-list"], [data-slot="select-trigger"], [data-slot="recipe-button"], [data-slot="scoped-button"]'

type PointerSurface = {
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): void }
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  getBoundingClientRect(): { left: number; top: number; width: number; height: number }
}

export function glassSurfaceFor(target: EventTarget | null): PointerSurface | null {
  const closest = (target as { closest?: (selector: string) => unknown } | null)?.closest
  if (typeof closest !== 'function') return null
  return (closest.call(target, haloSelector) as PointerSurface | null) ?? null
}

/** Lights the rim nearest the pointer; under reduced motion the halo stays at the top edge. */
export function applyGlassPointer(surface: PointerSurface, x: number, y: number, reducedMotion: boolean) {
  if (!reducedMotion) {
    const box = surface.getBoundingClientRect()
    surface.style.setProperty('--pointer-x', (100 * (x - box.left)) / box.width + '%')
    surface.style.setProperty('--pointer-y', (100 * (y - box.top)) / box.height + '%')
  }
  surface.setAttribute('data-halo-active', '')
}

export function clearGlassPointer(surface: PointerSurface | null) {
  if (!surface) return
  surface.removeAttribute('data-halo-active')
  surface.style.removeProperty('--pointer-x')
  surface.style.removeProperty('--pointer-y')
}

/**
 * Rim-only displacement map: a rounded-rectangle distance field. Red and green are the horizontal and vertical
 * offsets around 128, strongest at the edge and neutral beyond widthFraction of the surface.
 */
export function glassRimMapPixels(size: number, radius: number, widthFraction: number) {
  const data = new Uint8ClampedArray(size * size * 4)
  const rim = size * widthFraction
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5 - size / 2
      const py = y + 0.5 - size / 2
      const qx = Math.abs(px) - (size / 2 - radius)
      const qy = Math.abs(py) - (size / 2 - radius)
      const cornerX = Math.max(qx, 0)
      const cornerY = Math.max(qy, 0)
      const cornerLength = Math.hypot(cornerX, cornerY)
      const distance = radius - cornerLength - Math.min(Math.max(qx, qy), 0)
      const strength = rim > 0 ? Math.max(0, 1 - Math.max(0, distance) / rim) ** 2 : 0
      const normalX = cornerLength ? cornerX / cornerLength : Number(qx >= qy)
      const normalY = cornerLength ? cornerY / cornerLength : Number(qy > qx)
      const index = (y * size + x) * 4
      data[index] = 128 - 125 * strength * normalX * Math.sign(px)
      data[index + 1] = 128 - 125 * strength * normalY * Math.sign(py)
      data[index + 2] = 128
      data[index + 3] = 255
    }
  }
  return data
}

const rimMapUrl = (widthFraction: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 192
  const context = canvas.getContext('2d')
  if (!context) return undefined
  context.putImageData(new ImageData(glassRimMapPixels(192, 23, widthFraction), 192, 192), 0, 0)
  return canvas.toDataURL()
}

/** Refraction applies only when the preset leaves the original edge filter on, or sets a rim map and a strength. */
export function refracts(material: { width: number; strength: number } | undefined) {
  return material === undefined || (material.width > 0 && material.strength > 0)
}

/** The pointer listener runs only when the preset uses it: a halo or a shine that travels. */
export function tracksPointer(halo: number, motion: number) {
  return halo > 0 || motion > 0
}

const readNumber = (style: CSSStyleDeclaration, name: string) => {
  const value = parseFloat(style.getPropertyValue(name))
  return Number.isFinite(value) ? value : 0
}

const readMaterial = () => {
  const style = getComputedStyle(document.documentElement)
  const width = parseFloat(style.getPropertyValue('--glass-refraction-width'))
  const strength = parseFloat(style.getPropertyValue('--glass-refraction-strength'))
  return Number.isFinite(width) ? { width, strength: Number.isFinite(strength) ? strength : 0 } : undefined
}

type UserAgentData = { brands?: readonly { brand: string }[] }

/**
 * Mount once, for example in your root layout. It lights the rim of the glass surface under the pointer
 * (one listener for the page; at the top edge under reduced motion). In Chromium browsers it also refracts
 * the backdrop: along the rim when the preset sets glassRefractionWidth, otherwise with the original edge
 * ramp and prism. Other browsers keep the blurred glass. Reduced transparency and forced colours still apply.
 */
export function LiquidGlassFilter() {
  const [material, setMaterial] = React.useState<{ width: number; strength: number; url?: string }>()
  const [chromium, setChromium] = React.useState(false)
  React.useEffect(() => {
    const tokens = getComputedStyle(document.documentElement)
    // Presets without a halo or travelling shine pay nothing per pointer move.
    if (!tracksPointer(readNumber(tokens, '--glass-halo'), readNumber(tokens, '--glass-motion'))) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let current: PointerSurface | null = null
    let frame = 0
    let last: PointerEvent | undefined
    // One write per animation frame: reading the box right after a write would force layout on every move.
    const flush = () => {
      frame = 0
      if (!last) return
      const surface = glassSurfaceFor(last.target)
      if (surface !== current) clearGlassPointer(current)
      current = surface
      if (surface) applyGlassPointer(surface, last.clientX, last.clientY, motion.matches)
    }
    const follow = (event: PointerEvent) => {
      last = event
      if (!frame) frame = requestAnimationFrame(flush)
    }
    const release = (event: PointerEvent) => {
      if (event.type === 'pointerup' && event.pointerType === 'mouse') return
      last = undefined
      clearGlassPointer(current)
      current = null
    }
    const root = document.documentElement
    document.addEventListener('pointermove', follow)
    document.addEventListener('pointerdown', follow)
    document.addEventListener('pointerup', release)
    document.addEventListener('pointercancel', release)
    root.addEventListener('pointerleave', release)
    return () => {
      document.removeEventListener('pointermove', follow)
      document.removeEventListener('pointerdown', follow)
      document.removeEventListener('pointerup', release)
      document.removeEventListener('pointercancel', release)
      root.removeEventListener('pointerleave', release)
      if (frame) cancelAnimationFrame(frame)
      clearGlassPointer(current)
    }
  }, [])
  React.useEffect(() => {
    const data = (navigator as Navigator & { userAgentData?: UserAgentData })
      .userAgentData
    // Only Chromium applies SVG filters in backdrop-filter.
    if (!data?.brands?.some((entry) => entry.brand === 'Chromium')) return
    // Glass surfaces read this inherited property in their backdrop-filter.
    const root = document.documentElement
    setChromium(true)
    // The preset's tokens may change at runtime (a theme switch), so they are re-read when the root changes.
    const update = () => {
      const next = readMaterial()
      setMaterial((previous) =>
        previous?.width === next?.width && previous?.strength === next?.strength
          ? previous
          : next && { ...next, url: next.width > 0 ? rimMapUrl(next.width) : undefined },
      )
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    return () => {
      observer.disconnect()
      root.style.removeProperty('--glass-refraction')
    }
  }, [])
  // A rim map at width or strength 0 would be an empty filter, which some engines paint transparent.
  React.useEffect(() => {
    const root = document.documentElement
    if (!chromium) return
    if (refracts(material)) root.style.setProperty('--glass-refraction', 'url(#ombelle-liquid-glass)')
    else root.style.removeProperty('--glass-refraction')
  }, [chromium, material])
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <filter
        id="ombelle-liquid-glass"
        x="0"
        y="0"
        width="100%"
        height="100%"
        primitiveUnits="objectBoundingBox"
        colorInterpolationFilters="sRGB"
      >
        {material ? (
          material.url && (
            <>
              <feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none" href={material.url} result="rim" />
              <feDisplacementMap in="SourceGraphic" in2="rim" scale={material.strength} xChannelSelector="R" yChannelSelector="G" />
            </>
          )
        ) : (
          <>
            <feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none" href={ramp('x')} result="rampX" />
            <feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none" href={ramp('y')} result="rampY" />
            <feComposite in="rampX" in2="rampY" operator="arithmetic" k2="1" k3="1" result="map" />
            {channels.map((channel, index) => (
              <React.Fragment key={index}>
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="map"
                  scale={channel.scale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result={'shift' + index}
                />
                <feColorMatrix in={'shift' + index} type="matrix" values={channel.matrix} result={'channel' + index} />
              </React.Fragment>
            ))}
            <feBlend in="channel0" in2="channel1" mode="screen" result="redGreen" />
            <feBlend in="redGreen" in2="channel2" mode="screen" />
          </>
        )}
      </filter>
    </svg>
  )
}
