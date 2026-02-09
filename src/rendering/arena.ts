import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'
import * as logoStorage from '../logoStorage.js'

let currentContainer: Container | null = null
let currentArenaWidth = 0
let currentArenaHeight = 0
let logoTexture: Texture | null = null
let logoSizeFraction = 0.5
let logoOpacityFraction = 0.5

export function setLogoOpacity(fraction: number): void {
  logoOpacityFraction = fraction
  if (currentContainer) {
    updateLogoSprite(currentContainer, currentArenaWidth, currentArenaHeight)
  }
}

export function setLogoSize(fraction: number): void {
  logoSizeFraction = fraction
  if (currentContainer) {
    updateLogoSprite(currentContainer, currentArenaWidth, currentArenaHeight)
  }
}

// Subscribe to logo changes
logoStorage.onLogoChange(() => {
  // Clear cached texture so it reloads on next draw
  if (logoTexture) {
    logoTexture.destroy()
    logoTexture = null
  }
  // Redraw logo if we have a container
  if (currentContainer) {
    updateLogoSprite(currentContainer, currentArenaWidth, currentArenaHeight)
  }
})

async function updateLogoSprite(
  arenaContainer: Container,
  arenaWidth: number,
  arenaHeight: number
): Promise<void> {
  // Remove old logo if exists
  const oldLogo = arenaContainer.getChildByLabel('arena-logo')
  if (oldLogo) arenaContainer.removeChild(oldLogo)

  const logoData = logoStorage.getLogo()
  if (!logoData) return

  try {
    // Load texture from base64 data URL
    if (!logoTexture) {
      logoTexture = await Assets.load(logoData)
    }
    const texture = logoTexture
    if (!texture) return

    const logo = new Sprite(texture)
    logo.label = 'arena-logo'
    logo.anchor.set(0.5)
    logo.x = arenaWidth / 2
    logo.y = arenaHeight / 2
    logo.alpha = logoOpacityFraction

    // Scale logo to fit configured percentage of arena (whichever dimension is smaller)
    const maxSize = Math.min(arenaWidth, arenaHeight) * logoSizeFraction
    const logoScale = maxSize / Math.max(texture.width, texture.height)
    logo.scale.set(logoScale)

    // Insert after background (index 1)
    arenaContainer.addChildAt(logo, 1)
  } catch (e) {
    console.warn('Failed to load logo texture:', e)
  }
}

export function drawArenaBackground(
  arenaContainer: Container,
  arenaWidth: number,
  arenaHeight: number,
  scale: number
): void {
  // Cache for logo change callback
  currentContainer = arenaContainer
  currentArenaWidth = arenaWidth
  currentArenaHeight = arenaHeight

  // Remove old background if exists
  const oldBg = arenaContainer.getChildByLabel('arena-bg')
  if (oldBg) arenaContainer.removeChild(oldBg)

  const bg = new Graphics()
  bg.label = 'arena-bg'
  bg.rect(0, 0, arenaWidth, arenaHeight)
  bg.fill({ color: 0x000000 })
  bg.stroke({ color: 0x333333, width: 2 / scale })
  arenaContainer.addChildAt(bg, 0)

  // Update logo sprite
  updateLogoSprite(arenaContainer, arenaWidth, arenaHeight)
}
