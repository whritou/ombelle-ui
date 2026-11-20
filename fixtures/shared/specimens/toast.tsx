'use client'
import { ToastProvider } from '@/components/ui/toast'
import { ToastExample } from './shared'

export function Specimen() {
  return (
    <section aria-label="Toast" data-component="toast">
      <h2>Toast</h2><ToastProvider><ToastExample /></ToastProvider>
    </section>
  )
}
