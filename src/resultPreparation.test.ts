import { describe, expect, it } from 'vitest'
import { prepareResults } from './resultPreparation.js'
import type { BattleResult, ResultParticipant } from './resultPreparation.js'

function result(id: number, name: string, totalScore: number, overrides: Partial<BattleResult> = {}): BattleResult {
  return {
    id,
    name,
    version: '1.0',
    totalScore,
    survival: 0,
    lastSurvivorBonus: 0,
    bulletDamage: 0,
    bulletKillBonus: 0,
    ramDamage: 0,
    ramKillBonus: 0,
    firstPlaces: 0,
    secondPlaces: 0,
    thirdPlaces: 0,
    ...overrides
  }
}

describe('prepareResults', () => {
  it('sorts by score and assigns shared placements with stable tie ordering', () => {
    const prepared = prepareResults([
      result(5, 'Fourth', 50),
      result(4, 'Tied Bravo', 100),
      result(1, 'Winner', 120),
      result(2, 'Tied Alpha', 100)
    ], [])

    expect(prepared.map(entry => ({
      id: entry.id,
      name: entry.name,
      placement: entry.placement
    }))).toEqual([
      { id: 1, name: 'Winner', placement: 1 },
      { id: 2, name: 'Tied Alpha', placement: 2 },
      { id: 4, name: 'Tied Bravo', placement: 2 },
      { id: 5, name: 'Fourth', placement: 4 }
    ])
  })

  it('averages duplicate entries into one deterministic result', () => {
    const prepared = prepareResults([
      result(4, 'Clone', 80, { survival: 20, bulletDamage: 60, firstPlaces: 0 }),
      result(2, 'Clone', 120, { survival: 60, bulletDamage: 40, firstPlaces: 1 }),
      result(3, 'Other', 90)
    ], [])

    expect(prepared).toHaveLength(2)
    expect(prepared[0]).toMatchObject({
      id: 2,
      name: 'Clone',
      totalScore: 100,
      survival: 40,
      bulletDamage: 50,
      firstPlaces: 0.5,
      placement: 1
    })
  })

  it('collapses a self-battle to one rating participant', () => {
    const prepared = prepareResults([
      result(1, 'Self Bot', 120),
      result(2, 'Self Bot', 80)
    ], [])

    expect(prepared).toHaveLength(1)
    expect(prepared[0]).toMatchObject({
      name: 'Self Bot',
      totalScore: 100,
      placement: 1
    })
  })

  it('uses team ID and name together when IDs collide', () => {
    const participants: ResultParticipant[] = [
      { teamId: 3, teamName: 'Alpha Team' },
      {}
    ]
    const prepared = prepareResults([
      result(3, 'Alpha Team', 100),
      result(3, 'Solo', 90)
    ], participants)

    expect(prepared[0].isTeam).toBe(true)
    expect(prepared[1].isTeam).toBe(false)
  })
})
