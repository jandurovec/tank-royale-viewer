// Default colors from original Tank Royale GUI (ColorConstant.kt)
export const DEFAULT_BODY_COLOR = '#001199'
export const DEFAULT_TURRET_COLOR = '#0066CC'
export const DEFAULT_RADAR_COLOR = '#AAAAFF'
export const DEFAULT_BULLET_COLOR = '#FFFFFF'
export const DEFAULT_SCAN_COLOR = '#FFFFFF'
export const DEFAULT_TRACKS_COLOR = '#888888'
export const DEFAULT_GUN_COLOR = '#888888'

// Color gradient for explosions (from original CircleBurst.kt)
export const BURST_COLORS = [
  0xd3d3d3, // light gray
  0xffffff, // white
  0xffff00, // yellow
  0xffa500, // orange
  0x7f3300, // brown
  0x787878, // gray
  0x646464,
  0x505050,
  0x464646,
  0x3c3c3c,
  0x323232,
  0x282828,
  0x1e1e1e,
  0x141414,
  0x0a0a0a,
  0x000000, // black
]

/** Convert "#RRGGBB" hex string to 0xRRGGBB number */
export function parseColor(hex?: string, defaultColor = DEFAULT_BODY_COLOR): number {
  const color = hex || defaultColor
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16)
  }
  return 0x888888
}

/** Linear interpolation between two colors */
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff

  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)

  return (r << 16) | (g << 8) | bl
}
