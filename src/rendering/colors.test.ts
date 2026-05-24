import { describe, it, expect } from 'vitest'
import {
  parseColor,
  lerpColor,
  rgbToHsl,
  hslToRgb,
  addLight,
  multLight,
  getLightness,
  borderColor,
  DEFAULT_BODY_COLOR,
} from './colors'

describe('parseColor', () => {
  it('returns the default when no color is provided', () => {
    expect(parseColor(undefined)).toBe(parseInt(DEFAULT_BODY_COLOR.slice(1), 16))
  })

  it('parses #RRGGBB hex strings', () => {
    expect(parseColor('#ff0000')).toBe(0xff0000)
    expect(parseColor('#00ff00')).toBe(0x00ff00)
    expect(parseColor('#0000ff')).toBe(0x0000ff)
  })

  it('falls back to mid gray for unrecognized formats', () => {
    expect(parseColor('not-a-color')).toBe(0x888888)
  })
})

describe('lerpColor', () => {
  it('returns the start color at t=0', () => {
    expect(lerpColor(0xff0000, 0x00ff00, 0)).toBe(0xff0000)
  })

  it('returns the end color at t=1', () => {
    expect(lerpColor(0xff0000, 0x00ff00, 1)).toBe(0x00ff00)
  })

  it('interpolates the midpoint correctly', () => {
    // (255,0,0) -> (0,255,0) midpoint = (128, 128, 0) after Math.round
    expect(lerpColor(0xff0000, 0x00ff00, 0.5)).toBe((128 << 16) | (128 << 8) | 0)
  })
})

describe('rgbToHsl / hslToRgb round-trip', () => {
  const samples = [0xff0000, 0x00ff00, 0x0000ff, 0x123456, 0xabcdef, 0x808080, 0x000000, 0xffffff]

  it.each(samples)('round-trips 0x%s within ±1 per channel', (rgb) => {
    const back = hslToRgb(rgbToHsl(rgb))
    const r1 = (rgb >> 16) & 0xff
    const g1 = (rgb >> 8) & 0xff
    const b1 = rgb & 0xff
    const r2 = (back >> 16) & 0xff
    const g2 = (back >> 8) & 0xff
    const b2 = back & 0xff
    expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(1)
    expect(Math.abs(g1 - g2)).toBeLessThanOrEqual(1)
    expect(Math.abs(b1 - b2)).toBeLessThanOrEqual(1)
  })
})

describe('addLight / multLight', () => {
  it('addLight clamps lightness within [0, 1]', () => {
    expect(getLightness(addLight(0xffffff, 0.5))).toBeLessThanOrEqual(1)
    expect(getLightness(addLight(0x000000, -0.5))).toBeGreaterThanOrEqual(0)
  })

  it('addLight increases lightness for positive deltas', () => {
    const base = getLightness(0x336699)
    expect(getLightness(addLight(0x336699, 0.2))).toBeGreaterThan(base)
  })

  it('multLight halves lightness with factor 0.5', () => {
    const base = getLightness(0x808080)
    expect(getLightness(multLight(0x808080, 0.5))).toBeCloseTo(base * 0.5, 2)
  })
})

describe('borderColor', () => {
  it('returns dark gray for very dark colors', () => {
    expect(borderColor(0x000000)).toBe(0x404040)
    expect(borderColor(0x080808)).toBe(0x404040)
  })

  it('returns black for lighter colors', () => {
    expect(borderColor(0xffffff)).toBe(0x000000)
    expect(borderColor(0x808080)).toBe(0x000000)
  })
})
