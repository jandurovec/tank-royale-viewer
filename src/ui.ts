const toastEl = document.getElementById('toast')!
const statusEl = document.getElementById('status')!
const settingsBtn = document.getElementById('settings-btn')!
const settingsPanel = document.getElementById('settings-panel')!
const serverUrlInput = document.getElementById('server-url') as HTMLInputElement
const serverSecretInput = document.getElementById('server-secret') as HTMLInputElement
const debugLogCheckbox = document.getElementById('debug-log') as HTMLInputElement
const saveBtn = document.getElementById('save-btn')!
const botListContainer = document.getElementById('bot-list-container')!
const botListBody = document.querySelector('#bot-list tbody')!

let toastTimeout: number | null = null

export function setStatus(state: 'connecting' | 'live'): void {
  statusEl.textContent = state === 'live' ? 'LIVE' : 'Connecting...'
  statusEl.className = state
}

export function showToast(message: string): void {
  if (toastTimeout) clearTimeout(toastTimeout)
  toastEl.textContent = message
  toastEl.classList.add('show')
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show')
  }, 5000) as unknown as number
}

export interface Settings {
  url: string
  secret: string
}

export function getSettings(): Settings {
  return {
    url: serverUrlInput.value,
    secret: serverSecretInput.value
  }
}

export function isDebugEnabled(): boolean {
  return debugLogCheckbox.checked
}

export function closeSettings(): void {
  settingsPanel.classList.remove('open')
}

export function onSettingsToggle(callback: () => void): void {
  settingsBtn.onclick = callback
}

export function onSettingsSave(callback: () => void): void {
  saveBtn.onclick = callback
}

export function toggleSettings(): void {
  settingsPanel.classList.toggle('open')
}

export interface BotInfo {
  name: string
  version: string
  authors: string[]
  countryCodes?: string[]
}

export function updateBotList(bots: BotInfo[]): void {
  botListContainer.classList.toggle('empty', bots.length === 0)
  const sorted = [...bots].sort((a, b) => a.name.localeCompare(b.name))
  botListBody.innerHTML = sorted.map(bot => {
    const codes = bot.countryCodes || []
    const authors = bot.authors
    const authorParts: string[] = []

    for (let i = 0; i < Math.max(codes.length, authors.length); i++) {
      const flag = codes[i] ? `<span class="bot-flag fi fi-${codes[i].toLowerCase()}"></span>` : ''
      const name = authors[i] || ''
      authorParts.push(flag + name)
    }

    return `<tr>
      <td><span class="bot-name">${bot.name} ${bot.version}</span></td>
      <td>${authorParts.join(', ')}</td>
    </tr>`
  }).join('')
}

export function showBotList(): void {
  botListContainer.classList.add('visible')
}

export function hideBotList(): void {
  botListContainer.classList.remove('visible')
}
