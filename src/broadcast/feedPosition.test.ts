import { describe, expect, it } from 'vitest'
import { getFeedPosition } from './feedPosition.js'

const MINIMUM_WIDTH = 230
const ARENA_800_BY_600 = { left: 100, top: 50, right: 900, bottom: 650, width: 800, height: 600 }

function arenaForAvailableWidth(availableWidth: number): typeof ARENA_800_BY_600 {
  const viewportWidth = 1400
  const right = viewportWidth - 16 - 12 - availableWidth
  return { ...ARENA_800_BY_600, right }
}

describe('battle event feed position', () => {
  it.each([231, 230, 229, 200])('keeps the right edge safe with %ipx available beside the arena', availableWidth => {
    const viewport = { width: 1400, height: 800 }
    const position = getFeedPosition(arenaForAvailableWidth(availableWidth), viewport, MINIMUM_WIDTH)

    expect(position.width).toBe(Math.max(MINIMUM_WIDTH, availableWidth))
    expect(position.left + position.width).toBe(viewport.width - 16)
    expect(position.bottom).toBe(150)
  })

  it('expands from the arena gutter through the viewport safe edge on an ultrawide viewport', () => {
    const arena = { left: 1300, top: 40, right: 2300, bottom: 1040, width: 1000, height: 1000 }
    expect(getFeedPosition(arena, { width: 3000, height: 1080 }, MINIMUM_WIDTH)).toEqual({
      left: 2312, bottom: 40, width: 672
    })
  })

  it('overlaps the arena only by the shortfall below the minimum width', () => {
    const viewport = { width: 1200, height: 800 }
    const arena = { ...ARENA_800_BY_600, right: 972 }
    const position = getFeedPosition(arena, viewport, MINIMUM_WIDTH)

    expect(position).toEqual({ left: 954, bottom: 150, width: 230 })
    expect(arena.right + 12 - position.left).toBe(30)
  })

  it('contracts to the viewport safe area when it cannot fit the minimum width', () => {
    expect(getFeedPosition(ARENA_800_BY_600, { width: 200, height: 700 }, MINIMUM_WIDTH)).toEqual({
      left: 16, bottom: 50, width: 168
    })
  })

  it('uses a compact right-aligned lane while arena geometry is unavailable', () => {
    expect(getFeedPosition(null, { width: 300, height: 700 }, MINIMUM_WIDTH)).toEqual({
      left: 54, bottom: 16, width: 230
    })
  })

  it('updates width and position for a different arena shape after resizing', () => {
    const position = getFeedPosition(
      { left: 50, top: 20, right: 700, bottom: 780, width: 650, height: 760 },
      { width: 1200, height: 800 },
      MINIMUM_WIDTH
    )

    expect(position).toEqual({ left: 712, bottom: 20, width: 472 })
  })

  it('preserves the bottom safe margin when an arena reaches the viewport edge', () => {
    const arena = { left: 16, top: 0, right: 816, bottom: 790, width: 800, height: 790 }
    expect(getFeedPosition(arena, { width: 1200, height: 800 }, MINIMUM_WIDTH)).toMatchObject({
      left: 828, bottom: 16, width: 356
    })
  })
})
