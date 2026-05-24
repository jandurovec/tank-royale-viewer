import { rating as osRating, rate as osRate, ordinal as osOrdinal, type Options } from 'openskill'
import * as settings from '../settings.js'
import type { RatingProvider } from './index.js'

function getOptions(): Options {
  const { ratingMu, ratingSigma, ratingBeta, ratingTau } = settings.get()
  return { mu: ratingMu, sigma: ratingSigma, beta: ratingBeta, tau: ratingTau }
}

export const openskillProvider: RatingProvider = {
  rate(teams, ranks) {
    if (settings.get().debug) {
      console.log(`[OpenSkill] Running rating calculation (${teams.length} teams, ranks=[${ranks.join(',')}])`)
    }
    const osTeams = teams.map(group => group.map(r => osRating({ mu: r.mu, sigma: r.sigma })))
    const rated = osRate(osTeams, { ...getOptions(), rank: ranks })
    return rated.map(group => group.map(r => ({ mu: r.mu, sigma: r.sigma })))
  },

  conservative(r) {
    return osOrdinal(osRating({ mu: r.mu, sigma: r.sigma }), getOptions())
  },
}
