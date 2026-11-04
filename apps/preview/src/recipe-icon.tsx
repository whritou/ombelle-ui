import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Download, ExternalLink, Plus, Search, Send, Settings, Trash, Upload,
  type LucideIcon,
} from 'lucide-react'
import type { RecipeIconName } from '@ombelle/contracts'

/** The same lucide-react exports `recipeIcons` names, which installed recipe Buttons import. */
export const recipeIconComponents: Record<RecipeIconName, LucideIcon> = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  check: Check,
  'chevron-right': ChevronRight,
  download: Download,
  'external-link': ExternalLink,
  plus: Plus,
  search: Search,
  send: Send,
  settings: Settings,
  trash: Trash,
  upload: Upload,
}

export function RecipeIcon({ name, slot }: { name: RecipeIconName; slot?: string }) {
  const Icon = recipeIconComponents[name]
  return <Icon aria-hidden="true" focusable="false" data-slot={slot} />
}
