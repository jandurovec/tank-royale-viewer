import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { WebSocketRoute } from '@playwright/test'

interface GameStartedMessage {
  readonly type: 'GameStartedEventForObserver'
  readonly gameSetup: {
    readonly arenaWidth: number
    readonly arenaHeight: number
  }
}

interface ProtocolFixture {
  readonly messages: readonly { readonly type: string }[]
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/protocol/solo-battle.json', import.meta.url), 'utf8')
) as ProtocolFixture

const FEED_GAP = 12
const MIN_FEED_WIDTH = 230
const VIEWPORT_MARGIN = 16

function expectedArena(viewportWidth: number, viewportHeight: number, arenaWidth: number, arenaHeight: number): {
  readonly right: number
  readonly bottom: number
} {
  const scale = Math.min((viewportWidth - 64) / arenaWidth, (viewportHeight - 64) / arenaHeight)
  const width = arenaWidth * scale
  const height = arenaHeight * scale
  return {
    right: (viewportWidth + width) / 2,
    bottom: (viewportHeight + height) / 2
  }
}

function expectedFeedLane(arenaRight: number, viewportWidth: number): {
  readonly left: number
  readonly width: number
} {
  const safeRight = viewportWidth - VIEWPORT_MARGIN
  const idealLeft = arenaRight + FEED_GAP
  const width = Math.min(
    safeRight - VIEWPORT_MARGIN,
    Math.max(MIN_FEED_WIDTH, safeRight - idealLeft)
  )

  return { left: safeRight - width, width }
}

