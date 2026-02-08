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

// HSL color manipulation (from original Tank Royale GUI)
export interface HslColor {
  h: number // 0-1
  s: number // 0-1
  l: number // 0-1
}

/** Convert RGB (0xRRGGBB) to HSL */
export function rgbToHsl(rgb: number): HslColor {
  const r = ((rgb >> 16) & 0xff) / 255
  const g = ((rgb >> 8) & 0xff) / 255
  const b = (rgb & 0xff) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l }
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    case b:
      h = ((r - g) / d + 4) / 6
      break
  }

  return { h, s, l }
}

/** Convert HSL to RGB (0xRRGGBB) */
export function hslToRgb(hsl: HslColor): number {
  const { h, s, l } = hsl

  if (s === 0) {
    const v = Math.round(l * 255)
    return (v << 16) | (v << 8) | v
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  const hueToRgb = (t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const r = Math.round(hueToRgb(h + 1 / 3) * 255)
  const g = Math.round(hueToRgb(h) * 255)
  const b = Math.round(hueToRgb(h - 1 / 3) * 255)

  return (r << 16) | (g << 8) | b
}

/** Add to lightness (clamped 0-1) */
export function addLight(rgb: number, value: number): number {
  const hsl = rgbToHsl(rgb)
  hsl.l = Math.max(0, Math.min(1, hsl.l + value))
  return hslToRgb(hsl)
}

/** Multiply lightness */
export function multLight(rgb: number, factor: number): number {
  const hsl = rgbToHsl(rgb)
  hsl.l *= factor
  return hslToRgb(hsl)
}

/** Get lightness of a color (0-1) */
export function getLightness(rgb: number): number {
  return rgbToHsl(rgb).l
}

/** Get border color - dark gray for very dark colors, black otherwise */
export function borderColor(rgb: number): number {
  return getLightness(rgb) < 0.15 ? 0x404040 : 0x000000
}
