import javaSvg from './assets/java.svg'
import pythonSvg from './assets/python.svg'
import dotnetSvg from './assets/dotnet.svg'
import nodejsSvg from './assets/nodejs.svg'
import tierScrapPng from './assets/tier-scrap.png'
import tierRookiePng from './assets/tier-rookie.png'
import tierVeteranPng from './assets/tier-veteran.png'
import tierElitePng from './assets/tier-elite.png'
import tierUnrankedPng from './assets/tier-unranked.png'
import tierLegendPng from './assets/tier-legend.png'
import * as settings from './settings.js'
import * as ratings from './ratings.js'
import * as logoStorage from './logoStorage.js'
import { getTeamColor } from './teamColors.js'
import type { BotTier } from './ratings.js'
import type { PreparedResult } from './resultPreparation.js'
import type { Theme } from './settings.js'

const toastEl = document.getElementById('toast')!
const statusBarEl = document.getElementById('status-bar')!
const statusEl = document.getElementById('status')!
const roundInfoEl = document.getElementById('round-info')!
const turnInfoEl = document.getElementById('turn-info')!
const settingsBtn = document.getElementById('settings-btn')!
const settingsPanel = document.getElementById('settings-panel')!
const themeBtn = document.getElementById('theme-btn')!
const serverUrlInput = document.getElementById('server-url') as HTMLInputElement
const serverSecretInput = document.getElementById('server-secret') as HTMLInputElement
const showRatingsCheckbox = document.getElementById('show-ratings') as HTMLInputElement
const debugLogCheckbox = document.getElementById('debug-log') as HTMLInputElement
const scanOpacitySlider = document.getElementById('scan-opacity') as HTMLInputElement
const scanOpacityValue = document.getElementById('scan-opacity-value')!
const exportRatingsBtn = document.getElementById('export-ratings-btn')!
const importRatingsBtn = document.getElementById('import-ratings-btn')!
const resetRatingsBtn = document.getElementById('reset-ratings-btn')!
const importRatingsFile = document.getElementById('import-ratings-file') as HTMLInputElement
const rankedGamesThresholdInput = document.getElementById('ranked-games-threshold') as HTMLInputElement
const provisionalGamesThresholdInput = document.getElementById('provisional-games-threshold') as HTMLInputElement
const ratingAlgorithmSelect = document.getElementById('rating-algorithm') as HTMLSelectElement
const ratingMuInput = document.getElementById('rating-mu') as HTMLInputElement
const ratingSigmaInput = document.getElementById('rating-sigma') as HTMLInputElement
const ratingBetaInput = document.getElementById('rating-beta') as HTMLInputElement
const ratingTauInput = document.getElementById('rating-tau') as HTMLInputElement
const uploadLogoBtn = document.getElementById('upload-logo-btn')!
const clearLogoBtn = document.getElementById('clear-logo-btn') as HTMLButtonElement
const logoOpacitySlider = document.getElementById('logo-opacity') as HTMLInputElement
const logoOpacityValue = document.getElementById('logo-opacity-value')!
const logoSizeSlider = document.getElementById('logo-size') as HTMLInputElement
const logoSizeValue = document.getElementById('logo-size-value')!
const uploadLogoFile = document.getElementById('upload-logo-file') as HTMLInputElement
const showBattleEventFeedCheckbox = document.getElementById('show-battle-event-feed') as HTMLInputElement
const battleFeedEventOptions = document.getElementById('battle-feed-event-options') as HTMLFieldSetElement
const showRoundWinnerEventsCheckbox = document.getElementById('show-round-winner-events') as HTMLInputElement
const showAggregateLeadEventsCheckbox = document.getElementById('show-aggregate-lead-events') as HTMLInputElement
const showEliminationEventsCheckbox = document.getElementById('show-elimination-events') as HTMLInputElement
const showBulletHitEventsCheckbox = document.getElementById('show-bullet-hit-events') as HTMLInputElement
const showRammingEventsCheckbox = document.getElementById('show-ramming-events') as HTMLInputElement