test('places real round notifications beside the rendered arena and updates their placement', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', error => browserErrors.push(error.message))

  let resolveSocket!: (socket: WebSocketRoute) => void
  const socketReady = new Promise<WebSocketRoute>(resolve => {
    resolveSocket = resolve
  })

  await page.setViewportSize({ width: 2200, height: 1000 })
  await page.routeWebSocket(/localhost:7654/, socket => {
    socket.send(JSON.stringify({
      type: 'ServerHandshake',
      sessionId: 'fixture-observer',
      name: 'Robocode Tank Royale Server',
      version: '1.0.2',
      gameTypes: ['classic']
    }))
    resolveSocket(socket)
  })
  await page.goto('/')

  const socket = await socketReady
  const gameStarted = fixture.messages.find(message => message.type === 'GameStartedEventForObserver') as GameStartedMessage
  socket.send(JSON.stringify(gameStarted))

  socket.send(JSON.stringify({
    type: 'RoundEndedEventForObserver',
    roundNumber: 1,
    results: [
      { id: 1, isTeam: false, name: 'Walls', firstPlaces: 1, totalScore: 162 },
      { id: 2, isTeam: false, name: 'Ram Fire', firstPlaces: 0, totalScore: 0 }
    ]
  }))
  socket.send(JSON.stringify({
    type: 'RoundEndedEventForObserver',
    roundNumber: 2,
    results: [
      { id: 1, isTeam: false, name: 'Walls', firstPlaces: 1, totalScore: 170 },
      { id: 2, isTeam: false, name: 'Ram Fire', firstPlaces: 1, totalScore: 200 }
    ]
  }))

  const feed = page.locator('#battle-event-feed')
  interface CardSnapshot {
    readonly text: string | null
    readonly names: readonly string[]
    readonly borderLeftColor: string
    readonly y: number
    readonly height: number
  }
  let initialCards: readonly CardSnapshot[] = []
  await expect.poll(async () => {
    initialCards = await feed.locator('.battle-event-feed-card').evaluateAll(cards => cards.map(card => {
      const rect = card.getBoundingClientRect()
      return {
        text: card.textContent,
        names: Array.from(card.querySelectorAll('strong'), name => name.textContent),
        borderLeftColor: getComputedStyle(card).borderLeftColor,
        y: rect.y,
        height: rect.height
      }
    }))
    return initialCards.map(({ text, names, borderLeftColor }) => ({ text, names, borderLeftColor }))
  }).toEqual([
    { text: 'Walls won Round 1', names: ['Walls'], borderLeftColor: 'rgb(213, 168, 67)' },
    { text: 'Ram Fire won Round 2', names: ['Ram Fire'], borderLeftColor: 'rgb(213, 168, 67)' },
    { text: 'Ram Fire takes the aggregate lead', names: ['Ram Fire'], borderLeftColor: 'rgb(126, 220, 154)' }
  ])
  const cardBoxes = initialCards.map(({ y, height }) => ({ y, height }))
  const feedBox = await feed.boundingBox()
  expect(feedBox).not.toBeNull()
  expect(cardBoxes).toHaveLength(3)
  expect(cardBoxes[1].y).toBeLessThan(cardBoxes[2].y)
  expect(cardBoxes[2].y + cardBoxes[2].height).toBeCloseTo(feedBox!.y + feedBox!.height, 0)

  socket.send(JSON.stringify({
    type: 'RoundEndedEventForObserver',
    roundNumber: 3,
    results: [
      { id: 1, isTeam: false, name: 'Walls', firstPlaces: 2, totalScore: 220 },
      { id: 2, isTeam: false, name: 'Ram Fire', firstPlaces: 2, totalScore: 220 }
    ]
  }))
  const tiedRoundWinner = feed.locator('.battle-event-feed-card--round-winner').last()
  const tiedAggregateLead = feed.locator('.battle-event-feed-card--aggregate-lead').last()
  await expect(tiedRoundWinner).toHaveText('Ram Fire, Walls won Round 3')
  await expect(tiedAggregateLead).toHaveText('Ram Fire, Walls share the aggregate lead')
  await expect(tiedRoundWinner.locator('strong')).toHaveText(['Ram Fire', 'Walls'])
  await expect(tiedAggregateLead.locator('strong')).toHaveText(['Ram Fire', 'Walls'])

  socket.send(JSON.stringify({
    type: 'TickEventForObserver',
    roundNumber: 3,
    turnNumber: 1,
    botStates: [],
    bulletStates: [],
    events: []
  }))
  await expect(page.locator('#arena canvas')).toBeVisible()
  await expect(page.locator('#turn-info')).toHaveText('TURN 1')

  const firstArena = expectedArena(2200, 1000, 800, 600)
  const firstFeedBox = await feed.boundingBox()
  expect(firstFeedBox).not.toBeNull()
  const firstFeedLane = expectedFeedLane(firstArena.right, 2200)
  expect(firstFeedBox!.x).toBeCloseTo(firstFeedLane.left, 0)
  expect(firstFeedBox!.width).toBeCloseTo(firstFeedLane.width, 0)
  expect(firstFeedBox!.x).toBeCloseTo(firstArena.right + FEED_GAP, 0)
  expect(firstFeedBox!.x + firstFeedBox!.width).toBeCloseTo(2200 - VIEWPORT_MARGIN, 0)
  expect(firstFeedBox!.y + firstFeedBox!.height).toBeCloseTo(firstArena.bottom, 0)
  socket.send(JSON.stringify({
    type: 'RoundEndedEventForObserver',
    roundNumber: 4,
    results: [
      { id: 1, isTeam: false, name: 'Walls', firstPlaces: 3, totalScore: 240 },
      { id: 2, isTeam: false, name: 'Ram Fire', firstPlaces: 2, totalScore: 220 }
    ]
  }))
  const spaciousShortCardLocator = feed.locator('.battle-event-feed-card--round-winner').filter({ hasText: /^Walls won Round 4$/ })
  let spaciousShortCardWidth = 0
  await expect.poll(async () => {
    spaciousShortCardWidth = (await spaciousShortCardLocator.last().boundingBox())?.width ?? 0
    return spaciousShortCardWidth
  }).toBeGreaterThan(0)
  expect(spaciousShortCardWidth).toBeLessThan(firstFeedBox!.width)

  const longName = 'A Deliberately Long Bot Name That Fits The Spacious Event Feed Lane'
  socket.send(JSON.stringify({
    type: 'RoundEndedEventForObserver',
    roundNumber: 5,
    results: [
      { id: 1, isTeam: false, name: longName, firstPlaces: 4, totalScore: 280 },
      { id: 2, isTeam: false, name: 'Ram Fire', firstPlaces: 2, totalScore: 220 }
    ]
  }))
  const longCard = feed.locator('.battle-event-feed-card--round-winner').filter({ hasText: new RegExp(`^${longName} won Round 5$`) })
  let spaciousLongCardHeight = 0
  await expect.poll(async () => {
    const box = await longCard.last().boundingBox()
    spaciousLongCardHeight = box?.height ?? 0
    return box?.width ?? 0
  }).toBeGreaterThan(MIN_FEED_WIDTH)

  await page.setViewportSize({ width: 1000, height: 800 })
  const resizedArena = expectedArena(1000, 800, 800, 600)
  const resizedFeedLane = expectedFeedLane(resizedArena.right, 1000)
  await expect.poll(async () => (await feed.boundingBox())?.x).toBeCloseTo(resizedFeedLane.left, 0)
  const resizedFeedBox = await feed.boundingBox()
  expect(resizedFeedBox).not.toBeNull()
  expect(resizedFeedBox!.width).toBeCloseTo(resizedFeedLane.width, 0)
  expect(resizedFeedBox!.x + resizedFeedBox!.width).toBeCloseTo(1000 - VIEWPORT_MARGIN, 0)
  expect(resizedFeedBox!.x).toBeLessThan(resizedArena.right + FEED_GAP)
  expect(resizedFeedBox!.y + resizedFeedBox!.height).toBeCloseTo(resizedArena.bottom, 0)
  socket.send(JSON.stringify({
    type: 'RoundEndedEventForObserver',
    roundNumber: 6,
    results: [
      { id: 1, isTeam: false, name: longName, firstPlaces: 5, totalScore: 300 },
      { id: 2, isTeam: false, name: 'Ram Fire', firstPlaces: 2, totalScore: 220 }
    ]
  }))
  const compactLongCardLocator = feed.locator('.battle-event-feed-card--round-winner').filter({ hasText: new RegExp(`^${longName} won Round 6$`) })
  let compactLongCardHeight = 0
  await expect.poll(async () => {
    const box = await compactLongCardLocator.last().boundingBox()
    compactLongCardHeight = box?.height ?? Infinity
    return box?.width ?? Infinity
  }).toBeLessThanOrEqual(MIN_FEED_WIDTH)
  expect(compactLongCardHeight).toBeGreaterThan(spaciousLongCardHeight)

  socket.send(JSON.stringify({
    ...gameStarted,
    gameSetup: { ...gameStarted.gameSetup, arenaWidth: 1000, arenaHeight: 1000 }
  }))
  const updatedArena = expectedArena(1000, 800, 1000, 1000)
  const updatedFeedLane = expectedFeedLane(updatedArena.right, 1000)
  await expect.poll(async () => (await feed.boundingBox())?.x).toBeCloseTo(updatedFeedLane.left, 0)
  const updatedFeedBox = await feed.boundingBox()
  expect(updatedFeedBox).not.toBeNull()
  expect(updatedFeedBox!.width).toBeCloseTo(updatedFeedLane.width, 0)
  expect(updatedFeedBox!.y + updatedFeedBox!.height).toBeCloseTo(updatedArena.bottom, 0)

  socket.send(JSON.stringify({ type: 'GameAbortedEvent' }))
  await expect(feed.locator('.battle-event-feed-card')).toHaveCount(0)

  socket.send(JSON.stringify(gameStarted))
  await expect(feed.locator('.battle-event-feed-card')).toHaveCount(0)
  expect(browserErrors).toEqual([])
})

