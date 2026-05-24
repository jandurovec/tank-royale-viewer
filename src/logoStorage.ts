const STORAGE_KEY = 'tank-royale-viewer-logo'

let cachedLogo: string | null = null
const changeCallbacks: Array<(logo: string | null) => void> = []

export function getLogo(): string | null {
  if (cachedLogo !== null) return cachedLogo
  try {
    cachedLogo = localStorage.getItem(STORAGE_KEY)
  } catch {
    cachedLogo = null
  }
  return cachedLogo
}

export function saveLogo(base64Data: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, base64Data)
    cachedLogo = base64Data
    notifyChange()
    return true
  } catch {
    return false
  }
}

export function clearLogo(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
  cachedLogo = null
  notifyChange()
}

export function onLogoChange(callback: (logo: string | null) => void): void {
  changeCallbacks.push(callback)
}

function notifyChange(): void {
  const logo = getLogo()
  for (const cb of changeCallbacks) {
    cb(logo)
  }
}

// Test-only: reset module state without touching localStorage contents
export function __resetForTests(): void {
  cachedLogo = null
  changeCallbacks.length = 0
}
