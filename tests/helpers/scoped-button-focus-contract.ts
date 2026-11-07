// The reviewed Button :focus-visible rules in catalog/src/styles/*.css.
// Chromium snaps the authored 2.5px Ombelle outline to 2px at device scale 1.
export const scopedButtonFocusContract = {
  flat: { minimumWidth: 2, style: 'solid', offset: 2 },
  minimalist: { minimumWidth: 1, style: 'solid', offset: 4 },
  'neo-brutalism': { minimumWidth: 3, style: 'dashed', offset: 4 },
  ombelle: { minimumWidth: 2, style: 'solid', offset: 3 },
} as const

export function scopedButtonFocus(family: string) {
  const contract =
    scopedButtonFocusContract[family as keyof typeof scopedButtonFocusContract]
  if (!contract) throw Error('Unsupported scoped Button focus family ' + family)
  return contract
}
