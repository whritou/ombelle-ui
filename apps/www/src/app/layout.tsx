import type { ReactNode } from 'react'
import { Archivo, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { SiteFooter } from '../site/footer'
import { SiteHeader } from '../site/header'
import { themeInitScript } from '../site/theme'
import { familyList } from '../site/families'
import './globals.css'

// next/font downloads these at build time and serves them from this origin,
// so pages make no requests to Google.
const archivo = Archivo({ subsets: ['latin'], weight: ['500', '700', '800', '900'], variable: '--font-archivo' })
const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' })

export const metadata = {
  title: 'Ombelle UI',
  description:
    `Editable, accessible React components on shadcn and Radix UI, in ${familyList()} styles.`,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${hanken.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        {/* Skip-link target; each page renders its own main landmark inside. */}
        <div id="main" className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
