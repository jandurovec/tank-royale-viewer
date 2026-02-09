import { rating, rate, ordinal, type Options } from 'openskill'
import * as settings from './settings.js'
import * as tiers from './tiers.js'

// Bot tier includes 'Unranked' (insufficient games) plus calculated tiers
export type BotTier = 'Unranked' | tiers.Tier

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

export interface BotRating {
  mu: number
  sigma: number
  version: string // Track version for sigma reset on change
  games: number // Number of ranked games played
}

interface RatingsStore {
  [botName: string]: BotRating
}

let ratings: RatingsStore = {}

export function load(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as RatingsStore
      // Migrate old data: if games field is missing, assume 1 (bot has played)
      for (const botName of Object.keys(parsed)) {
        if (parsed[botName].games === undefined) {
          parsed[botName].games = 1
        }
      }
      ratings = parsed
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
    // New bot - create default rating with games=0
    ratings[botName] = { mu: DEFAULT_MU, sigma: DEFAULT_SIGMA, version, games: 0 }
    return ratings[botName]
  }

  if (existing.version !== version) {
    // Version changed - keep mu and games, reset sigma
    ratings[botName] = { mu: existing.mu, sigma: DEFAULT_SIGMA, version, games: existing.games }
  }

  return ratings[botName]
}

export function getConservativeRating(botRating: BotRating): number {
  return ordinal(rating({ mu: botRating.mu, sigma: botRating.sigma }), options)
}

// Update tier cache with fully-ranked bot ratings
function updateTierCache(): void {
  const { provisionalGamesThreshold, debug } = settings.get()
  const eligibleBots = Object.entries(ratings)
    .filter(([, r]) => r.games >= provisionalGamesThreshold)
  const fullyRankedRatings = eligibleBots.map(([, r]) => getConservativeRating(r))
  
  if (debug) {
    console.log('[Tiers] Recalculating tier thresholds')
    console.log('[Tiers] Eligible bots (games >= ' + provisionalGamesThreshold + '):')
    for (const [name, r] of eligibleBots) {
      console.log(`  ${name}: conservative=${Math.round(getConservativeRating(r))}, mu=${Math.round(r.mu)}, sigma=${Math.round(r.sigma)}, games=${r.games}`)
    }
  }
  
  tiers.recalculateTierThresholds(fullyRankedRatings)
  
  if (debug) {
    const cached = tiers.getCachedTierData()
    if (cached) {
      console.log('[Tiers] Calculated thresholds (rankedCount=' + cached.rankedCount + '):')
      for (const t of cached.thresholds) {
        console.log(`  ${t.tier}: >= ${Math.round(t.rating)}`)
      }
    }
  }
}

export function getRankTierForBot(botName: string): BotTier {
  const { rankedGamesThreshold, debug } = settings.get()
  const botRating = ratings[botName]
  if (!botRating) {
    if (debug) console.log(`[Tiers] ${botName}: Unranked (no rating data)`)
    return 'Unranked'
  }
  if (botRating.games < rankedGamesThreshold) {
    if (debug) console.log(`[Tiers] ${botName}: Unranked (games=${botRating.games} < threshold=${rankedGamesThreshold})`)
    return 'Unranked'
  }
  if (!tiers.isCacheValid()) updateTierCache()
  const conservative = getConservativeRating(botRating)
  const tier = tiers.getTierForRating(conservative)
  if (debug) console.log(`[Tiers] ${botName}: ${tier} (conservative=${Math.round(conservative)}, games=${botRating.games})`)
  return tier
}

export function getGamesToRanked(botName: string): number {
  const threshold = settings.get().rankedGamesThreshold
  const botRating = ratings[botName]
  if (!botRating) return threshold
  return Math.max(0, threshold - botRating.games)
}

export function isProvisional(botName: string): boolean {
  const { rankedGamesThreshold, provisionalGamesThreshold } = settings.get()
  const botRating = ratings[botName]
  if (!botRating) return false
  return botRating.games >= rankedGamesThreshold && botRating.games < provisionalGamesThreshold
}

export function getGamesToFullRank(botName: string): number {
  const threshold = settings.get().provisionalGamesThreshold
  const botRating = ratings[botName]
  if (!botRating) return threshold
  return Math.max(0, threshold - botRating.games)
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
    const currentGames = ratings[result.name].games
    ratings[result.name] = {
      mu: newRating.mu,
      sigma: newRating.sigma,
      version: result.version,
      games: currentGames + 1
    }
  }

  save()
  tiers.invalidateTierCache()
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
    // Validate structure and migrate missing games field
    for (const [botName, data] of Object.entries(parsed)) {
      const r = data as BotRating
      if (typeof r.mu !== 'number' || typeof r.sigma !== 'number' || typeof r.version !== 'string') {
        return false
      }
      // Migrate: if games field is missing, assume 1
      if (r.games === undefined) {
        (parsed as RatingsStore)[botName].games = 1
      } else if (typeof r.games !== 'number') {
        return false
      }
    }
    ratings = parsed
    save()
    tiers.invalidateTierCache()
    return true
  } catch {
    return false
  }
}

export function resetRatings(): void {
  ratings = {}
  save()
  tiers.invalidateTierCache()
}

export function resetBotRating(botName: string): void {
  delete ratings[botName]
  save()
  tiers.invalidateTierCache()
}

// Called when settings that affect tier calculation change
export function invalidateTierCache(): void {
  tiers.invalidateTierCache()
}

// Initialize on module load
load()
