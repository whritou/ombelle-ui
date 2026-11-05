/**
 * One failing-pair line of the editor's glass contrast readout, in the order
 * glass-panel.tsx renders it: mode, text on surface, an optional tint
 * (" + primary 22%"), an optional coverage (" at 55% coverage"), then the worst ratio.
 */
export const glassFailingPairLine =
  /^(light|dark): \S+ on \S+( \+ \S+ \d+%)?( at \d+% coverage)?, \d+\.\d{2}:1 (over the (darkest|brightest) filtered backdrop|on the opaque fallback surface)$/
