import { Rating, TrueSkill } from 'ts-trueskill'
import * as settings from '../settings.js'
import type { RatingProvider } from './index.js'

// Tank Royale matches don't produce draws.
const DRAW_PROBABILITY = 0

function getEnv(): TrueSkill {
  const { ratingMu, ratingSigma, ratingBeta, ratingTau } = settings.get()
  return new TrueSkill(ratingMu, ratingSigma, ratingBeta, ratingTau, DRAW_PROBABILITY)
}

export const trueskillProvider: RatingProvider = {
  rate(teams, ranks) {
    if (settings.get().debug) {
      console.log(`[TrueSkill] Running rating calculation (${teams.length} teams, ranks=[${ranks.join(',')}])`)
    }
    const env = getEnv()
    const tsGroups = teams.map(group => group.map(r => new Rating(r.mu, r.sigma)))
    const rated = env.rate(tsGroups, ranks) as Rating[][]
    return rated.map(group => group.map(r => ({ mu: r.mu, sigma: r.sigma })))
  },

  conservative(r) {
    return getEnv().expose(new Rating(r.mu, r.sigma))
  },
}
