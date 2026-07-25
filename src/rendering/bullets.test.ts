// @vitest-environment node

import { Graphics } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { getBulletRadius, renderBullets } from './bullets.js'

describe('bullet rendering', () => {
  it('scales bullet radius with power', () => {
    expect(getBulletRadius(0)).toBe(0)
    expect(getBulletRadius(1)).toBeCloseTo(Math.sqrt(2.5))
    expect(getBulletRadius(3)).toBeCloseTo(Math.sqrt(7.5))
    expect(getBulletRadius(3)).toBeGreaterThan(getBulletRadius(1))
  })

  it('draws a bullet at its transformed arena position', () => {
    const graphics = new Graphics()
    const radius = getBulletRadius(2)

    renderBullets(graphics, [{ x: 100, y: 150, power: 2 }], 600)

    const bounds = graphics.getLocalBounds()
    expect(bounds.x).toBeCloseTo(100 - radius)
    expect(bounds.y).toBeCloseTo(450 - radius)
    expect(bounds.width).toBeCloseTo(radius * 2)
    expect(bounds.height).toBeCloseTo(radius * 2)
  })
})
