import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { getState, type BotState } from '../gameState.js'
import {
  parseColor,
  borderColor,
  addLight,
  multLight,
  DEFAULT_BODY_COLOR,
  DEFAULT_TURRET_COLOR,
  DEFAULT_RADAR_COLOR,
  DEFAULT_TRACKS_COLOR,
  DEFAULT_GUN_COLOR,
  DEFAULT_SCAN_COLOR
} from './colors.js'

// Virtual coordinate space is 500 units, scaled to 36 pixels (matching original Kotlin)
const BOT_SIZE = 36
const SCALE = BOT_SIZE / 500

// Convert Kotlin coordinates to our space
const S = (v: number) => v * SCALE

// Scan arc opacity (configurable to reduce flickering)
let scanOpacity = 0.05

export function setScanOpacity(opacity: number): void {
  scanOpacity = opacity
}


export function createBotGraphics(): Container {
  const container = new Container()

  // Scan arc (drawn first, behind everything)
  const scanArc = new Graphics()
  scanArc.label = 'scanArc'
  container.addChild(scanArc)

  // Tank body container (rotates with body direction)
  const bodyContainer = new Container()
  bodyContainer.label = 'bodyContainer'
  container.addChild(bodyContainer)

  // Tracks (part of body)
  const tracks = new Graphics()
  tracks.label = 'tracks'
  bodyContainer.addChild(tracks)

  // Body
  const body = new Graphics()
  body.label = 'body'
  bodyContainer.addChild(body)

  // Turret container (rotates with gun direction)
  const turretContainer = new Container()
  turretContainer.label = 'turretContainer'
  container.addChild(turretContainer)

  // Gun
  const gun = new Graphics()
  gun.label = 'gun'
  turretContainer.addChild(gun)

  // Turret
  const turret = new Graphics()
  turret.label = 'turret'
  turretContainer.addChild(turret)

  // Radar (rotates with radar direction)
  const radar = new Graphics()
  radar.label = 'radar'
  container.addChild(radar)

  // Energy text (above bot)
  const energyStyle = new TextStyle({
    fontSize: 12,
    fill: 0xffffff,
    fontFamily: 'system-ui, sans-serif'
  })
  const energyText = new Text({ text: '', style: energyStyle })
  energyText.label = 'energy'
  energyText.anchor.set(0.5, 1)
  energyText.y = -BOT_SIZE / 2 - 4
  container.addChild(energyText)

  // Name text (below bot)
  const labelStyle = new TextStyle({
    fontSize: 11,
    fill: 0xcccccc,
    fontFamily: 'system-ui, sans-serif'
  })
  const nameText = new Text({ text: '', style: labelStyle })
  nameText.label = 'name'
  nameText.anchor.set(0.5, 0)
  nameText.y = BOT_SIZE / 2 + 4
  container.addChild(nameText)

  // Team name text (below bot name, only shown if bot is in a team)
  const teamText = new Text({ text: '', style: labelStyle.clone() })
  teamText.label = 'teamName'
  teamText.anchor.set(0.5, 0)
  teamText.y = BOT_SIZE / 2 + 17
  teamText.style.fontSize = 10
  container.addChild(teamText)

  // Health bar (below name or team name)
  const healthBar = new Graphics()
  healthBar.label = 'healthBar'
  healthBar.y = BOT_SIZE / 2 + 17
  container.addChild(healthBar)

  return container
}

export interface TeamInfo {
  teamName: string
  teamColor: number
}

