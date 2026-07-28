import type { BattleBroadcastEvent } from './events.js'

export interface BattleFeedEventSettings {
  readonly showBattleEventFeed: boolean
  readonly showRoundWinnerEvents: boolean
  readonly showAggregateLeadEvents: boolean
  readonly showEliminationEvents: boolean
  readonly showBulletHitEvents: boolean
  readonly showRammingEvents: boolean
}

export function isBattleEventEnabled(event: BattleBroadcastEvent, settings: BattleFeedEventSettings): boolean {
  if (!settings.showBattleEventFeed) return false
  switch (event.type) {
    case 'round-winner': return settings.showRoundWinnerEvents
    case 'aggregate-lead': return settings.showAggregateLeadEvents
    case 'elimination': return settings.showEliminationEvents
    case 'bullet-hit': return settings.showBulletHitEvents
    case 'ramming': return settings.showRammingEvents
  }
}

export function filterBattleEvents(
  events: readonly BattleBroadcastEvent[],
  settings: BattleFeedEventSettings
): readonly BattleBroadcastEvent[] {
  return events.filter(event => isBattleEventEnabled(event, settings))
}