let scanOpacityCallback: ((opacity: number) => void) | null = null
let logoOpacityCallback: ((opacity: number) => void) | null = null
let logoSizeCallback: ((size: number) => void) | null = null
let showRatingsCallback: ((show: boolean) => void) | null = null
let connectionSettingsCallback: (() => void) | null = null
let battleFeedSettingsCallback: (() => void) | null = null

// Icon and tooltip both describe what clicking will do next — sun + "Switch
// to light theme" while currently dark, moon + "Switch to dark theme" while
// currently light. Common modern convention.
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  if (theme === 'dark') {
    themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>'
    themeBtn.setAttribute('data-tooltip', 'Switch to light theme')
  } else {
    themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>'
    themeBtn.setAttribute('data-tooltip', 'Switch to dark theme')
  }
}

applyTheme(settings.get().theme)

themeBtn.addEventListener('click', () => {
  const next: Theme = settings.get().theme === 'dark' ? 'light' : 'dark'
  settings.save({ theme: next })
  applyTheme(next)
})

// Ratings export/import/reset handlers
exportRatingsBtn.addEventListener('click', () => {
  const json = ratings.exportRatings()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tank-royale-ratings.json'
  a.click()
  URL.revokeObjectURL(url)
})

importRatingsBtn.addEventListener('click', () => {
  importRatingsFile.click()
})

importRatingsFile.addEventListener('change', () => {
  const file = importRatingsFile.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const json = reader.result as string
    const success = ratings.importRatings(json)
    if (success) {
      showToast('Ratings imported successfully', 'success')
    } else {
      showToast('Failed to import ratings: invalid JSON format')
    }
  }
  reader.onerror = () => {
    showToast('Failed to read file')
  }
  reader.readAsText(file)

  // Reset file input so same file can be re-imported
  importRatingsFile.value = ''
})

resetRatingsBtn.addEventListener('click', () => {
  if (confirm('Reset all skill ratings? This cannot be undone.')) {
    ratings.resetRatings()
    showToast('All ratings have been reset', 'success')
  }
})

// Logo opacity slider
logoOpacitySlider.addEventListener('input', () => {
  const value = parseInt(logoOpacitySlider.value, 10)
  logoOpacityValue.textContent = `${value}%`
  settings.save({ logoOpacity: value })
  if (logoOpacityCallback) {
    logoOpacityCallback(value / 100)
  }
})

// Logo size slider
logoSizeSlider.addEventListener('input', () => {
  const value = parseInt(logoSizeSlider.value, 10)
  logoSizeValue.textContent = `${value}%`
  settings.save({ logoSize: value })
  if (logoSizeCallback) {
    logoSizeCallback(value / 100)
  }
})

function updateClearLogoButton(): void {
  const hasLogo = logoStorage.getLogo() !== null
  clearLogoBtn.disabled = !hasLogo
}

// Logo upload/clear handlers
uploadLogoBtn.addEventListener('click', () => {
  uploadLogoFile.click()
})

uploadLogoFile.addEventListener('change', () => {
  const file = uploadLogoFile.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    const success = logoStorage.saveLogo(base64)
    if (success) {
      showToast('Logo uploaded', 'success')
      updateClearLogoButton()
    } else {
      showToast('Failed to save logo (storage quota exceeded?)')
    }
  }
  reader.onerror = () => {
    showToast('Failed to read file')
  }
  reader.readAsDataURL(file)
  uploadLogoFile.value = ''
})

clearLogoBtn.addEventListener('click', () => {
  logoStorage.clearLogo()
  showToast('Logo removed', 'success')
  updateClearLogoButton()
})

updateClearLogoButton()

