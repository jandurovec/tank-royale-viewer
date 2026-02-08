import { Graphics } from 'pixi.js'
import { BURST_COLORS, lerpColor } from './colors.js'

interface Effect {
  isFinished(): boolean
  render(g: Graphics, arenaHeight: number, currentTurn: number): void
}

class CircleBurst implements Effect {
  private startTurn: number
  private finished = false
  private x: number
  private y: number
  private startRadius: number
  private endRadius: number
  private period: number // duration in game ticks

  constructor(
    x: number,
    y: number,
    startRadius: number,
    endRadius: number,
    period: number,
    startTurn: number
  ) {
    this.x = x
    this.y = y
    this.startRadius = startRadius
    this.endRadius = endRadius
    this.period = period
    this.startTurn = startTurn
  }

  isFinished(): boolean {
    return this.finished
  }

  render(g: Graphics, arenaHeight: number, currentTurn: number): void {
    if (currentTurn < this.startTurn) return

    const dt = currentTurn - this.startTurn
    const t = Math.min(dt / this.period, 1)

    if (dt >= this.period) {
      this.finished = true
      return
    }

    // Calculate radius
    const radius = this.startRadius + (this.endRadius - this.startRadius) * t

    // Calculate color (interpolate through gradient)
    const colorIndex = t * (BURST_COLORS.length - 1)
    const ci = Math.floor(colorIndex)
    const cf = colorIndex - ci
    const colorA = BURST_COLORS[ci]
    const colorB = BURST_COLORS[Math.min(ci + 1, BURST_COLORS.length - 1)]
    const color = lerpColor(colorA, colorB, cf)

    // Calculate alpha (fade out)
    const alpha = 1 - t

    // Transform Y coordinate
    const screenY = arenaHeight - this.y

    g.circle(this.x, screenY, radius)
    g.fill({ color, alpha })
  }
}

class Explosion implements Effect {
  private parts: CircleBurst[] = []

  constructor(
    x: number,
    y: number,
    radius: number,
    period: number,
    numberOfCircles: number,
    startTurn: number
  ) {
    const smallBurstRadius = numberOfCircles === 1 ? radius : radius * 0.75

    for (let i = 0; i < numberOfCircles; i++) {
      let cx = x
      let cy = y

      if (i > 0) {
        // Random offset for subsequent circles
        cx += this.radiusRandom(radius, smallBurstRadius)
        cy += this.radiusRandom(radius, smallBurstRadius)
      }

      // Add slight random delay for each burst (up to 30% of period)
      const delayTicks = Math.floor(Math.random() * period * 0.3)
      this.parts.push(
        new CircleBurst(cx, cy, smallBurstRadius * 0.1, smallBurstRadius, period, startTurn + delayTicks)
      )
    }
  }

  private radiusRandom(radius: number, smallBurstRadius: number): number {
    let r = radius - smallBurstRadius
    r *= 1 - Math.sqrt(Math.random())
    return Math.random() > 0.5 ? r : -r
  }

  isFinished(): boolean {
    return this.parts.length > 0 && this.parts.every(p => p.isFinished())
  }

  render(g: Graphics, arenaHeight: number, currentTurn: number): void {
    for (const part of this.parts) {
      part.render(g, arenaHeight, currentTurn)
    }
  }
}

// Effect manager
const effects: Effect[] = []
let currentTurn = 0

export function setCurrentTurn(turn: number): void {
  currentTurn = turn
}

export function addBotDeathExplosion(x: number, y: number): void {
  // Big explosion: radius 80, period 50 ticks, 15 circles (from original Kotlin)
  effects.push(new Explosion(x, y, 80, 50, 15, currentTurn))
}

export function addBulletHitBotEffect(x: number, y: number): void {
  // Small burst at hit location: 4→40 radius, period 25 ticks (from original Kotlin)
  effects.push(new CircleBurst(x, y, 4, 40, 25, currentTurn))
}

export function addBulletHitWallEffect(x: number, y: number): void {
  // Small burst: 4→40 radius, period 25 ticks (from original Kotlin)
  effects.push(new CircleBurst(x, y, 4, 40, 25, currentTurn))
}

export function addBulletHitBulletEffect(x: number, y: number): void {
  // Small burst between bullets: 4→40 radius, period 25 ticks (from original Kotlin)
  effects.push(new CircleBurst(x, y, 4, 40, 25, currentTurn))
}

export function renderEffects(g: Graphics, arenaHeight: number): void {
  g.clear()

  // Render all effects
  for (const effect of effects) {
    effect.render(g, arenaHeight, currentTurn)
  }

  // Remove finished effects
  for (let i = effects.length - 1; i >= 0; i--) {
    if (effects[i].isFinished()) {
      effects.splice(i, 1)
    }
  }
}

export function clearEffects(): void {
  effects.length = 0
}
