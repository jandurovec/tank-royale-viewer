import './style.css'
import { createConnection } from './connection.js'
import * as ui from './ui.js'

let lastSettings = ui.getSettings()

const connection = createConnection({
  onConnecting: () => ui.setStatus('connecting'),
  onConnected: () => ui.setStatus('live'),
  onDisconnected: () => ui.setStatus('connecting'),
  onError: (msg) => ui.showToast(`Server: ${msg}`),
  onMessage: (_msg) => {
    // Future: handle game messages
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