// Initialize form values from saved settings
function initSettingsForm(): void {
  const s = settings.get()
  serverUrlInput.value = s.url
  serverSecretInput.value = s.secret
  showRatingsCheckbox.checked = s.showRatings
  debugLogCheckbox.checked = s.debug
  scanOpacitySlider.value = String(s.scanOpacity)
  scanOpacityValue.textContent = `${s.scanOpacity}%`
  logoOpacitySlider.value = String(s.logoOpacity)
  logoOpacityValue.textContent = `${s.logoOpacity}%`
  logoSizeSlider.value = String(s.logoSize)
  logoSizeValue.textContent = `${s.logoSize}%`
  rankedGamesThresholdInput.value = String(s.rankedGamesThreshold)
  provisionalGamesThresholdInput.value = String(s.provisionalGamesThreshold)
  ratingAlgorithmSelect.value = s.ratingAlgorithm
  ratingMuInput.value = String(s.ratingMu)
  ratingSigmaInput.value = String(s.ratingSigma)
  ratingBetaInput.value = String(s.ratingBeta)
  ratingTauInput.value = String(s.ratingTau)
  showBattleEventFeedCheckbox.checked = s.showBattleEventFeed
  showRoundWinnerEventsCheckbox.checked = s.showRoundWinnerEvents
  showAggregateLeadEventsCheckbox.checked = s.showAggregateLeadEvents
  showEliminationEventsCheckbox.checked = s.showEliminationEvents
  showBulletHitEventsCheckbox.checked = s.showBulletHitEvents
  showRammingEventsCheckbox.checked = s.showRammingEvents
  battleFeedEventOptions.disabled = !s.showBattleEventFeed
}

initSettingsForm()

// Live update for scan opacity slider
scanOpacitySlider.addEventListener('input', () => {
  const value = parseInt(scanOpacitySlider.value, 10)
  scanOpacityValue.textContent = `${value}%`
  settings.save({ scanOpacity: value })
  if (scanOpacityCallback) {
    scanOpacityCallback(value / 100)
  }
})

// Live update for server URL
serverUrlInput.addEventListener('change', () => {
  settings.save({ url: serverUrlInput.value })
  if (connectionSettingsCallback) {
    connectionSettingsCallback()
  }
})

// Live update for server secret
serverSecretInput.addEventListener('change', () => {
  settings.save({ secret: serverSecretInput.value })
  if (connectionSettingsCallback) {
    connectionSettingsCallback()
  }
})

// Live update for debug logging
debugLogCheckbox.addEventListener('change', () => {
  settings.save({ debug: debugLogCheckbox.checked })
})

// Live update for show ratings checkbox
showRatingsCheckbox.addEventListener('change', () => {
  // Save immediately so settings.get() returns current value
  settings.save({ showRatings: showRatingsCheckbox.checked })
  if (showRatingsCallback) {
    showRatingsCallback(showRatingsCheckbox.checked)
  }
})

showBattleEventFeedCheckbox.addEventListener('change', () => {
  settings.save({ showBattleEventFeed: showBattleEventFeedCheckbox.checked })
  battleFeedEventOptions.disabled = !showBattleEventFeedCheckbox.checked
  battleFeedSettingsCallback?.()
})

const battleFeedEventCheckboxes = [
  showRoundWinnerEventsCheckbox,
  showAggregateLeadEventsCheckbox,
  showEliminationEventsCheckbox,
  showBulletHitEventsCheckbox,
  showRammingEventsCheckbox
]

for (const checkbox of battleFeedEventCheckboxes) {
  checkbox.addEventListener('change', () => {
    settings.save({
      showRoundWinnerEvents: showRoundWinnerEventsCheckbox.checked,
      showAggregateLeadEvents: showAggregateLeadEventsCheckbox.checked,
      showEliminationEvents: showEliminationEventsCheckbox.checked,
      showBulletHitEvents: showBulletHitEventsCheckbox.checked,
      showRammingEvents: showRammingEventsCheckbox.checked
    })
    battleFeedSettingsCallback?.()
  })
}

// Live update for ranked games threshold
rankedGamesThresholdInput.addEventListener('change', () => {
  const value = parseInt(rankedGamesThresholdInput.value, 10) || 20
  settings.save({ rankedGamesThreshold: value })
  // Trigger UI refresh via showRatings callback (same UI elements affected)
  if (showRatingsCallback) {
    showRatingsCallback(showRatingsCheckbox.checked)
  }
})

