import { describe, expect, it } from 'vitest'
import { reduceTickBroadcastEvents, type BroadcastTickEvent } from './tickEventReducer.js'

const PARTICIPANTS = new Map([
  [1, { id: 1, name: 'FireBot' }],
  [2, { id: 2, name: 'CrazyBot' }],
  [3, { id: 3, name: 'CrazyBot' }]
])

function reduce(events: readonly BroadcastTickEvent[]): readonly unknown[] {
  return reduceTickBroadcastEvents(events, PARTICIPANTS)
}

describe('reduceTickBroadcastEvents', () => {
  it('emits every non-lethal bullet hit, including low damage hits', () => {
    expect(reduce([{ type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 1 }, damage: 0.4, energy: 99.6 }])).toEqual([
      { type: 'bullet-hit', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' }, damage: 0.4 }
    ])
  })

  it('uses IDs for participant resolution and never guesses unresolved non-lethal participants', () => {
    expect(reduce([
      { type: 'BulletHitBotEvent', victimId: 3, bullet: { ownerId: 1 }, damage: 4, energy: 10 },
      { type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 99 }, damage: 4, energy: 10 },
      { type: 'BulletHitBotEvent', victimId: 99, bullet: { ownerId: 1 }, damage: 4, energy: 10 }
    ])).toEqual([
      { type: 'bullet-hit', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 3, isTeam: false, name: 'CrazyBot' }, damage: 4 }
    ])
  })

  it('turns zero and negative bullet energy into attributed eliminations without hit cards', () => {
    expect(reduce([
      { type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 1 }, damage: 10, energy: 0 },
      { type: 'BulletHitBotEvent', victimId: 3, bullet: { ownerId: 1 }, damage: 10, energy: -1 }
    ])).toEqual([
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } },
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 3, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('uses victim-only wording data when a lethal attacker is unknown', () => {
    expect(reduce([{ type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 99 }, damage: 10, energy: 0 }])).toEqual([
      { type: 'elimination', victim: { id: 2, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('attributes lethal bot collisions and only reports confirmed non-lethal ramming', () => {
    expect(reduce([
      { type: 'BotHitBotEvent', botId: 1, victimId: 2, energy: 4, rammed: true },
      { type: 'BotHitBotEvent', botId: 2, victimId: 1, energy: 4, rammed: false },
      { type: 'BotHitBotEvent', botId: 99, victimId: 2, energy: 4, rammed: true },
      { type: 'BotHitBotEvent', botId: 1, victimId: 3, energy: 0 }
    ])).toEqual([
      { type: 'ramming', rammer: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } },
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 3, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('suppresses ramming when collision energy is missing', () => {
    expect(reduce([{ type: 'BotHitBotEvent', botId: 1, victimId: 2, rammed: true }])).toEqual([])
  })

  it('never emits ramming alongside a lethal collision or its fallback death', () => {
    expect(reduce([
      { type: 'BotHitBotEvent', botId: 1, victimId: 2, energy: 0, rammed: true },
      { type: 'BotDeathEvent', victimId: 2 }
    ])).toEqual([
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('uses BotDeath as a victim-only fallback and suppresses it after a lethal event', () => {
    expect(reduce([
      { type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 1 }, damage: 10, energy: -1 },
      { type: 'BotDeathEvent', victimId: 2 },
      { type: 'BotDeathEvent', victimId: 3 }
    ])).toEqual([
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } },
      { type: 'elimination', victim: { id: 3, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('suppresses a BotDeath fallback before a later lethal bullet hit', () => {
    expect(reduce([
      { type: 'BotDeathEvent', victimId: 2 },
      { type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 1 }, damage: 10, energy: 0 }
    ])).toEqual([
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('suppresses a BotDeath fallback before a later lethal bot collision', () => {
    expect(reduce([
      { type: 'BotDeathEvent', victimId: 2 },
      { type: 'BotHitBotEvent', botId: 1, victimId: 2, energy: 0 }
    ])).toEqual([
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('keeps unrelated fallback deaths in their protocol position', () => {
    expect(reduce([
      { type: 'BotDeathEvent', victimId: 3 },
      { type: 'BotDeathEvent', victimId: 2 },
      { type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 1 }, damage: 10, energy: 0 }
    ])).toEqual([
      { type: 'elimination', victim: { id: 3, isTeam: false, name: 'CrazyBot' } },
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } }
    ])
  })

  it('uses the first lethal event per victim while preserving distinct-victim event chronology', () => {
    expect(reduce([
      { type: 'BotHitBotEvent', botId: 1, victimId: 3, energy: 0 },
      { type: 'BulletHitBotEvent', victimId: 2, bullet: { ownerId: 1 }, damage: 10, energy: -1 },
      { type: 'BulletHitBotEvent', victimId: 3, bullet: { ownerId: 2 }, damage: 10, energy: -1 }
    ])).toEqual([
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 3, isTeam: false, name: 'CrazyBot' } },
      { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'FireBot' }, victim: { id: 2, isTeam: false, name: 'CrazyBot' } }
    ])
  })
})