test('shows hit and elimination notifications from tick events without interrupting the arena', async ({ page }) => {
  let resolveSocket!: (socket: WebSocketRoute) => void
  const socketReady = new Promise<WebSocketRoute>(resolve => { resolveSocket = resolve })
  await page.addInitScript(() => {
    localStorage.setItem('tank-royale-viewer-settings', JSON.stringify({ showBulletHitEvents: true }))
  })
  await page.routeWebSocket(/localhost:7654/, socket => {
    socket.send(JSON.stringify({
      type: 'ServerHandshake', sessionId: 'fixture-observer', name: 'Robocode Tank Royale Server', version: '1.0.2', gameTypes: ['classic']
    }))
    resolveSocket(socket)
  })
  await page.goto('/')
  const socket = await socketReady
  const gameStarted = fixture.messages.find(message => message.type === 'GameStartedEventForObserver') as GameStartedMessage
  socket.send(JSON.stringify(gameStarted))

  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 1, turnNumber: 1, botStates: [], bulletStates: [],
    events: [{ type: 'BulletHitBotEvent', victimId: 2, bullet: { bulletId: 1, ownerId: 1, power: 1, x: 20, y: 20 }, damage: 4, energy: 96 }]
  }))
  const feed = page.locator('#battle-event-feed')
  await expect.poll(async () => feed.locator('.battle-event-feed-card--bullet-hit').evaluateAll(cards => cards.map(card => ({
    text: card.textContent,
    names: Array.from(card.querySelectorAll('strong'), name => name.textContent),
    borderLeftColor: getComputedStyle(card).borderLeftColor
  })))).toEqual([{
    text: 'Walls hit Ram Fire · 4 damage',
    names: ['Walls', 'Ram Fire'],
    borderLeftColor: 'rgb(210, 214, 220)'
  }])

  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 1, turnNumber: 2, botStates: [], bulletStates: [],
    events: [
      { type: 'BulletHitBotEvent', victimId: 2, bullet: { bulletId: 2, ownerId: 1, power: 2, x: 20, y: 20 }, damage: 10, energy: 0 },
      { type: 'BotDeathEvent', victimId: 2 }
    ]
  }))
  await expect(feed.locator('.battle-event-feed-card--elimination')).toHaveText('Walls eliminated Ram Fire')
  await expect(feed.locator('.battle-event-feed-card--elimination').first().locator('strong')).toHaveText(['Walls', 'Ram Fire'])
  await expect(page.locator('#arena canvas')).toBeVisible()
  await expect(feed.locator('.battle-event-feed-card--elimination')).toHaveCSS('border-left-color', 'rgb(215, 90, 90)')
  await expect(page.locator('#turn-info')).toHaveText('TURN 2')

  await page.locator('#settings-btn').click()
  await page.locator('#show-bullet-hit-events').uncheck()
  await expect(feed.locator('.battle-event-feed-card--bullet-hit')).toHaveCount(0)
  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 2, turnNumber: 1, botStates: [], bulletStates: [],
    events: [{ type: 'BulletHitBotEvent', victimId: 2, bullet: { bulletId: 3, ownerId: 1, power: 1, x: 20, y: 20 }, damage: 3, energy: 93 }]
  }))
  await expect(feed.locator('.battle-event-feed-card--bullet-hit')).toHaveCount(0)
  await expect(page.locator('#arena canvas')).toBeVisible()
  await page.locator('#show-bullet-hit-events').check()
  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 2, turnNumber: 2, botStates: [], bulletStates: [],
    events: [{ type: 'BulletHitBotEvent', victimId: 2, bullet: { bulletId: 4, ownerId: 1, power: 1, x: 20, y: 20 }, damage: 3, energy: 90 }]
  }))
  await expect(feed.locator('.battle-event-feed-card--bullet-hit')).toHaveCount(1)

  await page.locator('#show-ramming-events').check()
  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 2, turnNumber: 3, botStates: [], bulletStates: [],
    events: [{ type: 'BotHitBotEvent', botId: 1, victimId: 2, energy: 86, rammed: true }]
  }))
  const ramming = feed.locator('.battle-event-feed-card--ramming')
  await expect(ramming).toHaveText('Walls rammed Ram Fire')
  await expect(ramming.locator('strong')).toHaveText(['Walls', 'Ram Fire'])
  await expect(ramming).toHaveCSS('border-left-color', 'rgb(210, 214, 220)')
  await page.locator('#show-ramming-events').uncheck()
  await expect(ramming).toHaveCount(0)

  await page.locator('#show-battle-event-feed').uncheck()
  await expect(feed.locator('.battle-event-feed-card')).toHaveCount(0)
  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 2, turnNumber: 3, botStates: [], bulletStates: [],
    events: [{ type: 'BotDeathEvent', victimId: 2 }]
  }))
  await expect(feed.locator('.battle-event-feed-card')).toHaveCount(0)
  await page.locator('#show-battle-event-feed').check()
  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 2, turnNumber: 4, botStates: [], bulletStates: [],
    events: [{ type: 'BulletHitBotEvent', victimId: 2, bullet: { bulletId: 5, ownerId: 1, power: 1, x: 20, y: 20 }, damage: 3, energy: 87 }]
  }))
  await expect(feed.locator('.battle-event-feed-card--bullet-hit')).toHaveCount(1)

  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 2, turnNumber: 1, botStates: [], bulletStates: [],
    events: [{ type: 'BotHitBotEvent', botId: 1, victimId: 2, energy: -1 }]
  }))
  await expect(feed.locator('.battle-event-feed-card').last()).toHaveText('Walls eliminated Ram Fire')
  await expect(feed.locator('.battle-event-feed-card').last().locator('strong')).toHaveText(['Walls', 'Ram Fire'])
  await expect(page.locator('#turn-info')).toHaveText('TURN 1')

  socket.send(JSON.stringify({
    type: 'TickEventForObserver', roundNumber: 2, turnNumber: 2, botStates: [], bulletStates: [],
    events: [{ type: 'BotDeathEvent', victimId: 2 }]
  }))
  await expect(feed.locator('.battle-event-feed-card').last()).toHaveText('Ram Fire eliminated')
  await expect(feed.locator('.battle-event-feed-card').last().locator('strong')).toHaveText(['Ram Fire'])

  socket.send(JSON.stringify({ type: 'GameAbortedEvent' }))
  await expect(feed.locator('.battle-event-feed-card')).toHaveCount(0)
})

