import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { createConnection } from './connection.js'
import * as ui from './ui.js'
import * as gameState from './gameState.js'
import * as ratings from './ratings.js'
import { purgeInactiveTeams } from './teamColors.js'
import { prepareResults } from './resultPreparation.js'
import type { BotInfo } from './ui.js'
import type { BotState, BulletState, GameSetup, Participant } from './gameState.js'
import type { BattleResult, PreparedResult } from './resultPreparation.js'

// PixiJS is large (~580 kB). Loading the rendering module dynamically lets
// Vite split it into a separate chunk that downloads in parallel with the
// main bundle, shrinking the initial JS that the browser must parse.
const renderer = await import('./rendering/index.js')

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

interface GameEndedMessage {
  type: string
  results: BattleResult[]
}

let lastSettings = ui.getSettings()
let currentBots: BotInfo[] = []
let lastResults: { results: PreparedResult[]; oldRatings: ReturnType<typeof ui.captureRatingsSnapshot> } | null = null
let battleInProgress = false

function clearBattleState(): void {
  battleInProgress = false
  lastResults = null
  ui.hideResults()
  ui.hideRoundTurn()
  renderer.hide()
  gameState.reset()
}

function clearConnectionState(): void {
  clearBattleState()
  currentBots = []
  purgeInactiveTeams([])
  ui.updateBotList(currentBots)
  ui.hideBotList()
}

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
    clearConnectionState()
  },
  onConnected: () => {
    ui.setStatus('live')
    ui.showBotList()
  },
  onDisconnected: () => {
    ui.setStatus('connecting')
    clearConnectionState()
  },
  onError: (msg) => ui.showToast(`Server: ${msg}`),
  onMessage: (msg) => {
    const m = msg as { type: string; bots?: BotInfo[] }
    switch (m.type) {
      case 'BotListUpdate': {
        currentBots = m.bots || []
        // Purge colors for teams that are no longer connected
        const activeTeamIds = [...new Set(currentBots.map(b => b.teamId).filter((id): id is number => id !== undefined))]
        purgeInactiveTeams(activeTeamIds)
        ui.updateBotList(currentBots)
        break
      }
      case 'GameStartedEventForObserver': {
        clearBattleState()
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
      case 'RoundStartedEvent': {
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
        const gameEndedMsg = msg as GameEndedMessage
        const results = prepareResults(
          gameEndedMsg.results || [],
          gameState.getState().participants.values()
        )
        // Capture old ratings before update for delta display
        const oldRatings = ui.captureRatingsSnapshot(results)
        ratings.updateRatings(results.map(result => ({
          name: result.name,
          version: result.version,
          rank: result.placement
        })))
        // Refresh bot list with updated tiers
        ui.updateBotList(currentBots)
        // Store for re-render on settings change
        lastResults = { results, oldRatings }
        ui.showResults(results, oldRatings)
        break
      }
      case 'GameAbortedEvent':
        clearBattleState()
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
