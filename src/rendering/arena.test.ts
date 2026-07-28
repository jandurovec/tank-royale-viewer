import { describe, expect, it, vi } from 'vitest'

const { pendingLoads } = vi.hoisted(() => ({
  pendingLoads: [] as Array<(texture: { width: number; height: number }) => void>
}))

vi.mock('pixi.js', () => {
  class MockContainer {
    children: Array<{ label?: string }> = []

    getChildByLabel(label: string): { label?: string } | undefined {
      return this.children.find((child) => child.label === label)
    }

    removeChild(child: { label?: string }): void {
      this.children.splice(this.children.indexOf(child), 1)
    }

    addChildAt(child: { label?: string }, index: number): void {
      this.children.splice(index, 0, child)
    }
  }

  class MockGraphics {
    label?: string

    rect(): this { return this }
    fill(): this { return this }
    stroke(): this { return this }
  }

  class MockSprite {
    label?: string
    x = 0
    y = 0
    alpha = 1
    anchor = { set: vi.fn() }
    scale = { set: vi.fn() }

    constructor(_texture: unknown) {}
  }

  return {
    Assets: {
      load: vi.fn(() => new Promise((resolve) => pendingLoads.push(resolve)))
    },
    Container: MockContainer,
    Graphics: MockGraphics,
    Sprite: MockSprite,
    Texture: class {}
  }
})

vi.mock('../logoStorage.js', () => ({
  getLogo: vi.fn(() => 'data:image/png;base64,test-logo'),
  onLogoChange: vi.fn()
}))

import { Container } from 'pixi.js'
import { drawArenaBackground } from './arena.js'

describe('arena logo rendering', () => {
  it('keeps one logo when multiple redraws finish loading concurrently', async () => {
    const arena = new Container()

    drawArenaBackground(arena, 800, 600, 1)
    drawArenaBackground(arena, 1200, 900, 1)

    await Promise.resolve()
    for (const resolve of pendingLoads) {
      resolve({ width: 400, height: 200 })
    }
    await Promise.resolve()
    await Promise.resolve()

    const logos = arena.children.filter((child) => child.label === 'arena-logo')
    expect(logos).toHaveLength(1)

    const logo = logos[0] as unknown as {
      x: number
      y: number
      scale: { set: ReturnType<typeof vi.fn> }
    }
    expect(logo.x).toBe(600)
    expect(logo.y).toBe(450)
    expect(logo.scale.set).toHaveBeenCalledWith(1.125)
  })
})
