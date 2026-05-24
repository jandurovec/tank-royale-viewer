const STORAGE_KEY = 'tank-royale-viewer-settings'

export type RatingAlgorithm = 'openskill' | 'trueskill'
export type Theme = 'dark' | 'light'

export interface Settings {
  url: string
  secret: string
  debug: boolean
  theme: Theme
  scanOpacity: number
  logoOpacity: number
  logoSize: number
  showRatings: boolean
  ratingAlgorithm: RatingAlgorithm
  rankedGamesThreshold: number
  provisionalGamesThreshold: number
  ratingMu: number
  ratingSigma: number
  ratingBeta: number
  ratingTau: number
}

// Default rating parameters (μ=25, σ=μ/3, β=σ/2, τ=μ/300).
// Both OpenSkill and TrueSkill accept the same parameter names with
// compatible meanings; defaults are chosen to match OpenSkill exactly.
const RATING_MU = 25
const RATING_SIGMA = RATING_MU / 3
const RATING_BETA = RATING_SIGMA / 2
const RATING_TAU = RATING_MU / 300

const DEFAULTS: Settings = {
  url: 'ws://localhost:7654',
  secret: '',
  debug: false,
  theme: 'dark',
  scanOpacity: 5,
  logoOpacity: 50,
  logoSize: 50,
  showRatings: true,
  ratingAlgorithm: 'openskill',
  rankedGamesThreshold: 20,
  provisionalGamesThreshold: 50,
  ratingMu: RATING_MU,
  ratingSigma: RATING_SIGMA,
  ratingBeta: RATING_BETA,
  ratingTau: RATING_TAU
}

function isRatingAlgorithm(value: unknown): value is RatingAlgorithm {
  return value === 'openskill' || value === 'trueskill'
}

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light'
}

let current: Settings = { ...DEFAULTS }

export function load(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults, validating types for each property
      current = { ...DEFAULTS }
      for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
        if (key === 'ratingAlgorithm') {
          if (isRatingAlgorithm(parsed[key])) current.ratingAlgorithm = parsed[key]
        } else if (key === 'theme') {
          if (isTheme(parsed[key])) current.theme = parsed[key]
        } else if (typeof parsed[key] === typeof DEFAULTS[key]) {
          current[key] = parsed[key] as never
        }
      }
    }
  } catch {
    current = { ...DEFAULTS }
  }
  return current
}

export function save(settings: Partial<Settings>): void {
  current = { ...current, ...settings }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

export function get(): Settings {
  return current
}

export function getDefaults(): Settings {
  return { ...DEFAULTS }
}

// Test-only: reset module state to defaults
export function __resetForTests(): void {
  current = { ...DEFAULTS }
}

// Initialize on module load
load()