export function updateBotGraphics(
  container: Container,
  bot: BotState,
  arenaHeight: number,
  teamInfo?: TeamInfo
): void {
  // Transform coordinates: Y-flip
  container.x = bot.x
  container.y = arenaHeight - bot.y

  // Get colors
  const bodyColor = parseColor(bot.bodyColor, DEFAULT_BODY_COLOR)
  const turretColor = parseColor(bot.turretColor, DEFAULT_TURRET_COLOR)
  const radarColor = parseColor(bot.radarColor, DEFAULT_RADAR_COLOR)
  const tracksColor = parseColor(bot.tracksColor, DEFAULT_TRACKS_COLOR)
  const gunColor = parseColor(bot.gunColor, DEFAULT_GUN_COLOR)
  const scanColor = parseColor(bot.scanColor, DEFAULT_SCAN_COLOR)

  // Body rotation: Tank Royale uses degrees counter-clockwise from East
  // PixiJS uses radians clockwise from East, and Kotlin adds 180° offset
  const bodyRotation = (-bot.direction + 180) * (Math.PI / 180)
  const gunRotation = (-bot.gunDirection + 180) * (Math.PI / 180)
  const radarRotation = (-bot.radarDirection + 180) * (Math.PI / 180)

  // Update body container rotation
  const bodyContainer = container.getChildByLabel('bodyContainer') as Container
  if (bodyContainer) {
    bodyContainer.rotation = bodyRotation
    drawTracks(bodyContainer.getChildByLabel('tracks') as Graphics, tracksColor)
    drawBody(bodyContainer.getChildByLabel('body') as Graphics, bodyColor)
  }

  // Update turret container rotation
  const turretContainer = container.getChildByLabel('turretContainer') as Container
  if (turretContainer) {
    turretContainer.rotation = gunRotation
    drawGun(turretContainer.getChildByLabel('gun') as Graphics, gunColor)
    drawTurret(turretContainer.getChildByLabel('turret') as Graphics, turretColor)
  }

  // Update radar
  if (!bot.isDroid) {
    const radar = container.getChildByLabel('radar') as Graphics
    if (radar) {
      radar.rotation = radarRotation
      drawRadar(radar, radarColor)
    }
  }

  // Update scan arc
  const scanArc = container.getChildByLabel('scanArc') as Graphics
  if (scanArc) {
    drawScanArc(scanArc, bot, scanColor)
  }

  // Update health bar
  const healthBar = container.getChildByLabel('healthBar') as Graphics
  if (healthBar) {
    drawHealthBar(healthBar, bot.energy, bot.isDroid)
  }

  // Update energy text
  const energyText = container.getChildByLabel('energy') as Text
  if (energyText) {
    energyText.text = bot.energy.toFixed(1)
  }

  // Update name text based on current participant
  const nameText = container.getChildByLabel('name') as Text
  if (nameText) {
    const gameState = getState()
    const participant = gameState.participants.get(bot.id)
    const expectedName = participant ? `${participant.name} ${participant.version}` : ''
    if (nameText.text !== expectedName) {
      nameText.text = expectedName
    }
  }

  // Update team name text
  const teamText = container.getChildByLabel('teamName') as Text
  if (teamText) {
    if (teamInfo) {
      teamText.text = teamInfo.teamName
      teamText.style.fill = teamInfo.teamColor
      teamText.visible = true
      if (healthBar) healthBar.y = BOT_SIZE / 2 + 29
    } else {
      teamText.text = ''
      teamText.visible = false
      if (healthBar) healthBar.y = BOT_SIZE / 2 + 17
    }
  }
}

function drawBody(g: Graphics, bodyColor: number): void {
  g.clear()

  // Body rect: -210 to 210 x, -160 to 160 y in Kotlin coords
  g.rect(S(-210), S(-160), S(420), S(320))
  g.fill({ color: bodyColor })

  // Body shadow (right side)
  g.rect(S(120), S(-160), S(90), S(320))
  g.fill({ color: 0x000000, alpha: 0.25 })

  // Body border
  g.roundRect(S(-210), S(-160), S(420), S(320), S(20))
  g.stroke({ color: borderColor(bodyColor), width: S(20) })
}

function drawTracks(g: Graphics, tracksColor: number): void {
  g.clear()

  // Left track at y = -250
  drawSingleTrack(g, S(-300), S(-250), tracksColor)

  // Right track at y = 115
  drawSingleTrack(g, S(-300), S(115), tracksColor)
}

function drawSingleTrack(g: Graphics, x: number, y: number, tracksColor: number): void {
  const tracksDark = multLight(tracksColor, 0.6)

  // Main track background
  g.rect(x + S(75), y + S(20), S(450), S(95))
  g.fill({ color: tracksDark })
  g.rect(x + S(75), y + S(20), S(450), S(95))
  g.stroke({ color: borderColor(tracksDark), width: S(10) })

  // Static track links (no animation)
  drawLink0(g, x + S(7), y, tracksColor)
  drawLink0(g, x + S(87), y, tracksColor)
  drawLink0(g, x + S(167), y, tracksColor)
  drawLink0(g, x + S(247), y, tracksColor)
  drawLink0(g, x + S(327), y, tracksColor)
  drawLink0(g, x + S(407), y, tracksColor)
}

function drawLink0(g: Graphics, x: number, y: number, tracksColor: number): void {
  // Highlight
  g.rect(x + S(55), y + S(5), S(25), S(125))
  g.fill({ color: addLight(tracksColor, 0.3) })

  // Main link
  g.roundRect(x + S(70), y + S(10), S(35), S(116), S(20))
  g.fill({ color: tracksColor })

  // Border
  g.roundRect(x + S(55), y + S(5), S(50), S(125), S(20))
  g.stroke({ color: borderColor(tracksColor), width: S(10) })
}


