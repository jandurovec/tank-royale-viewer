import javaSvg from './assets/java.svg'
import pythonSvg from './assets/python.svg'
import dotnetSvg from './assets/dotnet.svg'
import tierScrapPng from './assets/tier-scrap.png'
import tierRookiePng from './assets/tier-rookie.png'
import tierVeteranPng from './assets/tier-veteran.png'
import tierElitePng from './assets/tier-elite.png'
import tierUnrankedPng from './assets/tier-unranked.png'
import tierLegendPng from './assets/tier-legend.png'
import * as settings from './settings.js'
import * as ratings from './ratings.js'
import * as logoStorage from './logoStorage.js'
import { getState } from './gameState.js'
import type { BotTier } from './ratings.js'

const toastEl = document.getElementById('toast')!
const statusBarEl = document.getElementById('status-bar')!
const statusEl = document.getElementById('status')!
const roundInfoEl = document.getElementById('round-info')!
const turnInfoEl = document.getElementById('turn-info')!
const settingsBtn = document.getElementById('settings-btn')!
const settingsPanel = document.getElementById('settings-panel')!
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

let scanOpacityCallback: ((opacity: number) => void) | null = null
let logoOpacityCallback: ((opacity: number) => void) | null = null
let logoSizeCallback: ((size: number) => void) | null = null
let showRatingsCallback: ((show: boolean) => void) | null = null
let connectionSettingsCallback: (() => void) | null = null

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
  ratingMuInput.value = String(s.ratingMu)
  ratingSigmaInput.value = String(s.ratingSigma)
  ratingBetaInput.value = String(s.ratingBeta)
  ratingTauInput.value = String(s.ratingTau)
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

// OpenSkill parameter inputs
const RATING_PARAM_WARNING = 'OpenSkill parameter has changed. Resetting stored ratings is strongly recommended.'
const defaults = settings.getDefaults()

ratingMuInput.addEventListener('change', () => {
  const value = parseFloat(ratingMuInput.value) || defaults.ratingMu
  settings.save({ ratingMu: value })
  showToast(RATING_PARAM_WARNING, 'warning')
})

ratingSigmaInput.addEventListener('change', () => {
  const value = parseFloat(ratingSigmaInput.value) || defaults.ratingSigma
  settings.save({ ratingSigma: value })
  showToast(RATING_PARAM_WARNING, 'warning')
})

ratingBetaInput.addEventListener('change', () => {
  const value = parseFloat(ratingBetaInput.value) || defaults.ratingBeta
  settings.save({ ratingBeta: value })
  showToast(RATING_PARAM_WARNING, 'warning')
})

ratingTauInput.addEventListener('change', () => {
  const value = parseFloat(ratingTauInput.value) || defaults.ratingTau
  settings.save({ ratingTau: value })
  showToast(RATING_PARAM_WARNING, 'warning')
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
  name: string
  version: string
  authors: string[]
  countryCodes?: string[]
  platform?: string
  programmingLang?: string
  description?: string
}

export function updateBotList(bots: BotInfo[]): void {
  botListContainer.classList.toggle('empty', bots.length === 0)
  const showRatings = settings.get().showRatings

  const sorted = [...bots].sort((a, b) => {
    if (!showRatings) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    }

    // Sort by percentile (highest first), unranked at bottom
    const pctA = ratings.getPercentileForBot(a.name)
    const pctB = ratings.getPercentileForBot(b.name)

    // Unranked (null) goes to bottom
    if (pctA === null && pctB === null) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    }
    if (pctA === null) return 1
    if (pctB === null) return -1

    // Both have percentile - sort descending (highest first)
    if (pctA !== pctB) return pctB - pctA

    // Tie - sort by name
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  botListBody.innerHTML = sorted.map(bot => {
    const codes = bot.countryCodes || []
    const authors = bot.authors
    const authorParts: string[] = []

    for (let i = 0; i < Math.max(codes.length, authors.length); i++) {
      const flag = codes[i] ? `<span class="bot-flag fi fi-${codes[i].toLowerCase()}"></span>` : ''
      const name = authors[i] || ''
      authorParts.push(flag + name)
    }

    const platformIcon = getPlatformIcon(bot.platform, bot.programmingLang)

    // Rating columns (conditional)
    let ratingCols = ''
    if (showRatings) {
      const botRating = ratings.getRating(bot.name)
      const tier = ratings.getRankTierForBot(bot.name)
      const percentile = ratings.getPercentileForBot(bot.name)
      const tooltipText = botRating
        ? `μ:${Math.round(botRating.mu)}, σ:${Math.round(botRating.sigma)}`
        : 'No rating data'
      const { text: percentileText, cssClass: ratingClass } = formatPercentile(bot.name, tier, percentile)

      ratingCols = `
      <td class="rank-tier">${getTierIcon(tier, bot.name)}</td>
      <td><span class="${ratingClass}" data-tooltip="${tooltipText}">${percentileText}</span></td>`
    }

    return `<tr>
      <td><span class="bot-name">${bot.name} <span class="bot-version">${bot.version}</span></span></td>${ratingCols}
      <td>${authorParts.join(', ')}</td>
      <td class="bot-description">${bot.description || ''}</td>
      <td class="bot-platform">${platformIcon}</td>
    </tr>`
  }).join('')

  // Update header visibility
  const botListHeader = document.querySelector('#bot-list thead tr')!
  botListHeader.innerHTML = showRatings
    ? `<th>Bot</th><th>Tier</th><th class="rating-header" data-tooltip="${RATING_HEADER_TOOLTIP}">Rating</th><th>Author</th><th>Description</th><th></th>`
    : '<th>Bot</th><th>Author</th><th>Description</th><th></th>'

  // Scale if visible and not in mini mode
  if (botListContainer.classList.contains('visible') && !botListContainer.classList.contains('mini')) {
    scaleToFit(botListContainer)
  }
}

const platformIcons: Record<string, string> = {
  jvm: javaSvg,
  python: pythonSvg,
  dotnet: dotnetSvg
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
  let title: string = tier
  let cssClass = 'tier-icon'

  if (tier === 'Unranked' && botName) {
    const gamesToGo = ratings.getGamesToRanked(botName)
    title = `Unranked (Games to play: ${gamesToGo})`
  } else if (botName && ratings.isProvisional(botName)) {
    const gamesToGo = ratings.getGamesToFullRank(botName)
    title = `Provisional ${tier} (Games to play: ${gamesToGo})`
    cssClass = 'tier-icon provisional'
  }

  return `<img src="${tierIcons[tier]}" class="${cssClass}" alt="${tier}" title="${title}">`
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
  }
  return icon ? `<img src="${icon}" class="platform-icon" alt="${platform || lang || ''}" title="${platform || lang || ''}">` : ''
}