// Live update for provisional games threshold
provisionalGamesThresholdInput.addEventListener('change', () => {
  const value = parseInt(provisionalGamesThresholdInput.value, 10) || 50
  settings.save({ provisionalGamesThreshold: value })
  ratings.invalidateTierCache() // Threshold affects which bots are used for percentile calculation
  if (showRatingsCallback) {
    showRatingsCallback(showRatingsCheckbox.checked)
  }
})

// Rating algorithm and parameter inputs
const RATING_SETUP_WARNING = 'Rating setup has changed. Resetting stored ratings is strongly recommended.'
const defaults = settings.getDefaults()

ratingAlgorithmSelect.addEventListener('change', () => {
  const value = ratingAlgorithmSelect.value === 'trueskill' ? 'trueskill' : 'openskill'
  settings.save({ ratingAlgorithm: value })
  ratings.invalidateTierCache()
  showToast(RATING_SETUP_WARNING, 'warning')
  if (showRatingsCallback) {
    showRatingsCallback(showRatingsCheckbox.checked)
  }
})

ratingMuInput.addEventListener('change', () => {
  const value = parseFloat(ratingMuInput.value) || defaults.ratingMu
  settings.save({ ratingMu: value })
  showToast(RATING_SETUP_WARNING, 'warning')
})

ratingSigmaInput.addEventListener('change', () => {
  const value = parseFloat(ratingSigmaInput.value) || defaults.ratingSigma
  settings.save({ ratingSigma: value })
  showToast(RATING_SETUP_WARNING, 'warning')
})

ratingBetaInput.addEventListener('change', () => {
  const value = parseFloat(ratingBetaInput.value) || defaults.ratingBeta
  settings.save({ ratingBeta: value })
  showToast(RATING_SETUP_WARNING, 'warning')
})

ratingTauInput.addEventListener('change', () => {
  const value = parseFloat(ratingTauInput.value) || defaults.ratingTau
  settings.save({ ratingTau: value })
  showToast(RATING_SETUP_WARNING, 'warning')
})
const botListContainer = document.getElementById('bot-list-container')!
const botListBody = document.querySelector('#bot-list tbody')!
const resultsContainer = document.getElementById('results-container')!
const resultsBackdrop = document.getElementById('results-backdrop')!
const resultsBody = document.querySelector('#results-table tbody')!

let toastTimeout: number | null = null

function scaleToFit(container: HTMLElement, padding = 40): void {
  // Reset scale to measure natural size
  container.style.transform = ''
  const contentHeight = container.scrollHeight
  const availableHeight = window.innerHeight - padding * 2

  if (contentHeight > availableHeight) {
    const scale = availableHeight / contentHeight
    container.style.transform = `scale(${scale})`
  }
}

function setupResizeHandler(): void {
  window.addEventListener('resize', () => {
    if (botListContainer.classList.contains('visible') && !botListContainer.classList.contains('mini')) {
      scaleToFit(botListContainer)
    }
    if (resultsContainer.classList.contains('visible')) {
      scaleToFit(resultsContainer)
    }
  })
}

setupResizeHandler()

export function setStatus(state: 'connecting' | 'live'): void {
  statusEl.textContent = state === 'live' ? 'LIVE' : 'Connecting...'
  statusEl.className = state
}

export function showRoundTurn(round: number, turn: number): void {
  roundInfoEl.textContent = `ROUND ${round}`
  turnInfoEl.textContent = `TURN ${turn}`
  roundInfoEl.style.display = 'inline'
  turnInfoEl.style.display = 'inline'
  statusBarEl.classList.add('with-battle-info')
}

export function hideRoundTurn(): void {
  roundInfoEl.style.display = 'none'
  turnInfoEl.style.display = 'none'
  statusBarEl.classList.remove('with-battle-info')
}

