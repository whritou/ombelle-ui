import { isStyleFamily, type StyleFamily } from '../../../packages/contracts/src/style-families.js'
export function selectFamily(pathname: string): StyleFamily | null {
  if (pathname === '/') return 'neo-brutalism'
  const match = /^\/([^/]+)\/?$/.exec(pathname)
  return match && isStyleFamily(match[1]) ? match[1] : null
}
