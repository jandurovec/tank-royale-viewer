import type { BattleBroadcastEvent, BroadcastParticipant, BulletHitEvent, EliminationEvent, RammingEvent } from './events.js'

export interface BroadcastTickParticipant {
  readonly id: number
  readonly name: string
}

export interface BroadcastTickEvent {
  readonly type: string
  readonly victimId?: number
  readonly botId?: number
  readonly bullet?: { readonly ownerId: number }
  readonly damage?: number
  readonly energy?: number
  readonly rammed?: boolean
}

function toParticipant(participants: ReadonlyMap<number, BroadcastTickParticipant>, id: number | undefined): BroadcastParticipant | undefined {
  if (id === undefined) return undefined
  const participant = participants.get(id)
  return participant === undefined ? undefined : { id: participant.id, isTeam: false, name: participant.name }
}

function createElimination(
  participants: ReadonlyMap<number, BroadcastTickParticipant>,
  victimId: number,
  attackerId?: number
): EliminationEvent | undefined {
  const victim = toParticipant(participants, victimId)
  if (victim === undefined) return undefined
  const attacker = toParticipant(participants, attackerId)
  return attacker === undefined ? { type: 'elimination', victim } : { type: 'elimination', attacker, victim }
}

function isLethalHit(event: BroadcastTickEvent): boolean {
  return (event.type === 'BulletHitBotEvent' || event.type === 'BotHitBotEvent') && event.victimId !== undefined && event.energy !== undefined && event.energy <= 0
}

export function reduceTickBroadcastEvents(
  events: readonly BroadcastTickEvent[],
  participants: ReadonlyMap<number, BroadcastTickParticipant>
): readonly BattleBroadcastEvent[] {
  const broadcastEvents: BattleBroadcastEvent[] = []
  const lethalVictims = new Set(events.filter(isLethalHit).map(event => event.victimId))
  const lethallyHitVictims = new Set<number>()

  for (const event of events) {
    if (event.type === 'BulletHitBotEvent' && event.victimId !== undefined && event.energy !== undefined) {
      if (event.energy <= 0) {
        if (!lethallyHitVictims.has(event.victimId)) {
          lethallyHitVictims.add(event.victimId)
          const elimination = createElimination(participants, event.victimId, event.bullet?.ownerId)
          if (elimination !== undefined) broadcastEvents.push(elimination)
        }
        continue
      }
      const attacker = toParticipant(participants, event.bullet?.ownerId)
      const victim = toParticipant(participants, event.victimId)
      if (attacker !== undefined && victim !== undefined && event.damage !== undefined) {
        broadcastEvents.push({ type: 'bullet-hit', attacker, victim, damage: event.damage } satisfies BulletHitEvent)
      }
      continue
    }

    if (event.type === 'BotHitBotEvent') {
      if (event.victimId !== undefined && event.botId !== undefined && event.energy !== undefined && event.energy <= 0) {
        if (!lethallyHitVictims.has(event.victimId)) {
          lethallyHitVictims.add(event.victimId)
          const elimination = createElimination(participants, event.victimId, event.botId)
          if (elimination !== undefined) broadcastEvents.push(elimination)
        }
        continue
      }
      const rammer = toParticipant(participants, event.botId)
      const victim = toParticipant(participants, event.victimId)
      if (event.rammed === true && event.energy !== undefined && event.energy > 0 && rammer !== undefined && victim !== undefined) {
        broadcastEvents.push({ type: 'ramming', rammer, victim } satisfies RammingEvent)
      }
      continue
    }

    if (event.type === 'BotDeathEvent' && event.victimId !== undefined && !lethalVictims.has(event.victimId) && !lethallyHitVictims.has(event.victimId)) {
      const elimination = createElimination(participants, event.victimId)
      if (elimination !== undefined) broadcastEvents.push(elimination)
    }
  }
  return broadcastEvents
}
