export interface BattleResult {
  readonly id: number
  readonly name: string
  readonly version: string
  readonly totalScore: number
  readonly survival: number
  readonly lastSurvivorBonus: number
  readonly bulletDamage: number
  readonly bulletKillBonus: number
  readonly ramDamage: number
  readonly ramKillBonus: number
  readonly firstPlaces: number
  readonly secondPlaces: number
  readonly thirdPlaces: number
}

export interface ResultParticipant {
  readonly teamId?: number
  readonly teamName?: string
}

export interface PreparedResult extends BattleResult {
  readonly placement: number
  readonly isTeam: boolean
}

type ScoreField = Exclude<keyof BattleResult, 'id' | 'name' | 'version'>

function average(results: readonly BattleResult[], field: ScoreField): number {
  return results.reduce((sum, result) => sum + result[field], 0) / results.length
}

function getTeamNamesById(participants: Iterable<ResultParticipant>): Map<number, Set<string>> {
  const teams = new Map<number, Set<string>>()
  for (const participant of participants) {
    if (participant.teamId === undefined || !participant.teamName) continue
    const names = teams.get(participant.teamId) ?? new Set<string>()
    names.add(participant.teamName)
    teams.set(participant.teamId, names)
  }
  return teams
}

export function prepareResults(
  results: readonly BattleResult[],
  participants: Iterable<ResultParticipant>
): PreparedResult[] {
  const grouped = new Map<string, BattleResult[]>()
  for (const result of results) {
    const group = grouped.get(result.name) ?? []
    group.push(result)
    grouped.set(result.name, group)
  }

  const teamNamesById = getTeamNamesById(participants)
  const prepared = [...grouped.values()].map(group => {
    const representative = group.reduce((selected, candidate) =>
      candidate.id < selected.id ? candidate : selected
    )
    return {
      id: representative.id,
      name: representative.name,
      version: representative.version,
      totalScore: average(group, 'totalScore'),
      survival: average(group, 'survival'),
      lastSurvivorBonus: average(group, 'lastSurvivorBonus'),
      bulletDamage: average(group, 'bulletDamage'),
      bulletKillBonus: average(group, 'bulletKillBonus'),
      ramDamage: average(group, 'ramDamage'),
      ramKillBonus: average(group, 'ramKillBonus'),
      firstPlaces: average(group, 'firstPlaces'),
      secondPlaces: average(group, 'secondPlaces'),
      thirdPlaces: average(group, 'thirdPlaces'),
      isTeam: teamNamesById.get(representative.id)?.has(representative.name) ?? false
    }
  })

  prepared.sort((a, b) =>
    b.totalScore - a.totalScore ||
    a.id - b.id ||
    a.name.localeCompare(b.name)
  )

  let placement = 0
  let previousScore: number | undefined
  return prepared.map((result, index) => {
    if (index === 0 || result.totalScore !== previousScore) {
      placement = index + 1
    }
    previousScore = result.totalScore
    return { ...result, placement }
  })
}
