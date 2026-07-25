import { describe, it, expect, beforeEach } from 'vitest'
import * as ratings from './ratings'
import * as settings from './settings'

beforeEach(() => {
  localStorage.clear()
  settings.__resetForTests()
  ratings.__resetForTests()
})

describe('getOrCreateRating', () => {
  it('creates a new rating with default mu/sigma and games=0', () => {
    const r = ratings.getOrCreateRating('Bot', '1.0')
    const defaults = settings.getDefaults()
    expect(r.mu).toBe(defaults.ratingMu)
    expect(r.sigma).toBe(defaults.ratingSigma)
    expect(r.version).toBe('1.0')
    expect(r.games).toBe(0)
  })

  it('returns the existing rating for the same bot+version', () => {
    const a = ratings.getOrCreateRating('Bot', '1.0')
    a.mu = 30
    const b = ratings.getOrCreateRating('Bot', '1.0')
    expect(b.mu).toBe(30)
  })

  it('keeps mu and games but resets sigma when version changes', () => {
    ratings.updateRatings([
      { name: 'Bot', version: '1.0', rank: 1 },
      { name: 'Other', version: '1.0', rank: 2 },
    ])
    const before = ratings.getRating('Bot')!
    expect(before.sigma).toBeLessThan(settings.getDefaults().ratingSigma)

    const after = ratings.getOrCreateRating('Bot', '2.0')
    expect(after.mu).toBe(before.mu)
    expect(after.games).toBe(before.games)
    expect(after.sigma).toBe(settings.getDefaults().ratingSigma)
    expect(after.version).toBe('2.0')
  })
})

