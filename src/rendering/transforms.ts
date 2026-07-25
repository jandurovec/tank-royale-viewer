const DEGREES_TO_RADIANS = Math.PI / 180

export function gameYToScreenY(gameY: number, arenaHeight: number): number {
  return arenaHeight - gameY
}

export function directionToScreenRadians(direction: number): number {
  return -direction * DEGREES_TO_RADIANS
}

export function tankDirectionToRotation(direction: number): number {
  return directionToScreenRadians(direction) + Math.PI
}
