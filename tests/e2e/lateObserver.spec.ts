import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page, WebSocketRoute } from '@playwright/test'

interface ProtocolMessage {
  readonly type: string
  readonly [key: string]: unknown
}

interface ProtocolFixture {
  readonly messages: readonly ProtocolMessage[]
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/protocol/late-observer-v035.json', import.meta.url), 'utf8')
) as ProtocolFixture

const botList = getFixtureMessage('BotListUpdate')
const lateTick = getFixtureMessage('TickEventForObserver')

function getFixtureMessage(type: string): ProtocolMessage {
  const message = fixture.messages.find(candidate => candidate.type === type)
  if (!message) throw new Error(`Fixture message not found: ${type}`)
  return message
}

function gameSetup(arenaWidth = 800, arenaHeight = 600): Record<string, unknown> {
  return {
    gameType: 'classic',
    arenaWidth,
    isArenaWidthLocked: true,
    arenaHeight,
    isArenaHeightLocked: true,
    minNumberOfParticipants: 2,
    isMinNumberOfParticipantsLocked: true,
    isMaxNumberOfParticipantsLocked: true,
    numberOfRounds: 10,
    isNumberOfRoundsLocked: true,
    gunCoolingRate: 0.1,
    isGunCoolingRateLocked: true,
    maxInactivityTurns: 450,
    isMaxInactivityTurnsLocked: true,
    turnTimeout: 30000,
    isTurnTimeoutLocked: false,
    readyTimeout: 1000000,
    isReadyTimeoutLocked: false,
    defaultTurnsPerSecond: 30
  }
}

function serverHandshake(setup?: Record<string, unknown>): ProtocolMessage {
  return {
    type: 'ServerHandshake',
    sessionId: 'late-observer-fixture',
    name: 'Robocode Tank Royale server',
    variant: 'Tank Royale',
    version: '0.35.0',
    gameTypes: ['classic'],
    ...(setup ? { gameSetup: setup } : {})
  }
}

async function installMockServer(page: Page, handshakes: readonly ProtocolMessage[]): Promise<{
  waitForSocket(index: number): Promise<WebSocketRoute>
}> {
  const sockets: WebSocketRoute[] = []
  const waiters = new Map<number, (socket: WebSocketRoute) => void>()

  await page.routeWebSocket(/localhost:\d+/, socket => {
    const index = sockets.length
    sockets.push(socket)
    socket.send(JSON.stringify(handshakes[index] ?? serverHandshake()))
    waiters.get(index)?.(socket)
    waiters.delete(index)
  })

  return {
    waitForSocket(index: number): Promise<WebSocketRoute> {
      const socket = sockets[index]
      if (socket) return Promise.resolve(socket)
      return new Promise(resolve => waiters.set(index, resolve))
    }
  }
}

function send(socket: WebSocketRoute, message: ProtocolMessage): void {
  socket.send(JSON.stringify(message))
}

test('renders a 0.35 late observer from handshake setup and its first tick', async ({ page }) => {
  const server = await installMockServer(page, [serverHandshake(gameSetup())])
  await page.goto('/')
  const socket = await server.waitForSocket(0)

  send(socket, botList)
  send(socket, lateTick)

  await expect(page.locator('#arena canvas')).toBeVisible()
  await expect(page.locator('#bot-list-container')).toHaveClass(/mini/)
  await expect(page.locator('#round-info')).toHaveText('ROUND 4')
  await expect(page.locator('#turn-info')).toHaveText('TURN 321')
  await expect(page.locator('#battle-event-feed')).toContainText('Bob Bot eliminated')
})

test('does not render a stale handshake setup until a tick confirms a battle', async ({ page }) => {
  const server = await installMockServer(page, [serverHandshake(gameSetup())])
  await page.goto('/')
  await server.waitForSocket(0)

  await expect(page.locator('#arena canvas')).toBeHidden()
  await expect(page.locator('#round-info')).toBeHidden()
  await expect(page.locator('#turn-info')).toBeHidden()
  await expect(page.locator('#waiting-message')).toBeVisible()
})

