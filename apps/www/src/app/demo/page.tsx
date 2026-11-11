import { DemoPage } from '../../demo/demo-page'

// Typed like the other pages, without importing Next's types: they make NODE_ENV required for the root typecheck.
export const metadata = { title: 'Demo', robots: { index: false } }

export default function Demo() {
  return <DemoPage />
}
