// Curated palette of distinct colors (ordered by preference)
const PREDEFINED_COLORS = [
  '#e6194b', '#4363d8', '#3cb44b', '#ffe119', '#f58231',
  '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
  '#008080', '#e6beff', '#9a6324', '#800000', '#808000',
  '#ffd8b1', '#000075', '#808080', '#ffffff'
]

// State: allocated colors and available pool
const allocatedColors = new Map<number, string>()  // teamId -> color
let availablePool = [...PREDEFINED_COLORS]  // colors not yet allocated

/**
 * Get color for a team. Allocates a new color if not already assigned.
 * Colors are consistent - same teamId always gets the same color until purged.
 */
export function getTeamColor(teamId: number): string {
  // Return cached color if already allocated
  const existing = allocatedColors.get(teamId)
  if (existing) return existing

  // Allocate new color
  let color: string
  if (availablePool.length > 0) {
    // Take from pool
    color = availablePool.shift()!
  } else {
    // Pool exhausted - generate random color
    color = generateRandomColor()
  }

  allocatedColors.set(teamId, color)
  return color
}

/**
 * Get color for a team in numeric format (for PixiJS).
 */
export function getTeamColorNumeric(teamId: number): number {
  const color = getTeamColor(teamId)
  return parseInt(color.slice(1), 16)
}

/**
 * Purge colors for teams that are no longer active.
 * Freed colors return to the pool for reuse.
 * @param activeTeamIds - team IDs that are still connected
 */
export function purgeInactiveTeams(activeTeamIds: number[]): void {
  const activeSet = new Set(activeTeamIds)
  const toRemove: number[] = []

  for (const [teamId, color] of allocatedColors) {
    if (!activeSet.has(teamId)) {
      toRemove.push(teamId)
      // Return predefined colors to pool (not random ones)
      if (PREDEFINED_COLORS.includes(color)) {
        availablePool.push(color)
      }
    }
  }

  for (const teamId of toRemove) {
    allocatedColors.delete(teamId)
  }
}

/**
 * Reset all color allocations. Useful for testing.
 */
export function resetAllocations(): void {
  allocatedColors.clear()
  availablePool = [...PREDEFINED_COLORS]
}

/**
 * Generate a random HSL color with good saturation and lightness.
 */
function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 60 + Math.floor(Math.random() * 30) // 60-90%
  const lightness = 45 + Math.floor(Math.random() * 20)  // 45-65%
  return hslToHex(hue, saturation, lightness)
}

/**
 * Convert HSL to hex color string.
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