describe('updateRatings', () => {
  it('is a no-op for fewer than 2 results', () => {
    ratings.updateRatings([{ name: 'Solo', version: '1.0', rank: 1 }])
    expect(ratings.getRating('Solo')).toBeUndefined()
  })

  it('moves the winner up and the loser down (directional)', () => {
    ratings.updateRatings([
      { name: 'Winner', version: '1.0', rank: 1 },
      { name: 'Loser', version: '1.0', rank: 2 },
    ])
    const w = ratings.getRating('Winner')!
    const l = ratings.getRating('Loser')!
    const defaults = settings.getDefaults()
    expect(w.mu).toBeGreaterThan(defaults.ratingMu)
    expect(l.mu).toBeLessThan(defaults.ratingMu)
  })

  it.each(['openskill', 'trueskill'] as const)('passes shared placements to %s as a tie', algorithm => {
    settings.save({ ratingAlgorithm: algorithm })
    ratings.updateRatings([
      { name: 'Winner', version: '1.0', rank: 1 },
      { name: 'Tied Alpha', version: '1.0', rank: 2 },
      { name: 'Tied Bravo', version: '1.0', rank: 2 },
      { name: 'Fourth', version: '1.0', rank: 4 }
    ])

    const winner = ratings.getRating('Winner')!
    const tiedAlpha = ratings.getRating('Tied Alpha')!
    const tiedBravo = ratings.getRating('Tied Bravo')!
    const fourth = ratings.getRating('Fourth')!

    expect(tiedAlpha.mu).toBeCloseTo(tiedBravo.mu)
    expect(tiedAlpha.sigma).toBeCloseTo(tiedBravo.sigma)
    expect(winner.mu).toBeGreaterThan(tiedAlpha.mu)
    expect(tiedAlpha.mu).toBeGreaterThan(fourth.mu)
  })

  it('decreases sigma for participants', () => {
    const defaults = settings.getDefaults()
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
      { name: 'C', version: '1.0', rank: 3 },
    ])
    expect(ratings.getRating('A')!.sigma).toBeLessThan(defaults.ratingSigma)
    expect(ratings.getRating('B')!.sigma).toBeLessThan(defaults.ratingSigma)
    expect(ratings.getRating('C')!.sigma).toBeLessThan(defaults.ratingSigma)
  })

  it('increments games for each participant', () => {
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
    ])
    expect(ratings.getRating('A')!.games).toBe(1)
    expect(ratings.getRating('B')!.games).toBe(1)

    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
    ])
    expect(ratings.getRating('A')!.games).toBe(2)
    expect(ratings.getRating('B')!.games).toBe(2)
  })

  it('persists ratings to localStorage', () => {
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
    ])
    const raw = localStorage.getItem('tank-royale-viewer-ratings')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.A).toBeDefined()
    expect(parsed.B).toBeDefined()
  })

  // Frozen-reference canary: protects against silent algorithmic changes in openskill.
  // Pinned to ±0.2 around observed values on openskill@4.1.0 with the project's
  // default mu/sigma/beta/tau. If this test fails after an openskill upgrade, the
  // rating algorithm or its defaults have changed and stored ratings should be
  // reset (or the bounds re-baselined consciously).
  it('produces stable rating deltas for a fixed scenario (openskill canary)', () => {
    settings.save({ ratingAlgorithm: 'openskill' })
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
      { name: 'C', version: '1.0', rank: 3 },
    ])
    const a = ratings.getRating('A')!
    const b = ratings.getRating('B')!
    const c = ratings.getRating('C')!
    expect(a.mu).toBeGreaterThan(27.6)
    expect(a.mu).toBeLessThan(28.1)
    expect(b.mu).toBeGreaterThan(25.5)
    expect(b.mu).toBeLessThan(25.9)
    expect(c.mu).toBeGreaterThan(21.2)
    expect(c.mu).toBeLessThan(21.6)
    // Sigma drops uniformly for all three after a single 3-bot game.
    expect(a.sigma).toBeGreaterThan(8.0)
    expect(a.sigma).toBeLessThan(8.3)
  })

  // Frozen-reference canary: protects against silent algorithmic changes in ts-trueskill.
  // Pinned to ±0.2 around observed values on ts-trueskill@5.1.0 with the project's
  // default mu/sigma/beta/tau and drawProbability=0. If this test fails after a
  // ts-trueskill upgrade, the rating algorithm or its defaults have changed and
  // stored ratings should be reset (or the bounds re-baselined consciously).
  // Note: unlike OpenSkill, TrueSkill drops the middle bot's sigma more than the
  // outer bots' (the middle placement carries more information).
  it('produces stable rating deltas for a fixed scenario (trueskill canary)', () => {
    settings.save({ ratingAlgorithm: 'trueskill' })
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
      { name: 'C', version: '1.0', rank: 3 },
    ])
    const a = ratings.getRating('A')!
    const b = ratings.getRating('B')!
    const c = ratings.getRating('C')!
    expect(a.mu).toBeGreaterThan(31.1)
    expect(a.mu).toBeLessThan(31.5)
    expect(b.mu).toBeGreaterThan(24.8)
    expect(b.mu).toBeLessThan(25.2)
    expect(c.mu).toBeGreaterThan(18.5)
    expect(c.mu).toBeLessThan(18.9)
    // Outer bots (A, C) share the same sigma; middle bot (B) drops faster.
    expect(a.sigma).toBeGreaterThan(6.5)
    expect(a.sigma).toBeLessThan(6.9)
    expect(c.sigma).toBeGreaterThan(6.5)
    expect(c.sigma).toBeLessThan(6.9)
    expect(b.sigma).toBeGreaterThan(6.0)
    expect(b.sigma).toBeLessThan(6.5)
  })

  // Switching the algorithm produces measurably different mu values from the
  // same fixture, proving the dropdown actually rewires the math.
  it('produces different mu values under OpenSkill vs TrueSkill for the same scenario', () => {
    settings.save({ ratingAlgorithm: 'openskill' })
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
      { name: 'C', version: '1.0', rank: 3 },
    ])
    const openMu = {
      a: ratings.getRating('A')!.mu,
      b: ratings.getRating('B')!.mu,
      c: ratings.getRating('C')!.mu,
    }

    ratings.__resetForTests()
    settings.save({ ratingAlgorithm: 'trueskill' })
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
      { name: 'C', version: '1.0', rank: 3 },
    ])
    const tsMu = {
      a: ratings.getRating('A')!.mu,
      b: ratings.getRating('B')!.mu,
      c: ratings.getRating('C')!.mu,
    }

    // At least one of the three differs by more than rounding noise.
    const maxDelta = Math.max(
      Math.abs(openMu.a - tsMu.a),
      Math.abs(openMu.b - tsMu.b),
      Math.abs(openMu.c - tsMu.c),
    )
    expect(maxDelta).toBeGreaterThan(0.1)
  })
})