test('does not invent an arena when a late observer handshake has no setup', async ({ page }) => {
  const server = await installMockServer(page, [serverHandshake()])
  await page.goto('/')
  const socket = await server.waitForSocket(0)

  send(socket, lateTick)

  await expect(page.locator('#arena canvas')).toBeHidden()
  await expect(page.locator('#bot-list-container')).not.toHaveClass(/mini/)
  await expect(page.locator('#round-info')).toBeHidden()
  await expect(page.locator('#turn-info')).toBeHidden()
  await expect(page.locator('#waiting-message')).toBeVisible()
})

test('keeps a normal game-start battle initialized when its first tick arrives', async ({ page }) => {
  const server = await installMockServer(page, [serverHandshake(gameSetup(400, 800))])
  await page.goto('/')
  const socket = await server.waitForSocket(0)

  send(socket, botList)
  send(socket, {
    type: 'GameStartedEventForObserver',
    gameSetup: gameSetup(),
    participants: [
      { id: 1, sessionId: 'session-alice', name: 'Game Start Alice Bot', version: '1.0' },
      { id: 2, sessionId: 'session-bob', name: 'Game Start Bob Bot', version: '1.0' }
    ]
  })
  await expect(page.locator('#round-info')).toHaveText('ROUND 1')
  await expect(page.locator('#turn-info')).toHaveText('TURN 0')

  send(socket, lateTick)

  await expect(page.locator('#arena canvas')).toBeVisible()
  await expect(page.locator('#round-info')).toHaveText('ROUND 4')
  await expect(page.locator('#turn-info')).toHaveText('TURN 321')
  await expect(page.locator('#battle-event-feed')).toContainText('Game Start Bob Bot eliminated')
})

test('enriches a late tick participant with team metadata from a later bot list', async ({ page }) => {
  const server = await installMockServer(page, [serverHandshake(gameSetup())])
  await page.goto('/')
  const socket = await server.waitForSocket(0)
  const firstTick = {
    type: 'TickEventForObserver',
    roundNumber: 1,
    turnNumber: 10,
    botStates: [{
      id: 1,
      sessionId: 'team-member-one',
      name: 'First Member',
      version: '1.0',
      energy: 100,
      x: 100,
      y: 100,
      direction: 0,
      gunDirection: 0,
      radarDirection: 0,
      radarSweep: 0,
      speed: 0
    }],
    bulletStates: [],
    events: []
  }

  send(socket, firstTick)
  await expect(page.locator('#arena canvas')).toBeVisible()

  send(socket, {
    type: 'BotListUpdate',
    bots: [
      {
        sessionId: 'team-member-one', name: 'First Member', version: '1.0', authors: [],
        teamId: 77, teamName: 'Late Metadata Team', teamVersion: '2.0'
      },
      {
        sessionId: 'team-member-two', name: 'Second Member', version: '1.0', authors: [],
        teamId: 77, teamName: 'Late Metadata Team', teamVersion: '2.0'
      }
    ]
  })
  send(socket, { ...firstTick, turnNumber: 11 })
  send(socket, {
    type: 'GameEndedEventForObserver',
    results: [{
      id: 77,
      name: 'Late Metadata Team',
      version: '2.0',
      totalScore: 100,
      survival: 50,
      lastSurvivorBonus: 10,
      bulletDamage: 40,
      bulletKillBonus: 8,
      ramDamage: 0,
      ramKillBonus: 0,
      firstPlaces: 1,
      secondPlaces: 0,
      thirdPlaces: 0
    }]
  })

  await expect(page.locator('#results-container')).toBeVisible()
  await expect(page.locator('#results-table tbody')).toContainText('Late Metadata Team')
  await expect(page.locator('#results-table .team-indicator')).toHaveCount(1)
})

test('does not reuse a previous connection handshake setup after reconnecting', async ({ page }) => {
  const server = await installMockServer(page, [serverHandshake(gameSetup()), serverHandshake()])
  await page.goto('/')
  const firstSocket = await server.waitForSocket(0)

  send(firstSocket, botList)
  send(firstSocket, lateTick)
  await expect(page.locator('#arena canvas')).toBeVisible()

  await page.locator('#settings-btn').click()
  await page.locator('#server-url').fill('ws://localhost:7656')
  await page.locator('#server-url').press('Tab')
  const secondSocket = await server.waitForSocket(1)
  send(secondSocket, botList)
  send(secondSocket, lateTick)

  await expect(page.locator('#arena canvas')).toBeHidden()
  await expect(page.locator('#bot-list-container')).not.toHaveClass(/mini/)
})
