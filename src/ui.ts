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
const battleContainer = document.getElementById('battle-container')!
const resultsContainer = document.getElementById('results-container')!
const resultsBody = document.querySelector('#results-table tbody')!

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
  botListContainer.classList.remove('mini')
  battleContainer.classList.remove('visible')
  resultsContainer.classList.remove('visible')
}

export function hideBotList(): void {
  botListContainer.classList.remove('visible')
}

export function showBattle(): void {
  botListContainer.classList.remove('visible')
  battleContainer.classList.add('visible')
  resultsContainer.classList.remove('visible')
}

export function hideBattle(): void {
  battleContainer.classList.remove('visible')
}

export interface Participant {
  id: number
  name: string
  version: string
}

export interface BotResult {
  id: number
  rank: number
  totalScore: number
  survival: number
  lastSurvivorBonus: number
  bulletDamage: number
  bulletKillBonus: number
  ramDamage: number
  ramKillBonus: number
  firstPlaces: number
  secondPlaces: number
  thirdPlaces: number
}

export function showResults(results: BotResult[], participants: Participant[]): void {
  battleContainer.classList.remove('visible')
  resultsContainer.classList.add('visible')
  botListContainer.classList.add('visible')
  botListContainer.classList.add('mini')

  const participantMap = new Map(participants.map(p => [p.id, p]))
  const sorted = [...results].sort((a, b) => a.rank - b.rank)

  resultsBody.innerHTML = sorted.map(r => {
    const bot = participantMap.get(r.id)
    const name = bot ? `${bot.name} ${bot.version}` : `Bot #${r.id}`
    return `<tr>
      <td>${r.rank}</td>
      <td>${name}</td>
      <td>${r.totalScore}</td>
      <td>${r.survival}</td>
      <td>${r.lastSurvivorBonus}</td>
      <td>${r.bulletDamage}</td>
      <td>${r.bulletKillBonus}</td>
      <td>${r.ramDamage}</td>
      <td>${r.ramKillBonus}</td>
      <td>${r.firstPlaces}</td>
      <td>${r.secondPlaces}</td>
      <td>${r.thirdPlaces}</td>
    </tr>`
  }).join('')
}

export function hideResults(): void {
  resultsContainer.classList.remove('visible')
}
