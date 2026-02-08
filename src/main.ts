import './style.css'
import 'flag-icons/css/flag-icons.min.css'
import { createConnection } from './connection.js'
import * as ui from './ui.js'
import type { BotInfo } from './ui.js'

let lastSettings = ui.getSettings()

const connection = createConnection({
  onConnecting: () => {
    ui.setStatus('connecting')
    ui.hideBotList()
  },
  onConnected: () => {
    ui.setStatus('live')
    ui.showBotList()
  },
  onDisconnected: () => {
    ui.setStatus('connecting')
    ui.hideBotList()
  },
  onError: (msg) => ui.showToast(`Server: ${msg}`),
  onMessage: (msg) => {
    const m = msg as { type: string; bots?: BotInfo[] }
    if (m.type === 'BotListUpdate' && m.bots) {
      ui.updateBotList(m.bots)
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
