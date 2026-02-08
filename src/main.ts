import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import { createConnection } from './connection.js'
import * as ui from './ui.js'
import type { BotInfo, Participant, BotResult } from './ui.js'

let lastSettings = ui.getSettings()
let participants: Participant[] = []

const connection = createConnection({
  onConnecting: () => {
    ui.setStatus('connecting')
    ui.hideBotList()
    ui.hideBattle()
    ui.hideResults()
    participants = []
  },
  onConnected: () => {
    ui.setStatus('live')
    ui.showBotList()
  },
  onDisconnected: () => {
    ui.setStatus('connecting')
    ui.hideBotList()
    ui.hideBattle()
    ui.hideResults()
    participants = []
  },
  onError: (msg) => ui.showToast(`Server: ${msg}`),
  onMessage: (msg) => {
    const m = msg as { type: string; bots?: BotInfo[]; participants?: Participant[]; results?: BotResult[] }
    switch (m.type) {
      case 'BotListUpdate':
        ui.updateBotList(m.bots || [])
        break
      case 'GameStartedEventForObserver':
        participants = m.participants || []
        ui.showBattle()
        break
      case 'GameEndedEventForObserver':
        ui.showResults(m.results || [], participants)
        break
      case 'GameAbortedEvent':
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

connection.connect(lastSettings.url, lastSettings.secret)
