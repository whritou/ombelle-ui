import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Ombelle',
  description: 'Ombelle component editor',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
