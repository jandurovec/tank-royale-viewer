import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page, WebSocketRoute } from '@playwright/test'

interface ProtocolMessage {
  readonly type: string
}

interface ProtocolFixture {
  readonly messages: readonly ProtocolMessage[]
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/protocol/solo-battle.json', import.meta.url), 'utf8')
) as ProtocolFixture

function getMessage(type: string, occurrence = 0): ProtocolMessage {
  const message = fixture.messages.filter(candidate => candidate.type === type)[occurrence]
  if (!message) throw new Error(`Fixture message not found: ${type}[${occurrence}]`)
  return message
}

const populatedBotList = getMessage('BotListUpdate', 2)
const gameStarted = getMessage('GameStartedEventForObserver')
const activeTick = getMessage('TickEventForObserver')
const gameEnded = getMessage('GameEndedEventForObserver')

async function installMockObserverServer(page: Page): Promise<{
  waitForSocket(index: number): Promise<WebSocketRoute>
}> {
  const sockets: WebSocketRoute[] = []
  const waiters = new Map<number, (socket: WebSocketRoute) => void>()

  await page.routeWebSocket(/localhost:\d+/, socket => {
    const index = sockets.length
    sockets.push(socket)
    socket.send(JSON.stringify({
      type: 'ServerHandshake',
      sessionId: `fixture-observer-${index + 1}`,
      name: 'Robocode Tank Royale Server',
      version: '1.0.2',
      gameTypes: ['classic']
    }))
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

function watchBrowserErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

function send(socket: WebSocketRoute, message: ProtocolMessage): void {
  socket.send(JSON.stringify(message))
}

test('an abort cannot restore results from an earlier battle', async ({ page }) => {
  const browserErrors = watchBrowserErrors(page)
  const server = await installMockObserverServer(page)

  await page.goto('/')
  const socket = await server.waitForSocket(0)
  await expect(page.locator('#status')).toHaveText('LIVE')

  send(socket, populatedBotList)
  send(socket, gameStarted)
  send(socket, activeTick)
  send(socket, gameEnded)
  await expect(page.locator('#results-container')).toBeVisible()

  send(socket, gameStarted)
  await expect(page.locator('#results-container')).toBeHidden()
  await expect(page.locator('#arena canvas')).toBeVisible()
  await expect(page.locator('#turn-info')).toHaveText('TURN 0')

  send(socket, activeTick)
  send(socket, { type: 'GameAbortedEvent' })
  await expect(page.locator('#arena canvas')).toBeHidden()
  await expect(page.locator('#round-info')).toBeHidden()
  await expect(page.locator('#turn-info')).toBeHidden()
  await expect(page.locator('#results-container')).toBeHidden()
  await expect(page.locator('#bot-list-container')).toBeVisible()
  await expect(page.locator('#bot-list-container')).not.toHaveClass(/mini/)
  await expect(page.locator('#bot-list tbody')).toContainText('Walls')

  await page.locator('#settings-btn').click()
  await page.locator('#show-ratings').uncheck()
  await expect(page.locator('#results-container')).toBeHidden()

  send(socket, gameStarted)
  await expect(page.locator('#results-container')).toBeHidden()
  await expect(page.locator('#arena canvas')).toBeVisible()
  await expect(page.locator('#turn-info')).toHaveText('TURN 0')
  expect(browserErrors).toEqual([])
})

test('disconnect clears battle state before automatic reconnect', async ({ page }) => {
  const browserErrors = watchBrowserErrors(page)
  const server = await installMockObserverServer(page)

  await page.goto('/')
  const firstSocket = await server.waitForSocket(0)
  await expect(page.locator('#status')).toHaveText('LIVE')

  send(firstSocket, populatedBotList)
  send(firstSocket, gameStarted)
  send(firstSocket, activeTick)
  await expect(page.locator('#turn-info')).toHaveText('TURN 671')

  await firstSocket.close({ code: 1001 })
  await expect(page.locator('#status')).toHaveText('Connecting...')
  await expect(page.locator('#arena canvas')).toBeHidden()
  await expect(page.locator('#round-info')).toBeHidden()
  await expect(page.locator('#turn-info')).toBeHidden()
  await expect(page.locator('#results-container')).toBeHidden()
  await expect(page.locator('#bot-list-container')).toBeHidden()

  await server.waitForSocket(1)
  await expect(page.locator('#status')).toHaveText('LIVE')
  await expect(page.locator('#waiting-message')).toBeVisible()
  await expect(page.locator('#bot-list tbody')).not.toContainText('Walls')
  expect(browserErrors).toEqual([])
})

test('a changed server URL reconnects cleanly and survives reload', async ({ page }) => {
  const browserErrors = watchBrowserErrors(page)
  const server = await installMockObserverServer(page)

  await page.goto('/')
  const firstSocket = await server.waitForSocket(0)
  await expect(page.locator('#status')).toHaveText('LIVE')

  send(firstSocket, populatedBotList)
  send(firstSocket, gameStarted)
  send(firstSocket, activeTick)
  await expect(page.locator('#turn-info')).toHaveText('TURN 671')

  await page.locator('#settings-btn').click()
  const serverUrl = page.locator('#server-url')
  await serverUrl.fill('ws://localhost:7656')
  await serverUrl.press('Tab')

  const secondSocket = await server.waitForSocket(1)
  expect(secondSocket.url()).toBe('ws://localhost:7656/')
  await expect(page.locator('#status')).toHaveText('LIVE')
  await expect(page.locator('#arena canvas')).toBeHidden()
  await expect(page.locator('#round-info')).toBeHidden()
  await expect(page.locator('#turn-info')).toBeHidden()
  await expect(page.locator('#waiting-message')).toBeVisible()

  await page.reload()
  const reloadedSocket = await server.waitForSocket(2)
  expect(reloadedSocket.url()).toBe('ws://localhost:7656/')
  await expect(page.locator('#status')).toHaveText('LIVE')
  await expect(page.locator('#server-url')).toHaveValue('ws://localhost:7656')
  expect(browserErrors).toEqual([])
})