export function showToast(message: string, type: 'error' | 'success' | 'warning' = 'error'): void {
  if (toastTimeout) clearTimeout(toastTimeout)
  toastEl.textContent = message
  toastEl.classList.remove('success', 'warning')
  if (type === 'success') toastEl.classList.add('success')
  if (type === 'warning') toastEl.classList.add('warning')
  toastEl.classList.add('show')
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show')
  }, 5000) as unknown as number
}

export function getSettings(): settings.Settings {
  return settings.get()
}

export function isShowRatingsEnabled(): boolean {
  return showRatingsCheckbox.checked
}

export function isDebugEnabled(): boolean {
  return debugLogCheckbox.checked
}

export function getScanOpacity(): number {
  return parseInt(scanOpacitySlider.value, 10) / 100
}

export function onScanOpacityChange(callback: (opacity: number) => void): void {
  scanOpacityCallback = callback
  // Fire immediately with current value
  callback(getScanOpacity())
}

export function getLogoOpacity(): number {
  return parseInt(logoOpacitySlider.value, 10) / 100
}

export function onLogoOpacityChange(callback: (opacity: number) => void): void {
  logoOpacityCallback = callback
  // Fire immediately with current value
  callback(getLogoOpacity())
}

export function getLogoSize(): number {
  return parseInt(logoSizeSlider.value, 10) / 100
}

export function onLogoSizeChange(callback: (size: number) => void): void {
  logoSizeCallback = callback
  // Fire immediately with current value
  callback(getLogoSize())
}

export function onShowRatingsChange(callback: (show: boolean) => void): void {
  showRatingsCallback = callback
}

export function onConnectionSettingsChange(callback: () => void): void {
  connectionSettingsCallback = callback
}

export function onBattleFeedSettingsChange(callback: () => void): void {
  battleFeedSettingsCallback = callback
}

export function closeSettings(): void {
  settingsPanel.classList.remove('open')
}

export function onSettingsToggle(callback: () => void): void {
  settingsBtn.onclick = callback
}

export function toggleSettings(): void {
  settingsPanel.classList.toggle('open')
}

export interface BotInfo {
  sessionId?: string
  name: string
  version: string
  authors: string[]
  countryCodes?: string[]
  platform?: string
  programmingLang?: string
  description?: string
  // Team fields (optional - only present for team members)
  teamId?: number
  teamName?: string
  teamVersion?: string
  isDroid?: boolean
}

