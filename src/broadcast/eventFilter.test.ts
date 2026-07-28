import { describe, expect, it } from 'vitest'
import { filterBattleEvents, isBattleEventEnabled } from './eventFilter.js'
import type { BattleBroadcastEvent } from './events.js'

const participant = { id: 1, isTeam: false, name: 'A' }
const events: readonly BattleBroadcastEvent[] = [
  { type: 'round-winner', roundNumber: 1, winners: [participant] },
  { type: 'aggregate-lead', leaders: [participant] },
  { type: 'elimination', victim: participant },
  { type: 'bullet-hit', attacker: participant, victim: participant, damage: 4 },
  { type: 'ramming', rammer: participant, victim: participant }
]

const defaults = {
  showBattleEventFeed: true,
  showRoundWinnerEvents: true,
  showAggregateLeadEvents: true,
  showEliminationEvents: true,
  showBulletHitEvents: false,
  showRammingEvents: false
}

describe('battle feed event filtering', () => {
  it('maps each category to its own setting', () => {
    expect(filterBattleEvents(events, defaults).map(event => event.type)).toEqual([
      'round-winner', 'aggregate-lead', 'elimination'
    ])
    expect(isBattleEventEnabled(events[3], { ...defaults, showBulletHitEvents: true })).toBe(true)
    expect(isBattleEventEnabled(events[4], { ...defaults, showRammingEvents: true })).toBe(true)
  })

  it('suppresses every category when the feed is disabled', () => {
    expect(filterBattleEvents(events, { ...defaults, showBattleEventFeed: false })).toEqual([])
  })
})
