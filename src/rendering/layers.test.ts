// @vitest-environment node

import { Container, Graphics } from 'pixi.js'
import { expect, it } from 'vitest'
import { placeTransientLayers } from './layers.js'

it('places bullets above bots and effects above bullets', () => {
  const arena = new Container()
  const bullets = new Graphics()
  const effects = new Graphics()
  const bot = new Container()
  bullets.label = 'bullets'
  effects.label = 'effects'
  bot.label = 'bot'
  arena.addChild(effects, bullets, bot)

  placeTransientLayers(arena, bullets, effects)

  expect(arena.children.map(child => child.label)).toEqual([
    'bot',
    'bullets',
    'effects'
  ])
})
