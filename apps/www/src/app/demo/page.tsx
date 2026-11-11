import type { Metadata } from 'next'
import { DemoPage } from '../../demo/demo-page'

export const metadata: Metadata = { title: 'Demo', robots: { index: false } }

export default function Demo() {
  return <DemoPage />
}
