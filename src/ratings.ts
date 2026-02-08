import { rating, rate, ordinal, type Options } from 'openskill'

const STORAGE_KEY = 'tank-royale-viewer-ratings'

// Rating parameters
const DEFAULT_MU = 1200
const DEFAULT_SIGMA = 400
const Z_FACTOR = 3 // Conservative rating = mu - z*sigma

// Beta controls convergence speed (default is sigma/2)
// Lower beta = faster convergence, higher = more stable but slower
const BETA = 200 // Default would be 200 with sigma=400

const options: Options = {
  mu: DEFAULT_MU,
  sigma: DEFAULT_SIGMA,
  beta: BETA,
  z: Z_FACTOR
}

// Rank tier thresholds based on conservative rating (mu - 3×sigma)
export type RankTier = 'Scrap' | 'Rookie' | 'Veteran' | 'Elite' | 'Legend'

export interface BotRating {
  mu: number
  sigma: number
  version: string // Track version for sigma reset on change
}

interface RatingsStore {
  [botName: string]: BotRating
}

let ratings: RatingsStore = {}

export function load(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      ratings = JSON.parse(stored)
    }
  } catch {
    ratings = {}
  }
}

export function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings))
  } catch {
    // Ignore storage errors
  }
}

export function getRating(botName: string): BotRating | undefined {
  return ratings[botName]
}

export function getOrCreateRating(botName: string, version: string): BotRating {
  const existing = ratings[botName]
  
  if (!existing) {
    // New bot - create default rating
    ratings[botName] = { mu: DEFAULT_MU, sigma: DEFAULT_SIGMA, version }
    return ratings[botName]
  }
  
  if (existing.version !== version) {
    // Version changed - keep mu, reset sigma
    ratings[botName] = { mu: existing.mu, sigma: DEFAULT_SIGMA, version }
  }
  
  return ratings[botName]
}

export function getConservativeRating(botRating: BotRating): number {
  return ordinal(rating({ mu: botRating.mu, sigma: botRating.sigma }), options)
}

export function getRankTier(conservativeRating: number): RankTier {
  if (conservativeRating < 600) return 'Scrap'
  if (conservativeRating < 900) return 'Rookie'
  if (conservativeRating < 1100) return 'Veteran'
  if (conservativeRating < 1300) return 'Elite'
  return 'Legend'
}

export function getRankTierForBot(botName: string): RankTier {
  const botRating = ratings[botName]
  if (!botRating) return 'Scrap'
  return getRankTier(getConservativeRating(botRating))
}

export interface RankedResult {
  name: string
  version: string
  rank: number // 1-based placement
}

/**
 * Update ratings after a game ends.
 * Results should be ordered by placement (winner first).
 */
export function updateRatings(results: RankedResult[]): void {
  if (results.length < 2) return

  // Ensure all bots have ratings
  for (const result of results) {
    getOrCreateRating(result.name, result.version)
  }

  // Build teams (each bot is a 1-player team) with current ratings
  const teams = results.map(r => {
    const botRating = ratings[r.name]
    return [rating({ mu: botRating.mu, sigma: botRating.sigma })]
  })

  // Ranks for openskill (1-based placement order)
  const ranks = results.map(r => r.rank)

  // Calculate new ratings
  const newRatings = rate(teams, { ...options, rank: ranks })

  // Update stored ratings
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const [newRating] = newRatings[i]
    ratings[result.name] = {
      mu: newRating.mu,
      sigma: newRating.sigma,
      version: result.version
    }
  }

  save()
}

export function getAllRatings(): RatingsStore {
  return { ...ratings }
}

export function exportRatings(): string {
  return JSON.stringify(ratings, null, 2)
}

export function importRatings(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    // Validate structure
    for (const [, data] of Object.entries(parsed)) {
      const r = data as BotRating
      if (typeof r.mu !== 'number' || typeof r.sigma !== 'number' || typeof r.version !== 'string') {
        return false
      }
    }
    ratings = parsed
    save()
    return true
  } catch {
    return false
  }
}

export function resetRatings(): void {
  ratings = {}
  save()
}

export function resetBotRating(botName: string): void {
  delete ratings[botName]
  save()
}

// Initialize on module load
load()
