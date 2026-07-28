import { Application, Container, Graphics } from 'pixi.js'
import { getState } from '../gameState.js'
import { drawArenaBackground } from './arena.js'
import {
  createBotGraphics,
  removeStaleBotGraphics,
  updateBotGraphics,
  type TeamInfo
} from './tank.js'
import { renderBullets } from './bullets.js'
import { renderEffects, clearEffects } from './effects.js'
import { placeTransientLayers } from './layers.js'
import { getTeamColorNumeric } from '../teamColors.js'
import { getArenaViewportRect as calculateArenaViewportRect } from './arenaViewportRect.js'
import type { ArenaViewportRect } from './arenaViewportRect.js'

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
const layoutListeners = new Set<(rect: ArenaViewportRect | null) => void>()

export async function init(container: HTMLElement): Promise<void> {
  app = new Application()
  await app.init({
    backgroundAlpha: 0,
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
  updateLayout()
}

export function onArenaLayoutChange(listener: (rect: ArenaViewportRect | null) => void): () => void {
  layoutListeners.add(listener)
  listener(getArenaViewportRect())
  return () => layoutListeners.delete(listener)
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
  notifyLayoutListeners()
}

function getArenaViewportRect(): ArenaViewportRect | null {
  if (!app || !arenaContainer) return null
  const canvasRect = app.canvas.getBoundingClientRect()
  return calculateArenaViewportRect(
    { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height },
    app.screen.width,
    app.screen.height,
    arenaContainer.x,
    arenaContainer.y,
    arenaContainer.scale.x,
    arenaWidth,
    arenaHeight
  )
}

function notifyLayoutListeners(): void {
  const rect = getArenaViewportRect()
  for (const listener of layoutListeners) listener(rect)
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

    // Get team info if bot is in a team
    const participant = state.participants.get(id)
    let teamInfo: TeamInfo | undefined
    if (participant?.teamId !== undefined && participant.teamName) {
      teamInfo = {
        teamName: participant.teamName,
        teamColor: getTeamColorNumeric(participant.teamId)
      }
    }

    updateBotGraphics(botContainer, bot, arenaHeight, teamInfo)
  }

  removeStaleBotGraphics(arenaContainer, botGraphics, currentBotIds)

  // Render bullets
  if (bulletGraphics) {
    renderBullets(bulletGraphics, state.bullets, arenaHeight)
  }

  // Render effects (explosions, bursts)
  if (effectsGraphics) {
    renderEffects(effectsGraphics, arenaHeight)
  }

  if (bulletGraphics && effectsGraphics) {
    placeTransientLayers(arenaContainer, bulletGraphics, effectsGraphics)
  }
}

export function show(): void {
  if (app) {
    app.canvas.style.display = 'block'
  }
  updateLayout()
}

export function hide(): void {
  if (app) {
    app.canvas.style.display = 'none'
  }
  notifyLayoutListeners()
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
  layoutListeners.clear()
}
