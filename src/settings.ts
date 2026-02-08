const STORAGE_KEY = 'tank-royale-viewer-settings'

export interface Settings {
  url: string
  secret: string
  debug: boolean
  scanOpacity: number
}

const DEFAULTS: Settings = {
  url: 'ws://localhost:7654',
  secret: '',
  debug: false,
  scanOpacity: 5
}

let current: Settings = { ...DEFAULTS }

export function load(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults (handles missing/invalid properties)
      current = {
        url: typeof parsed.url === 'string' ? parsed.url : DEFAULTS.url,
        secret: typeof parsed.secret === 'string' ? parsed.secret : DEFAULTS.secret,
        debug: typeof parsed.debug === 'boolean' ? parsed.debug : DEFAULTS.debug,
        scanOpacity: typeof parsed.scanOpacity === 'number' ? parsed.scanOpacity : DEFAULTS.scanOpacity
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
