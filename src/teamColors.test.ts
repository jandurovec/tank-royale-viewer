import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTeamColor,
  getTeamColorNumeric,
  purgeInactiveTeams,
  resetAllocations,
} from './teamColors'

describe('teamColors', () => {
  beforeEach(() => {
    resetAllocations()
  })

  it('returns the same color for the same teamId', () => {
    const a = getTeamColor(1)
    const b = getTeamColor(1)
    expect(a).toBe(b)
  })

  it('assigns different colors to different teams from the predefined pool', () => {
    const c1 = getTeamColor(1)
    const c2 = getTeamColor(2)
    expect(c1).not.toBe(c2)
    expect(c1).toMatch(/^#[0-9a-f]{6}$/i)
    expect(c2).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('falls back to a generated hex color when the pool is exhausted', () => {
    // 19 predefined colors; allocate all of them and one more.
    for (let i = 1; i <= 19; i++) getTeamColor(i)
    const fallback = getTeamColor(20)
    expect(fallback).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('getTeamColorNumeric matches getTeamColor as parsed hex', () => {
    const teamId = 7
    const hex = getTeamColor(teamId)
    const num = getTeamColorNumeric(teamId)
    expect(num).toBe(parseInt(hex.slice(1), 16))
  })

  it('purgeInactiveTeams releases predefined colors back to the pool', () => {
    // Drain the predefined pool of 19 colors.
    for (let i = 1; i <= 19; i++) getTeamColor(i)
    const c1 = getTeamColor(1)

    // Purge team 1 only; its predefined color returns to the (otherwise empty) pool.
    const stillActive = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    purgeInactiveTeams(stillActive)

    // Next allocation should reuse the single freed color.
    expect(getTeamColor(100)).toBe(c1)
  })

  it('purgeInactiveTeams does not push generated fallback colors back into the pool', () => {
    for (let i = 1; i <= 19; i++) getTeamColor(i)
    const fallback = getTeamColor(20)
    expect(fallback).toMatch(/^#[0-9a-f]{6}$/i)

    // Purge everything
    purgeInactiveTeams([])

    // Reallocate 19 ids; none of them should equal the random fallback that was purged.
    const reallocated = new Set<string>()
    for (let i = 100; i < 119; i++) reallocated.add(getTeamColor(i))
    expect(reallocated.has(fallback)).toBe(false)
  })

  it('resetAllocations restores a fresh pool', () => {
    const first = getTeamColor(1)
    resetAllocations()
    const afterReset = getTeamColor(99)
    expect(afterReset).toBe(first)
  })
})
