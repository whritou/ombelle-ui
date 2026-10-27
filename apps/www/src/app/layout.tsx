import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Ombelle UI — Your components. Your style.',
  description: 'Editable React components, expressive visual families, and reusable project presets for your interface.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