export function updateBotList(bots: BotInfo[]): void {
  botListContainer.classList.toggle('empty', bots.length === 0)
  const showRatings = settings.get().showRatings

  // Group bots by team
  const teams = new Map<number, { name: string; version: string; members: BotInfo[] }>()
  const soloBots: BotInfo[] = []

  for (const bot of bots) {
    if (bot.teamId !== undefined && bot.teamName) {
      let team = teams.get(bot.teamId)
      if (!team) {
        team = { name: bot.teamName, version: bot.teamVersion || '', members: [] }
        teams.set(bot.teamId, team)
      }
      team.members.push(bot)
    } else {
      soloBots.push(bot)
    }
  }

  // Create unified list of entries (teams and solo bots) for sorting
  type Entry =
    | { type: 'team'; teamId: number; name: string; version: string; members: BotInfo[] }
    | { type: 'solo'; bot: BotInfo }

  const entries: Entry[] = []
  for (const [teamId, team] of teams) {
    entries.push({ type: 'team', teamId, name: team.name, version: team.version, members: team.members })
  }
  for (const bot of soloBots) {
    entries.push({ type: 'solo', bot })
  }

  // Sort all entries together by rating
  const getName = (e: Entry) => e.type === 'team' ? e.name : e.bot.name
  entries.sort((a, b) => {
    const nameA = getName(a)
    const nameB = getName(b)
    if (!showRatings) {
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
    }
    const pctA = ratings.getPercentileForBot(nameA)
    const pctB = ratings.getPercentileForBot(nameB)
    if (pctA === null && pctB === null) return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
    if (pctA === null) return 1
    if (pctB === null) return -1
    if (pctA !== pctB) return pctB - pctA
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
  })

  // Build rows
  const rows: string[] = []

  for (const entry of entries) {
    if (entry.type === 'team') {
      const teamColor = getTeamColor(entry.teamId)
      const teamIndicator = `<span class="team-indicator" data-tooltip="Team"><i class="fa-solid fa-fw fa-bookmark" style="color: ${teamColor}"></i></span>`

      // Team header row
      const teamRatingCols = showRatings ? buildRatingCells(entry.name) : ''

      rows.push(`<tr class="team-row">
        <td><span class="bot-name">${entry.name} <span class="bot-version">${entry.version}</span></span> ${teamIndicator}</td>${teamRatingCols}
        <td></td>
        <td class="bot-description"></td>
        <td class="bot-platform"></td>
      </tr>`)

      // Sort members: non-droids first, then droids, each alphabetically
      const sortedMembers = [...entry.members].sort((a, b) => {
        if (a.isDroid !== b.isDroid) return a.isDroid ? 1 : -1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })

      // Team member rows
      for (const bot of sortedMembers) {
        const droidIcon = bot.isDroid
          ? ' <span class="droid-icon" data-tooltip="Droid (no radar, 120HP)"><i class="fa-solid fa-fw fa-eye-slash"></i></span>'
          : ''

        const authorParts = formatAuthors(bot)
        const platformIcon = getPlatformIcon(bot.platform, bot.programmingLang)

        let memberRatingCols = ''
        if (showRatings) {
          memberRatingCols = '<td class="rank-tier"></td><td></td>'
        }

        rows.push(`<tr class="team-member-row">
          <td><span class="member-indent"><span class="bot-name">${bot.name} <span class="bot-version">${bot.version}</span></span></span>${teamIndicator}${droidIcon}</td>${memberRatingCols}
          <td>${authorParts}</td>
          <td class="bot-description">${bot.description || ''}</td>
          <td class="bot-platform">${platformIcon}</td>
        </tr>`)
      }
    } else {
      // Solo bot
      const bot = entry.bot
      const authorParts = formatAuthors(bot)
      const platformIcon = getPlatformIcon(bot.platform, bot.programmingLang)

      const ratingCols = showRatings ? buildRatingCells(bot.name) : ''

      rows.push(`<tr>
        <td><span class="bot-name">${bot.name} <span class="bot-version">${bot.version}</span></span></td>${ratingCols}
        <td>${authorParts}</td>
        <td class="bot-description">${bot.description || ''}</td>
        <td class="bot-platform">${platformIcon}</td>
      </tr>`)
    }
  }

  botListBody.innerHTML = rows.join('')

  // Update header
  const botListHeader = document.querySelector('#bot-list thead tr')!
  botListHeader.innerHTML = showRatings
    ? `<th>Bot</th><th>Tier</th><th class="rating-header" data-tooltip="${RATING_HEADER_TOOLTIP}">Rating</th><th>Author</th><th>Description</th><th></th>`
    : '<th>Bot</th><th>Author</th><th>Description</th><th></th>'

  // Scale if visible and not in mini mode
  if (botListContainer.classList.contains('visible') && !botListContainer.classList.contains('mini')) {
    scaleToFit(botListContainer)
  }
}

function formatAuthors(bot: BotInfo): string {
  const codes = bot.countryCodes || []
  const authors = bot.authors
  const authorParts: string[] = []
  for (let i = 0; i < Math.max(codes.length, authors.length); i++) {
    const flag = codes[i] ? `<span class="bot-flag fi fi-${codes[i].toLowerCase()}"></span>` : ''
    const name = authors[i] || ''
    authorParts.push(flag + name)
  }
  return authorParts.join(', ')
}

const platformIcons: Record<string, string> = {
  jvm: javaSvg,
  python: pythonSvg,
  dotnet: dotnetSvg,
  nodejs: nodejsSvg
}