export function showBotList(): void {
  botListContainer.classList.add('visible')
  botListContainer.classList.remove('mini')
  botListContainer.style.transform = ''
  resultsContainer.classList.remove('visible')
  scaleToFit(botListContainer)
}

export function hideBotList(): void {
  botListContainer.classList.remove('visible')
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

export interface RatingsSnapshot {
  [botName: string]: { percentile: number | null; tier: BotTier }
}

export function captureRatingsSnapshot(results: BotResult[]): RatingsSnapshot {
  const snapshot: RatingsSnapshot = {}
  const participantMap = getState().participants
  for (const r of results) {
    const p = participantMap.get(r.id)
    if (p) {
      snapshot[p.name] = {
        percentile: ratings.getPercentileForBot(p.name),
        tier: ratings.getRankTierForBot(p.name)
      }
    }
  }
  return snapshot
}

export function showResults(results: BotResult[], oldRatings?: RatingsSnapshot): void {
  resultsBackdrop.classList.add('visible')
  resultsContainer.classList.add('visible')
  botListContainer.classList.add('visible')
  botListContainer.classList.add('mini')

  const showRatings = settings.get().showRatings
  const participantMap = getState().participants
  const sorted = [...results].sort((a, b) => a.rank - b.rank)

  resultsBody.innerHTML = sorted.map(r => {
    const bot = participantMap.get(r.id)
    const name = bot ? `${bot.name} <span class="bot-version">${bot.version}</span>` : `Bot #${r.id}`
    const rankClass = r.rank === 1 ? 'gold' : r.rank === 2 ? 'silver' : r.rank === 3 ? 'bronze' : ''
    const rankContent = rankClass ? `<span class="rank-medal ${rankClass}">${r.rank}</span>` : r.rank

    // Rating columns (conditional)
    let ratingCols = ''
    if (showRatings) {
      const botName = bot?.name || ''
      const botRating = ratings.getRating(botName)
      const tier = ratings.getRankTierForBot(botName)
      const percentile = ratings.getPercentileForBot(botName)

      const tooltipText = botRating
        ? `μ:${Math.round(botRating.mu)}, σ:${Math.round(botRating.sigma)}`
        : 'No rating data'
      const { text: percentileText, cssClass: ratingClass } = formatPercentile(botName, tier, percentile)

      // Calculate delta in percentile
      let deltaText = ''
      if (oldRatings && botName && percentile !== null) {
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
      <td class="rating-value"><span class="${ratingClass}" data-tooltip="${tooltipText}">${percentileText}</span></td>
      <td class="rating-delta">${deltaText}</td>`
    }

    return `<tr>
      <td>${rankContent}</td>
      <td>${name}</td>${ratingCols}
      <td>${r.totalScore}</td>
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

  // Update header visibility
  const resultsHeader = document.querySelector('#results-table thead tr')!
  resultsHeader.innerHTML = showRatings
    ? `<th>#</th><th>Bot</th><th>Tier</th><th class="rating-header" data-tooltip="${RATING_HEADER_TOOLTIP}">Rating</th><th></th><th>Total</th><th>Survival</th><th>(bonus)</th><th>Bullet Dmg</th><th>(bonus)</th><th>Ram Dmg</th><th>(bonus)</th><th>1sts</th><th>2nds</th><th>3rds</th>`
    : '<th>#</th><th>Bot</th><th>Total</th><th>Survival</th><th>(bonus)</th><th>Bullet Dmg</th><th>(bonus)</th><th>Ram Dmg</th><th>(bonus)</th><th>1sts</th><th>2nds</th><th>3rds</th>'

  scaleToFit(resultsContainer)
}

export function hideResults(): void {
  resultsBackdrop.classList.remove('visible')
  resultsContainer.classList.remove('visible')
  resultsContainer.style.transform = ''
}
