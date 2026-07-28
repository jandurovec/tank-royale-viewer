import type { ArenaViewportRect } from '../rendering/arenaViewportRect.js'

export type { ArenaViewportRect } from '../rendering/arenaViewportRect.js'

export interface ViewportSize {
  readonly width: number
  readonly height: number
}

export interface FeedPosition {
  readonly left: number
  readonly bottom: number
  readonly width: number
}

export const FEED_GAP = 12
export const VIEWPORT_MARGIN = 16

export function getFeedPosition(
  arena: ArenaViewportRect | null,
  viewport: ViewportSize,
  minimumWidth: number
): FeedPosition {
  const maximumWidth = Math.max(0, viewport.width - (VIEWPORT_MARGIN * 2))
  const safeRight = viewport.width - VIEWPORT_MARGIN

  if (!arena) {
    const width = Math.min(minimumWidth, maximumWidth)
    return {
      left: safeRight - width,
      bottom: VIEWPORT_MARGIN,
      width
    }
  }

  const idealLeft = arena.right + FEED_GAP
  const availableWidth = safeRight - idealLeft
  const width = Math.min(maximumWidth, Math.max(minimumWidth, availableWidth))

  return {
    left: safeRight - width,
    bottom: Math.max(VIEWPORT_MARGIN, viewport.height - arena.bottom),
    width
  }
}