const tierIcons: Record<BotTier, string> = {
  Unranked: tierUnrankedPng,
  Scrap: tierScrapPng,
  Rookie: tierRookiePng,
  Veteran: tierVeteranPng,
  Elite: tierElitePng,
  Legend: tierLegendPng
}

function getTierIcon(tier: BotTier, botName?: string): string {
  let tooltip: string = tier
  let cssClass = 'tier-icon'

  if (tier === 'Unranked' && botName) {
    const gamesToGo = ratings.getGamesToRanked(botName)
    tooltip = `Unranked (Games to play: ${gamesToGo})`
  } else if (botName && ratings.isProvisional(botName)) {
    const gamesToGo = ratings.getGamesToFullRank(botName)
    tooltip = `Provisional ${tier} (Games to play: ${gamesToGo})`
    cssClass = 'tier-icon provisional'
  }

  return `<span class="tier-icon-wrapper" data-tooltip="${tooltip}"><img src="${tierIcons[tier]}" class="${cssClass}" alt="${tier}"></span>`
}

function getPlatformIcon(platform?: string, lang?: string): string {
  const text = (platform || lang || '').toLowerCase()
  let icon = ''
  if (text === 'jvm' || text === 'java') {
    icon = platformIcons.jvm
  } else if (text.startsWith('.net') || text.startsWith('dotnet')) {
    icon = platformIcons.dotnet
  } else if (text === 'python') {
    icon = platformIcons.python
  } else if (/^node(\.?js)?$/.test(text)) {
    icon = platformIcons.nodejs
  }
  const tooltip = platform ? (lang ? `${platform} (${lang})` : platform) : (lang || '')
  return icon ? `<span class="platform-icon-wrapper" data-tooltip="${tooltip}"><img src="${icon}" class="platform-icon" alt="${tooltip}"></span>` : ''
}

export function showBotList(): void {
  botListContainer.classList.add('visible')
  botListContainer.classList.remove('mini')
  botListContainer.style.transform = ''
  resultsContainer.classList.remove('visible')
  scaleToFit(botListContainer)
}

export function showBotListMini(): void {
  botListContainer.classList.add('visible')
  botListContainer.classList.add('mini')
  botListContainer.style.transform = ''
}

export function hideBotList(): void {
  botListContainer.classList.remove('visible')
}

function bonusCell(value: number): string {
  return value ? `<td class="bonus">${value}</td>` : '<td class="bonus"></td>'
}

const RATING_HEADER_TOOLTIP = 'Percentile in ranked bot distribution'

function formatPercentile(botName: string, tier: BotTier, percentile: number | null): { text: string; cssClass: string } {
  if (tier === 'Unranked') {
    return { text: '-', cssClass: 'rating-col unranked' }
  }
  if (ratings.isProvisional(botName)) {
    return { text: percentile !== null ? `(${percentile.toFixed(1)})` : '-', cssClass: 'rating-col provisional' }
  }
  return { text: percentile !== null ? percentile.toFixed(1) : '-', cssClass: 'rating-col' }
}

function getRatingTooltip(botName: string): string {
  const r = ratings.getRating(botName)
  return r ? `μ:${Math.round(r.mu)}, σ:${Math.round(r.sigma)}` : 'No rating data'
}

function buildRatingCells(botName: string): string {
  const tier = ratings.getRankTierForBot(botName)
  const percentile = ratings.getPercentileForBot(botName)
  const { text, cssClass } = formatPercentile(botName, tier, percentile)
  return `
        <td class="rank-tier">${getTierIcon(tier, botName)}</td>
        <td><span class="${cssClass}" data-tooltip="${getRatingTooltip(botName)}">${text}</span></td>`
}

export interface RatingsSnapshot {
  [botName: string]: { percentile: number | null; tier: BotTier }
}

export function captureRatingsSnapshot(results: readonly PreparedResult[]): RatingsSnapshot {
  const snapshot: RatingsSnapshot = {}
  // Use result.name directly - server provides teamName for teams, botName for solo bots
  for (const r of results) {
    snapshot[r.name] = {
      percentile: ratings.getPercentileForBot(r.name),
      tier: ratings.getRankTierForBot(r.name)
    }
  }
  return snapshot
}

