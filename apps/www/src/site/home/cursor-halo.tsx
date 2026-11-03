'use client'

import { useEffect, useRef } from 'react'

/** Pink halo that eases toward the pointer inside its positioned parent. */
export function CursorHalo() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    const host = el?.parentElement
    if (!el || !host) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let tx = 0.7, ty = 0.3, x = tx, y = ty, raf = 0, t = 0
    let idle = true
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      tx = (e.clientX - r.left) / r.width
      ty = (e.clientY - r.top) / r.height
      idle = false
    }
    const onLeave = () => { idle = true }
    const tick = () => {
      t += 0.006
      if (idle) {
        tx = 0.68 + Math.cos(t) * 0.12
        ty = 0.35 + Math.sin(t * 1.3) * 0.12
      }
      x += (tx - x) * 0.06
      y += (ty - y) * 0.06
      el.style.setProperty('--hx', `${(x * 100).toFixed(2)}%`)
      el.style.setProperty('--hy', `${(y * 100).toFixed(2)}%`)
      raf = requestAnimationFrame(tick)
    }
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [])
  return <div ref={ref} aria-hidden className="halo pointer-events-none absolute inset-0" />
}
