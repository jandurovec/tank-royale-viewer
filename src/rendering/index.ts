import { Application, Container, Graphics } from 'pixi.js'
import { getState } from '../gameState.js'
import { drawArenaBackground } from './arena.js'
import { createBotGraphics, updateBotGraphics } from './tank.js'
import { renderBullets } from './bullets.js'
import { renderEffects, clearEffects } from './effects.js'

// Re-export effects API for main.ts
export {
  setCurrentTurn,
  addBotDeathExplosion,
  addBulletHitBotEffect,
  addBulletHitWallEffect,
  addBulletHitBulletEffect
} from './effects.js'

export { setScanOpacity } from './tank.js'
export { setLogoOpacity, setLogoSize } from './arena.js'

const MARGIN = 32 // 2em at 16px base

let app: Application | null = null
let arenaContainer: Container | null = null
const botGraphics: Map<number, Container> = new Map()
let bulletGraphics: Graphics | null = null
let effectsGraphics: Graphics | null = null

let arenaWidth = 0
let arenaHeight = 0
let scale = 1

export async function init(container: HTMLElement): Promise<void> {
  app = new Application()
  await app.init({
    background: '#1a1a1a',
    resizeTo: container,
    antialias: true
  })
  container.appendChild(app.canvas)

  arenaContainer = new Container()
  app.stage.addChild(arenaContainer)

  // Create bullets layer (drawn on top of bots)
  bulletGraphics = new Graphics()
  bulletGraphics.label = 'bullets'

  // Create effects layer (drawn on top of bullets)
  effectsGraphics = new Graphics()
  effectsGraphics.label = 'effects'

  // Listen to renderer resize event (fires after PixiJS updates screen dimensions)
  app.renderer.on('resize', updateLayout)
  app.ticker.add(render)
}

export function setArenaSize(width: number, height: number): void {
  arenaWidth = width
  arenaHeight = height
  updateLayout()
}

function updateLayout(): void {
  if (!app || !arenaContainer || arenaWidth === 0 || arenaHeight === 0) return

  const availableWidth = app.screen.width - MARGIN * 2
  const availableHeight = app.screen.height - MARGIN * 2

  // Scale to fit while maintaining aspect ratio
  scale = Math.min(availableWidth / arenaWidth, availableHeight / arenaHeight)

  // Center the arena
  const scaledWidth = arenaWidth * scale
  const scaledHeight = arenaHeight * scale
  arenaContainer.x = (app.screen.width - scaledWidth) / 2
  arenaContainer.y = (app.screen.height - scaledHeight) / 2
  arenaContainer.scale.set(scale)

  // Draw arena background
  drawArenaBackground(arenaContainer, arenaWidth, arenaHeight, scale)
}

function render(): void {
  const state = getState()
  if (!state.setup || !arenaContainer) return

  // Update or create bot graphics
  const currentBotIds = new Set<number>()

  for (const [id, bot] of state.bots) {
    currentBotIds.add(id)
    let botContainer = botGraphics.get(id)

    if (!botContainer) {
      botContainer = createBotGraphics()
      botGraphics.set(id, botContainer)
      arenaContainer.addChild(botContainer)
    }

    updateBotGraphics(botContainer, bot, arenaHeight)
  }

  // Remove bots that are no longer in the state
  for (const [id, container] of botGraphics) {
    if (!currentBotIds.has(id)) {
      arenaContainer.removeChild(container)
      botGraphics.delete(id)
    }
  }

  // Render bullets
  if (bulletGraphics) {
    renderBullets(bulletGraphics, arenaContainer, state.bullets, arenaHeight)
  }

  // Render effects (explosions, bursts)
  if (effectsGraphics && arenaContainer) {
    if (effectsGraphics.parent) {
      arenaContainer.removeChild(effectsGraphics)
    }
    renderEffects(effectsGraphics, arenaHeight)
    arenaContainer.addChild(effectsGraphics)
  }
}

export function show(): void {
  if (app) {
    app.canvas.style.display = 'block'
  }
}

export function hide(): void {
  if (app) {
    app.canvas.style.display = 'none'
  }
  // Remove bot graphics from container and clear map
  if (arenaContainer) {
    for (const [, container] of botGraphics) {
      arenaContainer.removeChild(container)
    }
  }
  botGraphics.clear()
  // Clear bullet graphics
  if (bulletGraphics) {
    bulletGraphics.clear()
  }
  // Clear effects
  if (effectsGraphics) {
    effectsGraphics.clear()
  }
  clearEffects()
}

export function destroy(): void {
  if (app) {
    app.destroy(true)
    app = null
  }
  arenaContainer = null
  botGraphics.clear()
}
