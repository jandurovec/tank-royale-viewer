import { describe, expect, it } from 'vitest'
import {
  directionToScreenRadians,
  gameYToScreenY,
  tankDirectionToRotation
} from './transforms.js'

describe('rendering transforms', () => {
  it('converts the bottom-left game origin to the top-left screen origin', () => {
    expect(gameYToScreenY(0, 600)).toBe(600)
    expect(gameYToScreenY(250, 600)).toBe(350)
    expect(gameYToScreenY(600, 600)).toBe(0)
  })

  it('converts counter-clockwise game angles to clockwise screen radians', () => {
    expect(directionToScreenRadians(0)).toBeCloseTo(0)
    expect(directionToScreenRadians(90)).toBeCloseTo(-Math.PI / 2)
    expect(directionToScreenRadians(180)).toBeCloseTo(-Math.PI)
  })

  it('accounts for the tank artwork facing left', () => {
    expect(tankDirectionToRotation(0)).toBeCloseTo(Math.PI)
    expect(tankDirectionToRotation(90)).toBeCloseTo(Math.PI / 2)
    expect(tankDirectionToRotation(180)).toBeCloseTo(0)
    expect(tankDirectionToRotation(270)).toBeCloseTo(-Math.PI / 2)
  })
})
