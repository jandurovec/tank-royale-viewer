import { Container, Graphics } from 'pixi.js'
import { parseColor, DEFAULT_BULLET_COLOR } from './colors.js'

export interface BulletData {
  x: number
  y: number
  power: number
  color?: string
}

export function renderBullets(
  bulletGraphics: Graphics,
  arenaContainer: Container,
  bullets: BulletData[],
  arenaHeight: number
): void {
  // Remove from container first (will re-add at end to keep on top)
  if (bulletGraphics.parent) {
    arenaContainer.removeChild(bulletGraphics)
  }

  bulletGraphics.clear()

  for (const bullet of bullets) {
    // Bullet size formula from original: diameter = 2 * sqrt(2.5 * power)
    const diameter = 2 * Math.sqrt(2.5 * bullet.power)
    const radius = diameter / 2

    // Transform coordinates: Y-flip
    const screenX = bullet.x
    const screenY = arenaHeight - bullet.y

    const color = parseColor(bullet.color, DEFAULT_BULLET_COLOR)
    bulletGraphics.circle(screenX, screenY, radius)
    bulletGraphics.fill({ color })
  }

  // Add to container (on top of everything)
  arenaContainer.addChild(bulletGraphics)
}
