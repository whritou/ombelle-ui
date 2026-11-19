import type { ReactNode } from 'react'
import {
  Bricolage_Grotesque, DM_Mono, DM_Sans, Exo_2, Figtree, Fraunces, Geist, IBM_Plex_Mono, Instrument_Sans, Inter, Inter_Tight,
  Michroma, Nunito, Space_Grotesk, Space_Mono, Work_Sans, Young_Serif,
} from 'next/font/google'

// The landing page wears every style family, each with its own fonts. next/font
// serves them from this origin, and without preloading a font is fetched only
// when a family that uses it is on screen. Each loader must be its own
// module-scope const with literal options.
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], preload: false, weight: ['700', '800'], variable: '--font-bricolage' })
const figtree = Figtree({ subsets: ['latin'], preload: false, weight: ['400', '600', '700'], variable: '--font-figtree' })
const geist = Geist({ subsets: ['latin'], preload: false, weight: ['400', '500', '600'], variable: '--font-geist' })
const workSans = Work_Sans({ subsets: ['latin'], preload: false, weight: ['400', '600', '800'], variable: '--font-work-sans' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], preload: false, weight: ['700'], variable: '--font-space-grotesk' })
const spaceMono = Space_Mono({ subsets: ['latin'], preload: false, weight: ['400', '700'], variable: '--font-space-mono' })
const dmSans = DM_Sans({ subsets: ['latin'], preload: false, weight: ['400', '600', '700'], variable: '--font-dm-sans' })
const fraunces = Fraunces({ subsets: ['latin'], preload: false, weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-fraunces' })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], preload: false, weight: ['400', '600'], variable: '--font-instrument-sans' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], preload: false, weight: ['400', '500'], variable: '--font-plex-mono' })
const youngSerif = Young_Serif({ subsets: ['latin'], preload: false, weight: ['400'], variable: '--font-young-serif' })
const nunito = Nunito({ subsets: ['latin'], preload: false, weight: ['500', '700'], variable: '--font-nunito' })
const dmMono = DM_Mono({ subsets: ['latin'], preload: false, weight: ['400', '500'], variable: '--font-dm-mono' })
const michroma = Michroma({ subsets: ['latin'], preload: false, weight: ['400'], variable: '--font-michroma' })
const exo = Exo_2({ subsets: ['latin'], preload: false, weight: ['500', '700'], variable: '--font-exo' })
const inter = Inter({ subsets: ['latin'], preload: false, weight: ['400', '600'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], preload: false, weight: ['700'], variable: '--font-inter-tight' })

const fonts = [bricolage, figtree, geist, workSans, spaceGrotesk, spaceMono, dmSans, fraunces, instrumentSans, plexMono, youngSerif, nunito, dmMono, michroma, exo, inter, interTight]

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <div className={fonts.map((font) => font.variable).join(' ')}>{children}</div>
}
