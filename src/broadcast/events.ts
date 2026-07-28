export type BattleBroadcastEvent = RoundWinnerEvent | AggregateLeadEvent | BulletHitEvent | RammingEvent | EliminationEvent

export interface RoundWinnerEvent {
  readonly type: 'round-winner'
  readonly roundNumber: number
  readonly winners: readonly BroadcastParticipant[]
}

export interface AggregateLeadEvent {
  readonly type: 'aggregate-lead'
  readonly leaders: readonly BroadcastParticipant[]
}

export interface BulletHitEvent {
  readonly type: 'bullet-hit'
  readonly attacker: BroadcastParticipant
  readonly victim: BroadcastParticipant
  readonly damage: number
}

export interface RammingEvent {
  readonly type: 'ramming'
  readonly rammer: BroadcastParticipant
  readonly victim: BroadcastParticipant
}

export interface EliminationEvent {
  readonly type: 'elimination'
  readonly victim: BroadcastParticipant
  readonly attacker?: BroadcastParticipant
}

export interface BroadcastParticipant {
  readonly id: number
  readonly isTeam: boolean
  readonly name: string
}
