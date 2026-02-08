import { Container, Graphics } from 'pixi.js'

export function drawArenaBackground(
  arenaContainer: Container,
  arenaWidth: number,
  arenaHeight: number,
  scale: number
): void {
  // Remove old background if exists
  const oldBg = arenaContainer.getChildByLabel('arena-bg')
  if (oldBg) arenaContainer.removeChild(oldBg)

  const bg = new Graphics()
  bg.label = 'arena-bg'
  bg.rect(0, 0, arenaWidth, arenaHeight)
  bg.fill({ color: 0x000000 })
  bg.stroke({ color: 0x333333, width: 2 / scale })
  arenaContainer.addChildAt(bg, 0)
}
