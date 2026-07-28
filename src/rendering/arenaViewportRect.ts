export interface ArenaViewportRect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

export interface CanvasRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export function getArenaViewportRect(
  canvas: CanvasRect,
  screenWidth: number,
  screenHeight: number,
  arenaX: number,
  arenaY: number,
  arenaScale: number,
  arenaWidth: number,
  arenaHeight: number
): ArenaViewportRect | null {
  if (
    !Number.isFinite(screenWidth) || !Number.isFinite(screenHeight) ||
    !Number.isFinite(arenaX) || !Number.isFinite(arenaY) ||
    !Number.isFinite(arenaScale) || !Number.isFinite(arenaWidth) || !Number.isFinite(arenaHeight) ||
    screenWidth <= 0 || screenHeight <= 0 || canvas.width <= 0 || canvas.height <= 0 ||
    arenaScale <= 0 || arenaWidth <= 0 || arenaHeight <= 0
  ) {
    return null
  }

  const xScale = canvas.width / screenWidth
  const yScale = canvas.height / screenHeight
  const left = canvas.left + arenaX * xScale
  const top = canvas.top + arenaY * yScale
  const width = arenaWidth * arenaScale * xScale
  const height = arenaHeight * arenaScale * yScale

  return { left, top, right: left + width, bottom: top + height, width, height }
}
