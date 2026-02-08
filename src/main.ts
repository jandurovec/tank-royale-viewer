import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import { createConnection } from './connection.js'
import * as ui from './ui.js'
import * as renderer from './rendering/index.js'
import * as gameState from './gameState.js'
import type { BotInfo, Participant, BotResult } from './ui.js'
import type { BotState, BulletState, GameSetup } from './gameState.js'

interface TickMessage {
  type: string
  roundNumber: number
  turnNumber: number
  botStates: BotState[]
  bulletStates: BulletState[]
  events: TickEvent[]
}

interface TickEvent {
  type: string
  victimId?: number
  bullet?: { x: number; y: number }
  hitBullet?: { x: number; y: number }
}

interface GameStartedMessage {
  type: string
  gameSetup: GameSetup
  participants: Participant[]
}

let lastSettings = ui.getSettings()
let participants: Participant[] = []

function processTickEvent(event: TickEvent, botStates: BotState[]): void {
  switch (event.type) {
    case 'BotDeathEvent': {
      // Find the bot that died to get its position
      const bot = botStates.find(b => b.id === event.victimId)
      if (bot) {
        renderer.addBotDeathExplosion(bot.x, bot.y)
      }
      break
    }
    case 'BulletHitBotEvent': {
      // Burst at bullet hit location
      if (event.bullet) {
        renderer.addBulletHitBotEffect(event.bullet.x, event.bullet.y)
      }
      break
    }
    case 'BulletHitWallEvent': {
      // Burst at bullet location
      if (event.bullet) {
        renderer.addBulletHitWallEffect(event.bullet.x, event.bullet.y)
      }
      break
    }
    case 'BulletHitBulletEvent': {
      // Burst at midpoint between the two bullets
      if (event.bullet && event.hitBullet) {
        const x = (event.bullet.x + event.hitBullet.x) / 2
        const y = (event.bullet.y + event.hitBullet.y) / 2
        renderer.addBulletHitBulletEffect(x, y)
      }
      break
    }
  }
}

const connection = createConnection({
  onConnecting: () => {
    ui.setStatus('connecting')
    ui.hideBotList()
    ui.hideResults()
    renderer.hide()
    gameState.reset()
    participants = []
  },
  onConnected: () => {
    ui.setStatus('live')
    ui.showBotList()
  },
  onDisconnected: () => {
    ui.setStatus('connecting')
    ui.hideBotList()
    ui.hideResults()
    renderer.hide()
    gameState.reset()
    participants = []
  },
  onError: (msg) => ui.showToast(`Server: ${msg}`),
  onMessage: (msg) => {
    const m = msg as { type: string; bots?: BotInfo[]; results?: BotResult[] }
    switch (m.type) {
      case 'BotListUpdate':
        ui.updateBotList(m.bots || [])
        break
      case 'GameStartedEventForObserver': {
        const gameMsg = msg as GameStartedMessage
        participants = gameMsg.participants || []
        const setup = gameMsg.gameSetup
        gameState.setGameSetup(setup)
        gameState.setParticipants(participants)
        renderer.setArenaSize(setup.arenaWidth, setup.arenaHeight)
        ui.hideBotList()
        ui.hideResults()
        renderer.show()
        break
      }
      case 'RoundStartedEventForObserver': {
        const roundMsg = msg as { roundNumber: number }
        gameState.setRound(roundMsg.roundNumber)
        break
      }
      case 'TickEventForObserver': {
        const tickMsg = msg as TickMessage
        gameState.updateTick(tickMsg.roundNumber, tickMsg.turnNumber, tickMsg.botStates, tickMsg.bulletStates || [])
        // Update effect system's current turn before processing events
        renderer.setCurrentTurn(tickMsg.turnNumber)
        // Process events for effects
        for (const event of tickMsg.events || []) {
          processTickEvent(event, tickMsg.botStates)
        }
        break
      }
      case 'GameEndedEventForObserver':
        renderer.hide()
        ui.showResults(m.results || [], participants)
        break
      case 'GameAbortedEvent':
        renderer.hide()
        gameState.reset()
        ui.showBotList()
        break
    }
  },
  debug: (...args) => {
    if (ui.isDebugEnabled()) console.log(...args)
  }
})

ui.onSettingsToggle(() => ui.toggleSettings())

ui.onSettingsSave(() => {
  const settings = ui.getSettings()
  ui.closeSettings()
  if (settings.url !== lastSettings.url || settings.secret !== lastSettings.secret || !connection.isConnected()) {
    lastSettings = settings
    connection.connect(settings.url, settings.secret)
  }
})

// Initialize renderer
const arenaContainer = document.getElementById('arena')!
renderer.init(arenaContainer).then(() => {
  renderer.hide()
  connection.connect(lastSettings.url, lastSettings.secret)
})
