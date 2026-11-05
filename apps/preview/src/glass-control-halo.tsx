import { useEffect, useRef } from 'react'
import { applyGlassPointer, clearGlassPointer } from './generated/preset-gallery/components/ui/liquid-glass-filter'

const extraSurfaces = '[data-slot="input"], [data-slot="tabs-trigger"], [data-slot="select-content"]'

/** The lab's additional preview halos. Existing installed filter files stay compatible. */
export function GlassControlHalo({ enabled }: { enabled: boolean }) {
  const fieldRing = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const mountedRing = fieldRing.current
    if (!enabled || !mountedRing) return
    const ring = mountedRing
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let current: HTMLElement | null = null
    let latest: PointerEvent | undefined
    let frame = 0

    function clear() {
      clearGlassPointer(current)
      current = null
      latest = undefined
      ring.hidden = true
    }
    function update() {
      frame = 0
      if (!latest) return
      const target = latest.target instanceof Element ? latest.target.closest<HTMLElement>(extraSurfaces) : null
      if (target !== current) clearGlassPointer(current)
      current = target
      if (target) applyGlassPointer(target, latest.clientX, latest.clientY, reduced.matches)
      ring.hidden = !(target instanceof HTMLInputElement)
      if (target instanceof HTMLInputElement) {
        // A native input has no pseudo-element. A fixed ring leaves the field's DOM and sizing alone.
        const box = target.getBoundingClientRect()
        Object.assign(ring.style, {
          left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px',
          borderRadius: getComputedStyle(target).borderRadius,
        })
        ring.style.setProperty('--pointer-x', target.style.getPropertyValue('--pointer-x'))
        ring.style.setProperty('--pointer-y', target.style.getPropertyValue('--pointer-y'))
      }
    }
    function follow(event: PointerEvent) {
      latest = event
      if (!frame) frame = requestAnimationFrame(update)
    }
    function release(event: PointerEvent) {
      if (event.type !== 'pointerup' || event.pointerType !== 'mouse') clear()
    }
    const root = document.documentElement
    document.addEventListener('pointermove', follow)
    document.addEventListener('pointerdown', follow)
    document.addEventListener('pointerup', release)
    document.addEventListener('pointercancel', release)
    document.addEventListener('scroll', clear, true)
    root.addEventListener('pointerleave', clear)
    return () => {
      document.removeEventListener('pointermove', follow)
      document.removeEventListener('pointerdown', follow)
      document.removeEventListener('pointerup', release)
      document.removeEventListener('pointercancel', release)
      document.removeEventListener('scroll', clear, true)
      root.removeEventListener('pointerleave', clear)
      cancelAnimationFrame(frame)
      clear()
    }
  }, [enabled])
  return <span ref={fieldRing} data-slot="glass-field-halo" aria-hidden="true" hidden />
}