function drawGun(g: Graphics, gunColor: number): void {
  g.clear()

  const cannonLight = addLight(gunColor, 0.1)
  const cannonDark = addLight(gunColor, -0.3)

  // Cannon thick part (closer to turret)
  // Top half (dark to light)
  g.rect(S(-160), S(-40), S(80), S(40))
  g.fill({ color: cannonDark })
  // Bottom half (light to dark)
  g.rect(S(-160), S(0), S(80), S(40))
  g.fill({ color: cannonLight })
  // Border
  g.rect(S(-160), S(-40), S(80), S(80))
  g.stroke({ color: borderColor(gunColor), width: 1 })

  // Cannon long part (barrel)
  // Top half
  g.rect(S(-330), S(-25), S(170), S(25))
  g.fill({ color: cannonDark })
  // Bottom half
  g.rect(S(-330), S(0), S(170), S(25))
  g.fill({ color: cannonLight })
  // Border
  g.rect(S(-330), S(-25), S(170), S(50))
  g.stroke({ color: borderColor(cannonDark), width: 1 })
}

function drawTurret(g: Graphics, turretColor: number): void {
  g.clear()

  // Turret rect
  g.rect(S(-80), S(-100), S(200), S(200))
  g.fill({ color: turretColor })

  // Turret shadow (right side)
  g.rect(S(60), S(-100), S(50), S(200))
  g.fill({ color: 0x000000, alpha: 0.37 })

  // Turret border
  g.roundRect(S(-80), S(-100), S(200), S(200), S(20))
  g.stroke({ color: borderColor(turretColor), width: S(20) })
}

function drawRadar(g: Graphics, radarColor: number): void {
  g.clear()

  // Center circle
  g.circle(0, 0, S(30))
  g.fill({ color: radarColor })
  g.circle(0, 0, S(30))
  g.stroke({ color: borderColor(radarColor), width: 1 })

  // Radar dish (curved shape pointing left in local coords)
  // Using a simple triangle approximation of the quadratic curve
  g.moveTo(S(20), S(-110))
  g.quadraticCurveTo(S(120), 0, S(20), S(110))
  g.lineTo(S(20), S(-110))
  g.fill({ color: radarColor })

  g.moveTo(S(20), S(-110))
  g.quadraticCurveTo(S(120), 0, S(20), S(110))
  g.stroke({ color: borderColor(radarColor), width: 1 })
}

function drawScanArc(g: Graphics, bot: BotState, scanColor: number): void {
  g.clear()

  if (bot.isDroid) return // Droids have no radar

  const radarSweep = bot.radarSweep || 0
  // Radius 1200 game units (scan arc is in game coordinates, not tank's internal 500-unit space)
  const radius = 1200

  if (Math.abs(radarSweep) < 0.5) {
    // Very small sweep - draw as line
    // Tank Royale: 0° = East, counter-clockwise positive
    // Screen coords: Y is flipped, so negate angle
    const radarRad = -bot.radarDirection * (Math.PI / 180)
    g.moveTo(0, 0)
    g.lineTo(Math.cos(radarRad) * radius, Math.sin(radarRad) * radius)
    g.stroke({ color: scanColor, width: 1, alpha: scanOpacity })
  } else {
    // Draw arc/pie slice
    // Convert angles for screen coordinates (Y-flipped)
    let startAngle = -bot.radarDirection * (Math.PI / 180)
    let sweep = -radarSweep * (Math.PI / 180)

    // Normalize: ensure we draw the smaller arc
    if (sweep < 0) {
      startAngle += sweep
      sweep = -sweep
    }

    const endAngle = startAngle + sweep

    g.moveTo(0, 0)
    g.lineTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius)
    g.arc(0, 0, radius, startAngle, endAngle, false)
    g.lineTo(0, 0)
    g.fill({ color: scanColor, alpha: scanOpacity })
  }
}

function drawHealthBar(g: Graphics, energy: number, isDroid?: boolean): void {
  g.clear()

  const maxEnergy = isDroid ? 120 : 100
  const healthPercent = Math.max(0, Math.min(1, energy / maxEnergy))

  if (healthPercent <= 0) return

  // Bar dimensions: full width = BOT_SIZE, height = 2px
  const fullWidth = BOT_SIZE
  const barWidth = fullWidth * healthPercent
  const barHeight = 2

  // Center the bar horizontally, shrinking towards center
  const x = -barWidth / 2

  // Color gradient: green (100%) -> yellow (50%) -> red (0%)
  const color = getHealthColor(healthPercent)

  g.rect(x, 0, barWidth, barHeight)
  g.fill({ color })
}

function getHealthColor(percent: number): number {
  // Green to yellow to red gradient
  let r: number, g: number, b: number

  if (percent > 0.5) {
    // Green to yellow (100% -> 50%)
    const t = (percent - 0.5) * 2 // 1 at 100%, 0 at 50%
    r = Math.round(255 * (1 - t))
    g = 255
    b = 0
  } else {
    // Yellow to red (50% -> 0%)
    const t = percent * 2 // 1 at 50%, 0 at 0%
    r = 255
    g = Math.round(255 * t)
    b = 0
  }

  return (r << 16) | (g << 8) | b
}
