const STORAGE_KEY = 'tank-royale-viewer-settings'

export interface Settings {
  url: string
  secret: string
  debug: boolean
  scanOpacity: number
  logoOpacity: number
  logoSize: number
  showRatings: boolean
  rankedGamesThreshold: number
  provisionalGamesThreshold: number
  ratingMu: number
  ratingSigma: number
  ratingBeta: number
  ratingTau: number
}

// OpenSkill library defaults
const OPENSKILL_MU = 25
const OPENSKILL_SIGMA = OPENSKILL_MU / 3
const OPENSKILL_BETA = OPENSKILL_SIGMA / 2
const OPENSKILL_TAU = OPENSKILL_MU / 300

const DEFAULTS: Settings = {
  url: 'ws://localhost:7654',
  secret: '',
  debug: false,
  scanOpacity: 5,
  logoOpacity: 50,
  logoSize: 50,
  showRatings: true,
  rankedGamesThreshold: 20,
  provisionalGamesThreshold: 50,
  ratingMu: OPENSKILL_MU,
  ratingSigma: OPENSKILL_SIGMA,
  ratingBeta: OPENSKILL_BETA,
  ratingTau: OPENSKILL_TAU
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
        if (typeof parsed[key] === typeof DEFAULTS[key]) {
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

// Initialize on module load
load()
