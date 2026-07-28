import type { AggregateLeadEvent, BattleBroadcastEvent, BroadcastParticipant, RoundWinnerEvent } from './events.js'

export interface RoundResult {
  readonly id: number
  readonly isTeam?: boolean
  readonly name: string
  readonly firstPlaces: number
  readonly totalScore: number
}

function getKey(result: Pick<RoundResult, 'id' | 'isTeam'>): string {
  return `${result.isTeam === true ? 'team' : 'bot'}:${result.id}`
}

function compareParticipants(a: BroadcastParticipant, b: BroadcastParticipant): number {
  return a.name.localeCompare(b.name) || Number(a.isTeam) - Number(b.isTeam) || a.id - b.id
}

function toParticipant(result: RoundResult): BroadcastParticipant {
  return { id: result.id, isTeam: result.isTeam === true, name: result.name }
}

export class RoundTracker {
  private firstPlaces = new Map<string, number>()
  private leaders: Set<string> | null = null

  public process(roundNumber: number, results: readonly RoundResult[]): readonly BattleBroadcastEvent[] {
    const winners = results.filter(result => result.firstPlaces > (this.firstPlaces.get(getKey(result)) ?? 0)).map(toParticipant).sort(compareParticipants)
    this.firstPlaces = new Map(results.map(result => [getKey(result), result.firstPlaces]))
    const events: BattleBroadcastEvent[] = []
    if (winners.length > 0) events.push({ type: 'round-winner', roundNumber, winners } satisfies RoundWinnerEvent)

    const currentLeaders = this.getLeaders(results)
    const currentLeaderKeys = new Set(currentLeaders.map(participant => getKey(participant)))
    if (this.leaders !== null && [...currentLeaderKeys].some(key => !this.leaders!.has(key))) {
      events.push({ type: 'aggregate-lead', leaders: currentLeaders } satisfies AggregateLeadEvent)
    }
    this.leaders = currentLeaderKeys
    return events
  }

  public clear(): void {
    this.firstPlaces.clear()
    this.leaders = null
  }

  private getLeaders(results: readonly RoundResult[]): BroadcastParticipant[] {
    const maximumScore = Math.max(...results.map(result => result.totalScore))
    return results.filter(result => result.totalScore === maximumScore).map(toParticipant).sort(compareParticipants)
  }
}
