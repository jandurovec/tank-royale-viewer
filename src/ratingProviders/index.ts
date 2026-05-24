import * as settings from '../settings.js'
import { openskillProvider } from './openskill.js'
import { trueskillProvider } from './trueskill.js'

export interface MuSigma {
  mu: number
  sigma: number
}

/**
 * Strategy interface for skill rating algorithms (OpenSkill, TrueSkill, ...).
 * Implementations are stateless singletons that read μ/σ/β/τ from the settings
 * module on each call, so live edits in the settings panel take effect immediately.
 */
export interface RatingProvider {
  /**
   * Recalculate ratings after a match.
   * @param teams Each entry is a team of {mu, sigma} ratings (1-bot teams are an array of length 1).
   * @param ranks 1-based placement ranks, parallel to `teams`.
   * @returns Updated {mu, sigma} ratings, in the same shape as `teams`.
   */
  rate(teams: MuSigma[][], ranks: number[]): MuSigma[][]

  /**
   * Conservative ("ordinal") rating for a single bot — μ minus a multiple of σ —
   * used downstream for tier and percentile calculation.
   */
  conservative(r: MuSigma): number
}

export function getRatingProvider(): RatingProvider {
  return settings.get().ratingAlgorithm === 'trueskill'
    ? trueskillProvider
    : openskillProvider
}