describe.each(['openskill', 'trueskill'] as const)('getConservativeRating (%s)', (algorithm) => {
  beforeEach(() => {
    settings.save({ ratingAlgorithm: algorithm })
  })

  it('is monotonically increasing in mu', () => {
    const low = ratings.getConservativeRating({ mu: 20, sigma: 5, version: '1', games: 1 })
    const high = ratings.getConservativeRating({ mu: 30, sigma: 5, version: '1', games: 1 })
    expect(high).toBeGreaterThan(low)
  })

  it('is monotonically decreasing in sigma', () => {
    const certain = ratings.getConservativeRating({ mu: 25, sigma: 2, version: '1', games: 1 })
    const uncertain = ratings.getConservativeRating({ mu: 25, sigma: 8, version: '1', games: 1 })
    expect(certain).toBeGreaterThan(uncertain)
  })
})

describe('tier and provisional thresholds', () => {
  function playGames(name: string, n: number): void {
    for (let i = 0; i < n; i++) {
      ratings.updateRatings([
        { name, version: '1.0', rank: 1 },
        { name: `Filler${i}`, version: '1.0', rank: 2 },
      ])
    }
  }

  it('returns Unranked when bot has no rating', () => {
    expect(ratings.getRankTierForBot('Nobody')).toBe('Unranked')
  })

  it('returns Unranked below rankedGamesThreshold', () => {
    settings.save({ rankedGamesThreshold: 3, provisionalGamesThreshold: 5 })
    playGames('Bot', 2)
    expect(ratings.getRankTierForBot('Bot')).toBe('Unranked')
  })

  it('isProvisional is true between ranked and provisional thresholds', () => {
    settings.save({ rankedGamesThreshold: 2, provisionalGamesThreshold: 5 })
    playGames('Bot', 3)
    expect(ratings.isProvisional('Bot')).toBe(true)
  })

  it('isProvisional is false once provisional threshold is reached', () => {
    settings.save({ rankedGamesThreshold: 2, provisionalGamesThreshold: 4 })
    playGames('Bot', 5)
    expect(ratings.isProvisional('Bot')).toBe(false)
  })

  it('getGamesToRanked / getGamesToFullRank decrement correctly', () => {
    settings.save({ rankedGamesThreshold: 5, provisionalGamesThreshold: 10 })
    playGames('Bot', 2)
    expect(ratings.getGamesToRanked('Bot')).toBe(3)
    expect(ratings.getGamesToFullRank('Bot')).toBe(8)
  })
})

describe('export / import', () => {
  it('round-trips ratings via export/import', () => {
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
    ])
    const json = ratings.exportRatings()

    ratings.__resetForTests()
    expect(ratings.getRating('A')).toBeUndefined()

    expect(ratings.importRatings(json)).toBe(true)
    expect(ratings.getRating('A')).toBeDefined()
    expect(ratings.getRating('B')).toBeDefined()
  })

  it('rejects malformed JSON', () => {
    expect(ratings.importRatings('not json')).toBe(false)
  })

  it('rejects entries with wrong field types', () => {
    expect(
      ratings.importRatings(JSON.stringify({ Bad: { mu: 'oops', sigma: 5, version: '1', games: 0 } }))
    ).toBe(false)
  })

  it('migrates legacy entries missing the games field to games=1', () => {
    const legacy = JSON.stringify({ Old: { mu: 25, sigma: 8, version: '1.0' } })
    expect(ratings.importRatings(legacy)).toBe(true)
    expect(ratings.getRating('Old')!.games).toBe(1)
  })
})

describe('reset', () => {
  it('resetRatings clears all data', () => {
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
    ])
    ratings.resetRatings()
    expect(ratings.getRating('A')).toBeUndefined()
    expect(ratings.getRating('B')).toBeUndefined()
  })

  it('resetBotRating only clears the named bot', () => {
    ratings.updateRatings([
      { name: 'A', version: '1.0', rank: 1 },
      { name: 'B', version: '1.0', rank: 2 },
    ])
    ratings.resetBotRating('A')
    expect(ratings.getRating('A')).toBeUndefined()
    expect(ratings.getRating('B')).toBeDefined()
  })
})
