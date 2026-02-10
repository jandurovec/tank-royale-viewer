import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { createConnection } from './connection.js'
import * as ui from './ui.js'
import * as renderer from './rendering/index.js'
import * as gameState from './gameState.js'
import * as ratings from './ratings.js'
import type { BotInfo, BotResult } from './ui.js'
import type { BotState, BulletState, GameSetup, Participant } from './gameState.js'

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
let currentBots: BotInfo[] = []
let lastResults: { results: BotResult[]; oldRatings: ReturnType<typeof ui.captureRatingsSnapshot> } | null = null
let battleInProgress = false

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
        battleInProgress = true
        const gameMsg = msg as GameStartedMessage
        const setup = gameMsg.gameSetup
        gameState.setGameSetup(setup)
        gameState.setParticipants(gameMsg.participants || [])
        renderer.setArenaSize(setup.arenaWidth, setup.arenaHeight)
        ui.showBotListMini()
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
        battleInProgress = false
        renderer.hide()
        ui.hideRoundTurn()
        const results = m.results || []
        const state = gameState.getState()
        // Capture old ratings before update for delta display
        const oldRatings = ui.captureRatingsSnapshot(results)
        // Update ratings based on results
        const rankedResults = results.map(r => {
          const p = state.participants.get(r.id)
          return { name: p?.name || '', version: p?.version || '', rank: r.rank }
        }).filter(r => r.name)
        ratings.updateRatings(rankedResults)
        // Refresh bot list with updated tiers
        ui.updateBotList(currentBots)
        // Store for re-render on settings change
        lastResults = { results, oldRatings }
        ui.showResults(results, oldRatings)
        break
      }
      case 'GameAbortedEvent':
        battleInProgress = false
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

ui.onConnectionSettingsChange(() => {
  const settings = ui.getSettings()
  if (settings.url !== lastSettings.url || settings.secret !== lastSettings.secret || !connection.isConnected()) {
    lastSettings = settings
    connection.connect(settings.url, settings.secret)
  }
})

// Subscribe to showRatings changes to re-render tables
ui.onShowRatingsChange(() => {
  // Bot list content can be updated anytime (doesn't change visibility)
  if (currentBots.length > 0) {
    ui.updateBotList(currentBots)
  }
  // Results should only be re-rendered when not in battle (showResults changes visibility)
  if (!battleInProgress && lastResults) {
    ui.showResults(lastResults.results, lastResults.oldRatings)
  }
})

// Initialize renderer
const arenaContainer = document.getElementById('arena')!
renderer.init(arenaContainer).then(() => {
  renderer.hide()
  // Subscribe to scan opacity, logo opacity, and logo size changes
  ui.onScanOpacityChange(renderer.setScanOpacity)
  ui.onLogoOpacityChange(renderer.setLogoOpacity)
  ui.onLogoSizeChange(renderer.setLogoSize)
  connection.connect(lastSettings.url, lastSettings.secret)
})
