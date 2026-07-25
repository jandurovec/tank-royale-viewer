// @vitest-environment node

import { Container, Graphics, Text } from 'pixi.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { reset, setParticipants } from '../gameState.js'
import type { BotState } from '../gameState.js'
import {
  createBotGraphics,
  getHealthPercent,
  removeStaleBotGraphics,
  updateBotGraphics
} from './tank.js'

function bot(overrides: Partial<BotState> = {}): BotState {
  return {
    id: 42,
    energy: 98.75,
    x: 120,
    y: 200,
    direction: 90,
    gunDirection: 180,
    radarDirection: 270,
    radarSweep: 10,
    speed: 0,
    ...overrides
  }
}

beforeEach(() => {
  reset()
})

describe('tank rendering', () => {
  it('positions and labels a bot without exposing its internal ID', () => {
    setParticipants([{ id: 42, name: 'Spin Bot', version: '1.0' }])
    const container = createBotGraphics()

    updateBotGraphics(container, bot(), 600)

    expect(container.x).toBe(120)
    expect(container.y).toBe(400)

    const body = container.getChildByLabel('bodyContainer') as Container
    const turret = container.getChildByLabel('turretContainer') as Container
    const radar = container.getChildByLabel('radar') as Graphics
    expect(body.rotation).toBeCloseTo(Math.PI / 2)
    expect(turret.rotation).toBeCloseTo(0)
    expect(radar.rotation).toBeCloseTo(-Math.PI / 2)

    const energy = container.getChildByLabel('energy') as Text
    const name = container.getChildByLabel('name') as Text
    expect(energy.text).toBe('98.8')
    expect(energy.y).toBeLessThan(0)
    expect(name.text).toBe('Spin Bot 1.0')
    expect(name.text).not.toContain('42')
    expect(name.y).toBeGreaterThan(0)
  })

  it('hides radar graphics and uses 120 maximum energy for droids', () => {
    setParticipants([{ id: 42, name: 'Droid', version: '1.0' }])
    const container = createBotGraphics()

    updateBotGraphics(container, bot({ energy: 60, isDroid: true }), 600)

    expect(container.getChildByLabel('radar')?.visible).toBe(false)
    expect(container.getChildByLabel('scanArc')?.visible).toBe(false)
    expect(getHealthPercent(60, true)).toBe(0.5)
    expect(getHealthPercent(60, false)).toBe(0.6)
  })

  it('clamps health percentage to the visible range', () => {
    expect(getHealthPercent(-5)).toBe(0)
    expect(getHealthPercent(50)).toBe(0.5)
    expect(getHealthPercent(150)).toBe(1)
  })

  it('removes bots missing from the latest complete tick', () => {
    const arena = new Container()
    const stale = createBotGraphics()
    const current = createBotGraphics()
    arena.addChild(stale, current)
    const graphics = new Map([
      [1, stale],
      [2, current]
    ])

    removeStaleBotGraphics(arena, graphics, new Set([2]))

    expect(stale.parent).toBeNull()
    expect(current.parent).toBe(arena)
    expect([...graphics.keys()]).toEqual([2])
  })
})
