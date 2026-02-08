import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import { createConnection } from './connection.js'
import * as ui from './ui.js'
import * as renderer from './rendering/index.js'
import * as gameState from './gameState.js'
import * as ratings from './ratings.js'
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
let currentBots: BotInfo[] = []
let lastResults: { results: BotResult[]; participants: Participant[]; oldRatings: ReturnType<typeof ui.captureRatingsSnapshot> } | null = null

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
        currentBots = m.bots || []
        ui.updateBotList(currentBots)
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
        ui.showRoundTurn(1, 0)
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
        // Update round/turn display
        ui.showRoundTurn(tickMsg.roundNumber, tickMsg.turnNumber)
        // Process events for effects
        for (const event of tickMsg.events || []) {
          processTickEvent(event, tickMsg.botStates)
        }
        break
      }
      case 'GameEndedEventForObserver': {
        renderer.hide()
        ui.hideRoundTurn()
        const results = m.results || []
        // Capture old ratings before update for delta display
        const oldRatings = ui.captureRatingsSnapshot(results, participants)
        // Update ratings based on results
        const rankedResults = results.map(r => {
          const p = participants.find(p => p.id === r.id)
          return { name: p?.name || '', version: p?.version || '', rank: r.rank }
        }).filter(r => r.name)
        ratings.updateRatings(rankedResults)
        // Store for re-render on settings change
        lastResults = { results, participants, oldRatings }
        ui.showResults(results, participants, oldRatings)
        break
      }
      case 'GameAbortedEvent':
        renderer.hide()
        ui.hideRoundTurn()
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
  ui.saveCurrentSettings()
  const settings = ui.getSettings()
  ui.closeSettings()
  if (settings.url !== lastSettings.url || settings.secret !== lastSettings.secret || !connection.isConnected()) {
    lastSettings = settings
    connection.connect(settings.url, settings.secret)
  }
})

// Subscribe to showRatings changes to re-render tables
ui.onShowRatingsChange(() => {
  if (currentBots.length > 0) {
    ui.updateBotList(currentBots)
  }
  if (lastResults) {
    ui.showResults(lastResults.results, lastResults.participants, lastResults.oldRatings)
  }
})

// Initialize renderer
const arenaContainer = document.getElementById('arena')!
renderer.init(arenaContainer).then(() => {
  renderer.hide()
  // Subscribe to scan opacity changes
  ui.onScanOpacityChange(renderer.setScanOpacity)
  connection.connect(lastSettings.url, lastSettings.secret)
})
