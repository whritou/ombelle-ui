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

type UserAgentData = { brands?: readonly { brand: string }[] }

/**
 * Mount once, for example in your root layout. In Chromium browsers it adds
 * refraction and a prism edge to liquid-glass surfaces; other browsers keep
 * the blurred glass. Reduced transparency and forced colours still apply.
 */
export function LiquidGlassFilter() {
  React.useEffect(() => {
    const data = (navigator as Navigator & { userAgentData?: UserAgentData })
      .userAgentData
    // Only Chromium applies SVG filters in backdrop-filter.
    if (!data?.brands?.some((entry) => entry.brand === 'Chromium')) return
    // Glass surfaces read this inherited property in their backdrop-filter.
    const root = document.documentElement
    root.style.setProperty('--glass-refraction', 'url(#ombelle-liquid-glass)')
    return () => {
      root.style.removeProperty('--glass-refraction')
    }
  }, [])
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
      </filter>
    </svg>
  )
}