export function showResults(results: readonly PreparedResult[], oldRatings?: RatingsSnapshot): void {
  resultsBackdrop.classList.add('visible')
  resultsContainer.classList.add('visible')
  botListContainer.classList.add('visible')
  botListContainer.classList.add('mini')

  const showRatingsCol = settings.get().showRatings
  resultsBody.innerHTML = results.map(r => {
    const teamIndicator = r.isTeam
      ? ` <span class="team-indicator" data-tooltip="Team"><i class="fa-solid fa-fw fa-bookmark" style="color: ${getTeamColor(r.id)}"></i></span>`
      : ''

    const name = `${r.name} <span class="bot-version">${r.version}</span>${teamIndicator}`
    const rankClass = r.placement === 1 ? 'gold' : r.placement === 2 ? 'silver' : r.placement === 3 ? 'bronze' : ''
    const rankContent = rankClass ? `<span class="rank-medal ${rankClass}">${r.placement}</span>` : r.placement

    // Rating columns (conditional)
    let ratingCols = ''
    if (showRatingsCol) {
      const botName = r.name
      const tier = ratings.getRankTierForBot(botName)
      const percentile = ratings.getPercentileForBot(botName)
      const { text: percentileText, cssClass: ratingClass } = formatPercentile(botName, tier, percentile)

      // Calculate delta in percentile
      let deltaText = ''
      if (oldRatings && percentile !== null) {
        const oldPercentile = oldRatings[botName]?.percentile
        if (oldPercentile !== null && oldPercentile !== undefined) {
          const delta = percentile - oldPercentile
          if (delta > 0.05) {
            deltaText = `<span class="delta-up">▲${delta.toFixed(1)}</span>`
          } else if (delta < -0.05) {
            deltaText = `<span class="delta-down">▼${Math.abs(delta).toFixed(1)}</span>`
          }
        }
      }

      ratingCols = `
      <td class="rank-tier">${getTierIcon(tier, botName)}</td>
      <td class="rating-value"><span class="${ratingClass}" data-tooltip="${getRatingTooltip(botName)}">${percentileText}</span></td>
      <td class="rating-delta">${deltaText}</td>`
    }

    return `<tr>
      <td>${rankContent}</td>
      <td class="result-bot-name">${name}</td>${ratingCols}
      <td class="result-score">${r.totalScore}</td>
      <td>${r.survival}</td>
      ${bonusCell(r.lastSurvivorBonus)}
      <td>${r.bulletDamage}</td>
      ${bonusCell(r.bulletKillBonus)}
      <td>${r.ramDamage}</td>
      ${bonusCell(r.ramKillBonus)}
      <td>${r.firstPlaces}</td>
      <td>${r.secondPlaces}</td>
      <td>${r.thirdPlaces}</td>
    </tr>`
  }).join('')

  // Update header
  const resultsHeader = document.querySelector('#results-table thead tr')!
  resultsHeader.innerHTML = showRatingsCol
    ? `<th>#</th><th>Bot</th><th>Tier</th><th class="rating-header" data-tooltip="${RATING_HEADER_TOOLTIP}">Rating</th><th></th><th>Total</th><th>Survival</th><th>(bonus)</th><th>Bullet Dmg</th><th>(bonus)</th><th>Ram Dmg</th><th>(bonus)</th><th>1sts</th><th>2nds</th><th>3rds</th>`
    : `<th>#</th><th>Bot</th><th>Total</th><th>Survival</th><th>(bonus)</th><th>Bullet Dmg</th><th>(bonus)</th><th>Ram Dmg</th><th>(bonus)</th><th>1sts</th><th>2nds</th><th>3rds</th>`

  scaleToFit(resultsContainer)
}

export function hideResults(): void {
  resultsBackdrop.classList.remove('visible')
  resultsContainer.classList.remove('visible')
  resultsContainer.style.transform = ''
}
