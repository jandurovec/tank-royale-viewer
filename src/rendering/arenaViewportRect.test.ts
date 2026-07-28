import { describe, expect, it } from 'vitest'
import { getArenaViewportRect } from './arenaViewportRect.js'

describe('arena viewport rectangle', () => {
  it('maps the Pixi arena transform through the canvas DOM rectangle', () => {
    expect(getArenaViewportRect(
      { left: 10, top: 20, width: 1000, height: 500 },
      2000, 1000, 400, 100, 0.5, 1600, 800
    )).toEqual({ left: 210, top: 70, right: 610, bottom: 270, width: 400, height: 200 })
  })

  it('returns null until all geometry is valid', () => {
    expect(getArenaViewportRect(
      { left: 0, top: 0, width: 0, height: 100 }, 100, 100, 0, 0, 1, 10, 10
    )).toBeNull()
  })
})