test('persists battle feed choices and keeps the grid panel in the viewport', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.locator('#settings-btn').evaluate(button => button.onclick !== null)).toBe(true)
  await page.locator('#settings-btn').click()
  const master = page.locator('#show-battle-event-feed')
  const roundWinners = page.locator('#show-round-winner-events')
  await master.uncheck()
  await expect(roundWinners).toBeDisabled()
  await master.check()
  await expect(roundWinners).toBeEnabled()
  await page.locator('#show-bullet-hit-events').check()
  await page.locator('#show-ramming-events').check()
  await page.reload()
  await expect.poll(() => page.locator('#settings-btn').evaluate(button => button.onclick !== null)).toBe(true)
  await page.locator('#settings-btn').click()
  await expect(page.locator('#show-bullet-hit-events')).toBeChecked()
  await expect(page.locator('#show-ramming-events')).toBeChecked()

  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 800, height: 600 }]) {
    await page.setViewportSize(viewport)
    const geometry = await page.locator('#settings-panel').evaluate(panel => {
      const general = panel.querySelector('.settings-general')!.getBoundingClientRect()
      const logo = panel.querySelector('.settings-arena-logo')!.getBoundingClientRect()
      const ratings = panel.querySelector('.settings-skill-ratings')!.getBoundingClientRect()
      const feed = panel.querySelector('.settings-battle-feed')!.getBoundingClientRect()
      const bounds = panel.getBoundingClientRect()
      const sections = Array.from(panel.querySelectorAll<HTMLElement>('.settings-section'))
      const eventOptionLineCounts = Array.from(panel.querySelectorAll<HTMLElement>('#battle-feed-event-options label.checkbox')).map(label => {
        const textNode = Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        if (!textNode) return 0
        const range = document.createRange()
        range.selectNode(textNode)
        return range.getClientRects().length
      })
      return {
        bounds: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
        scrollHeight: panel.scrollHeight,
        clientHeight: panel.clientHeight,
        overflowY: getComputedStyle(panel).overflowY,
        general: { x: general.x, y: general.y },
        logo: { x: logo.x, y: logo.y },
        ratings: { x: ratings.x, y: ratings.y },
        feed: { x: feed.x, y: feed.y },
        sectionStyles: sections.map(section => {
          const style = getComputedStyle(section)
          return { background: style.backgroundColor, radius: style.borderTopLeftRadius }
        }),
        eventOptionLineCounts,
        eventColumns: Array.from(panel.querySelectorAll<HTMLElement>('.battle-feed-event-column')).map(column =>
          Array.from(column.querySelectorAll('label')).map(label => label.textContent?.trim().replace(/\s+/g, ' '))
        ),
        panelBackground: getComputedStyle(panel).backgroundColor
      }
    })
    expect(geometry.bounds.left).toBeGreaterThanOrEqual(0)
    expect(geometry.bounds.top).toBeGreaterThanOrEqual(0)
    expect(geometry.bounds.right).toBeLessThanOrEqual(viewport.width)
    expect(geometry.bounds.bottom).toBeLessThanOrEqual(viewport.height)
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight)
    expect(geometry.overflowY).not.toBe('scroll')
    expect(geometry.general.x).toBeLessThan(geometry.logo.x)
    expect(geometry.general.y).toBeLessThan(geometry.ratings.y)
    expect(geometry.ratings.x).toBeLessThan(geometry.feed.x)
    expect(geometry.sectionStyles).toHaveLength(4)
    expect(new Set(geometry.sectionStyles.map(style => style.background)).size).toBe(1)
    expect(geometry.sectionStyles[0].background).not.toBe(geometry.panelBackground)
    expect(geometry.sectionStyles.every(style => Number.parseFloat(style.radius) > 0)).toBe(true)
    expect(geometry.eventOptionLineCounts).toEqual([1, 1, 1, 1, 1])
    expect(geometry.eventColumns).toEqual([
      ['Round winners', 'Aggregate lead'],
      ['Bot eliminations', 'Bullet damage', 'Ramming']
    ])
  }
})
