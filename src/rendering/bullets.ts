import type { Graphics } from 'pixi.js'
import { parseColor, DEFAULT_BULLET_COLOR } from './colors.js'
import { gameYToScreenY } from './transforms.js'

export interface BulletData {
  x: number
  y: number
  power: number
  color?: string
}

export function getBulletRadius(power: number): number {
  return Math.sqrt(2.5 * power)
}

export function renderBullets(
  bulletGraphics: Graphics,
  bullets: BulletData[],
  arenaHeight: number
): void {
  bulletGraphics.clear()

  for (const bullet of bullets) {
    const radius = getBulletRadius(bullet.power)
    const screenY = gameYToScreenY(bullet.y, arenaHeight)

    const color = parseColor(bullet.color, DEFAULT_BULLET_COLOR)
    bulletGraphics.circle(bullet.x, screenY, radius)
    bulletGraphics.fill({ color })
  }
}
