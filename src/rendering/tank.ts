import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { getState, type BotState } from '../gameState.js'
import { parseColor } from './colors.js'

export const BOT_SIZE = 36

export function createBotGraphics(): Container {
  const container = new Container()

  // Bot body (square)
  const body = new Graphics()
  body.label = 'body'
  container.addChild(body)

  // Direction indicator (line from center to front)
  const direction = new Graphics()
  direction.label = 'direction'
  container.addChild(direction)

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
  const nameStyle = new TextStyle({
    fontSize: 11,
    fill: 0xcccccc,
    fontFamily: 'system-ui, sans-serif'
  })
  const nameText = new Text({ text: '', style: nameStyle })
  nameText.label = 'name'
  nameText.anchor.set(0.5, 0)
  nameText.y = BOT_SIZE / 2 + 4
  container.addChild(nameText)

  return container
}

export function updateBotGraphics(
  container: Container,
  bot: BotState,
  arenaHeight: number
): void {
  // Transform coordinates: Y-flip
  const screenX = bot.x
  const screenY = arenaHeight - bot.y

  container.x = screenX
  container.y = screenY

  // Body rotation: Tank Royale uses degrees counter-clockwise from East
  // PixiJS uses radians clockwise from East
  // Convert: negate angle to flip direction, then convert to radians
  const bodyRotation = -bot.direction * (Math.PI / 180)

  // Update body
  const body = container.getChildByLabel('body') as Graphics
  if (body) {
    body.clear()
    body.rect(-BOT_SIZE / 2, -BOT_SIZE / 2, BOT_SIZE, BOT_SIZE)
    body.fill({ color: parseColor(bot.bodyColor) })
    body.rotation = bodyRotation
  }

  // Update direction indicator
  const direction = container.getChildByLabel('direction') as Graphics
  if (direction) {
    direction.clear()
    direction.moveTo(0, 0)
    direction.lineTo(BOT_SIZE / 2 + 4, 0)
    direction.stroke({ color: 0xffffff, width: 2 })
    direction.rotation = bodyRotation
  }

  // Update energy text
  const energyText = container.getChildByLabel('energy') as Text
  if (energyText) {
    energyText.text = bot.energy.toFixed(1)
  }

  // Update name text
  const nameText = container.getChildByLabel('name') as Text
  if (nameText && nameText.text === '') {
    const gameState = getState()
    const participant = gameState.participants.get(bot.id)
    if (participant) {
      nameText.text = `${participant.name} ${participant.version}`
    }
  }
}
