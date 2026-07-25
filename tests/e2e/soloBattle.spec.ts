import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { WebSocketRoute } from '@playwright/test'

interface ProtocolMessage {
  readonly type: string
  readonly bots?: readonly unknown[]
  readonly turnNumber?: number
}

interface ProtocolFixture {
  readonly messages: readonly ProtocolMessage[]
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/protocol/solo-battle.json', import.meta.url), 'utf8')
) as ProtocolFixture

test('shows a real solo battle journey from waiting through results', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', error => browserErrors.push(error.message))

  let resolveSocket!: (socket: WebSocketRoute) => void
  const socketReady = new Promise<WebSocketRoute>(resolve => {
    resolveSocket = resolve
  })

  let resolveObserverHandshake!: (message: ProtocolMessage) => void
  const observerHandshakeReceived = new Promise<ProtocolMessage>(resolve => {
    resolveObserverHandshake = resolve
  })

  await page.routeWebSocket(/localhost:7654/, socket => {
    socket.onMessage(message => {
      resolveObserverHandshake(JSON.parse(message.toString()) as ProtocolMessage)
    })
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
  await expect(page.locator('#status')).toHaveText('LIVE')
  await expect(observerHandshakeReceived).resolves.toMatchObject({
    type: 'ObserverHandshake',
    sessionId: 'fixture-observer'
  })

  const botLists = fixture.messages.filter(message => message.type === 'BotListUpdate')
  expect(botLists).toHaveLength(3)

  socket.send(JSON.stringify(botLists[0]))
  await expect(page.locator('#waiting-message')).toBeVisible()

  socket.send(JSON.stringify(botLists[1]))
  await expect(page.locator('#bot-list tbody')).toContainText('Walls')

  socket.send(JSON.stringify(botLists[2]))
  await expect(page.locator('#bot-list tbody')).toContainText('Ram Fire')

  const gameStarted = fixture.messages.find(message => message.type === 'GameStartedEventForObserver')
  expect(gameStarted).toBeDefined()
  socket.send(JSON.stringify(gameStarted))

  await expect(page.locator('#arena canvas')).toBeVisible()
  await expect(page.locator('#bot-list-container')).toHaveClass(/mini/)
  await expect(page.locator('#round-info')).toHaveText('ROUND 1')
  await expect(page.locator('#turn-info')).toHaveText('TURN 0')

  const roundStarted = fixture.messages.find(message => message.type === 'RoundStartedEvent')
  expect(roundStarted).toBeDefined()
  socket.send(JSON.stringify(roundStarted))

  const ticks = fixture.messages.filter(message => message.type === 'TickEventForObserver')
  expect(ticks.map(tick => tick.turnNumber)).toEqual([671, 1482])

  socket.send(JSON.stringify(ticks[0]))
  await expect(page.locator('#turn-info')).toHaveText('TURN 671')

  socket.send(JSON.stringify(ticks[1]))
  await expect(page.locator('#turn-info')).toHaveText('TURN 1482')
  await expect(page.locator('#arena canvas')).toBeVisible()

  const roundEnded = fixture.messages.find(message => message.type === 'RoundEndedEventForObserver')
  expect(roundEnded).toBeDefined()
  socket.send(JSON.stringify(roundEnded))

  await expect(page.locator('#results-container')).toBeHidden()
  await expect(page.locator('#arena canvas')).toBeVisible()

  const gameEnded = fixture.messages.find(message => message.type === 'GameEndedEventForObserver')
  expect(gameEnded).toBeDefined()
  socket.send(JSON.stringify(gameEnded))

  await expect(page.locator('#arena canvas')).toBeHidden()
  await expect(page.locator('#results-container')).toBeVisible()

  const resultRows = page.locator('#results-table tbody tr')
  await expect(resultRows).toHaveCount(2)
  await expect(resultRows.nth(0)).toContainText('Walls')
  await expect(resultRows.nth(0)).toContainText('162')
  await expect(resultRows.nth(1)).toContainText('Ram Fire')
  await expect(resultRows.nth(1)).toContainText('0')
  expect(browserErrors).toEqual([])
})
