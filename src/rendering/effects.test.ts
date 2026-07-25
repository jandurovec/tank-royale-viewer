import type { Graphics } from 'pixi.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addBotDeathExplosion,
  addBulletHitBotEffect,
  clearEffects,
  renderEffects,
  setCurrentTurn
} from './effects.js'

function createGraphics(): { graphics: Graphics; circle: ReturnType<typeof vi.fn> } {
  const circle = vi.fn()
  return {
    graphics: {
      clear: vi.fn(),
      circle,
      fill: vi.fn()
    } as unknown as Graphics,
    circle
  }
}

beforeEach(() => {
  clearEffects()
  setCurrentTurn(0)
})

describe('turn-based effects', () => {
  it('renders a bullet hit for 25 turns', () => {
    const { graphics, circle } = createGraphics()
    setCurrentTurn(10)
    addBulletHitBotEffect(100, 200)

    setCurrentTurn(34)
    renderEffects(graphics, 600)
    expect(circle).toHaveBeenCalledOnce()

    circle.mockClear()
    setCurrentTurn(35)
    renderEffects(graphics, 600)
    expect(circle).not.toHaveBeenCalled()
  })

  it('renders 15 death bursts for 50 turns', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { graphics, circle } = createGraphics()
    setCurrentTurn(10)
    addBotDeathExplosion(100, 200)

    setCurrentTurn(59)
    renderEffects(graphics, 600)
    expect(circle).toHaveBeenCalledTimes(15)

    circle.mockClear()
    setCurrentTurn(60)
    renderEffects(graphics, 600)
    expect(circle).not.toHaveBeenCalled()
  })

  it('may finish before being drawn when turns advance faster than frames', () => {
    const { graphics, circle } = createGraphics()
    setCurrentTurn(10)
    addBulletHitBotEffect(100, 200)

    setCurrentTurn(35)
    renderEffects(graphics, 600)
    expect(circle).not.toHaveBeenCalled()
  })

  it('continues an effect when the turn number resets for a new round', () => {
    const { graphics, circle } = createGraphics()
    setCurrentTurn(1482)
    addBulletHitBotEffect(100, 200)

    setCurrentTurn(1)
    renderEffects(graphics, 600)
    expect(circle).toHaveBeenCalledOnce()

    circle.mockClear()
    setCurrentTurn(25)
    renderEffects(graphics, 600)
    expect(circle).not.toHaveBeenCalled()
  })

  it('removes effects when the battle lifecycle is cleared', () => {
    const { graphics, circle } = createGraphics()
    setCurrentTurn(1482)
    addBulletHitBotEffect(100, 200)

    clearEffects()
    setCurrentTurn(1)
    renderEffects(graphics, 600)
    expect(circle).not.toHaveBeenCalled()
  })
})
