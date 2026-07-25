import type { Container, Graphics } from 'pixi.js'

export function placeTransientLayers(
  arenaContainer: Container,
  bulletGraphics: Graphics,
  effectsGraphics: Graphics
): void {
  arenaContainer.addChild(bulletGraphics)
  arenaContainer.addChild(effectsGraphics)
}
