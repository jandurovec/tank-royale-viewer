// Pure tier calculation module - no dependencies on ratings storage

export type Tier = 'Scrap' | 'Rookie' | 'Veteran' | 'Elite' | 'Legend'

// Percentile thresholds for tier boundaries
// Scrap: bottom 20%, Rookie: 20-60%, Veteran: 60-80%, Elite: 80-95%, Legend: top 5%
const TIER_PERCENTILES = {
  rookie: 20,   // threshold to exit Scrap
  veteran: 60,  // threshold to exit Rookie
  elite: 80,    // threshold to exit Veteran
  legend: 95    // threshold to exit Elite
}

// Tier configuration with minimum bot count required
const TIER_CONFIG: Array<{ minBots: number; percentile: number; tier: Tier }> = [
  { minBots: 5, percentile: TIER_PERCENTILES.legend, tier: 'Legend' },
  { minBots: 3, percentile: TIER_PERCENTILES.elite, tier: 'Elite' },
  { minBots: 2, percentile: TIER_PERCENTILES.veteran, tier: 'Veteran' },
  { minBots: 4, percentile: TIER_PERCENTILES.rookie, tier: 'Rookie' },
]

// Cached tier thresholds (rating values, not percentiles)
interface CachedTierData {
  rankedCount: number
  min: number
  max: number
  thresholds: Array<{ tier: Tier; rating: number }>  // sorted by rating descending
}

let cachedTierData: CachedTierData | null = null

/**
 * Recalculate tier thresholds from an array of fully-ranked bot ratings.
 * Call this when ratings data changes.
 * @param fullyRankedRatings Conservative ratings of bots that are fully ranked (not provisional)
 */
export function recalculateTierThresholds(fullyRankedRatings: number[]): void {
  const n = fullyRankedRatings.length

  if (n === 0) {
    cachedTierData = { rankedCount: 0, min: 0, max: 0, thresholds: [] }
    return
  }

  const min = Math.min(...fullyRankedRatings)
  const max = Math.max(...fullyRankedRatings)
  const range = max - min

  // Get rating value at a given percentile (value-based, not rank-based)
  const getPercentileValue = (p: number) => min + (p / 100) * range

  // Build thresholds for active tiers
  const thresholds: Array<{ tier: Tier; rating: number }> = []
  for (const config of TIER_CONFIG) {
    if (n >= config.minBots) {
      thresholds.push({ tier: config.tier, rating: getPercentileValue(config.percentile) })
    }
  }

  // Sort by rating descending for efficient lookup
  thresholds.sort((a, b) => b.rating - a.rating)

  cachedTierData = { rankedCount: n, min, max, thresholds }
}

/**
 * Get the tier for a given conservative rating value.
 * Uses cached thresholds - call recalculateTierThresholds first if data changed.
 */
export function getTierForRating(conservativeRating: number): Tier {
  if (!cachedTierData || cachedTierData.rankedCount <= 1) return 'Rookie'

  // Find highest threshold exceeded
  for (const t of cachedTierData.thresholds) {
    if (conservativeRating >= t.rating) return t.tier
  }

  // Default: Scrap if available (4+ bots), otherwise Rookie
  return cachedTierData.rankedCount >= 4 ? 'Scrap' : 'Rookie'
}

/**
 * Invalidate the tier cache. Call when underlying data might have changed.
 */
export function invalidateTierCache(): void {
  cachedTierData = null
}

/**
 * Check if tier cache needs recalculation.
 */
export function isCacheValid(): boolean {
  return cachedTierData !== null
}

/**
 * Get current cached tier data for debugging.
 */
export function getCachedTierData(): { rankedCount: number; min: number; max: number; thresholds: Array<{ tier: Tier; rating: number }> } | null {
  return cachedTierData ? { ...cachedTierData, thresholds: [...cachedTierData.thresholds] } : null
}

/**
 * Calculate percentile for a given rating value.
 * Uses cached min/max from fully-ranked bots.
 * @returns percentile (can be < 0 or > 100 for ratings outside ranked range), or null if insufficient data
 */
export function getPercentileForRating(conservativeRating: number): number | null {
  if (!cachedTierData || cachedTierData.rankedCount < 2) return null
  
  const { min, max } = cachedTierData
  const range = max - min
  if (range === 0) return 50 // All bots have same rating
  
  return ((conservativeRating - min) / range) * 100
}
