import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page, WebSocketRoute } from '@playwright/test'

interface ProtocolMessage {
  readonly type: string
}

interface ProtocolFixture {
  readonly messages: readonly ProtocolMessage[]
}

function loadFixture(name: string): ProtocolFixture {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/protocol/${name}`, import.meta.url), 'utf8')
  ) as ProtocolFixture
}

const teamFixture = loadFixture('team-id-collision-battle.json')
const tiedFixture = loadFixture('tied-results.json')

async function openViewer(page: Page): Promise<WebSocketRoute> {
  let resolveSocket!: (socket: WebSocketRoute) => void
  const socketReady = new Promise<WebSocketRoute>(resolve => {
    resolveSocket = resolve
  })

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
  await expect(page.locator('#status')).toHaveText('LIVE')
  return socket
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

test('distinguishes a team from a solo bot with the same ID', async ({ page }) => {
  const browserErrors = watchBrowserErrors(page)
  const socket = await openViewer(page)

  for (const message of teamFixture.messages) {
    send(socket, message)
  }

  const rows = page.locator('#results-table tbody tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Alpha Team')
  await expect(rows.nth(0).locator('.team-indicator')).toHaveCount(1)
  await expect(rows.nth(1)).toContainText('Solo')
  await expect(rows.nth(1).locator('.team-indicator')).toHaveCount(0)
  expect(browserErrors).toEqual([])
})

test('shows shared placements for equal scores', async ({ page }) => {
  const browserErrors = watchBrowserErrors(page)
  const socket = await openViewer(page)

  for (const message of tiedFixture.messages) {
    send(socket, message)
  }

  const rows = page.locator('#results-table tbody tr')
  await expect(rows).toHaveCount(4)
  await expect(rows.nth(0)).toContainText('Winner')
  await expect(rows.nth(0).locator('td').nth(0)).toHaveText('1')
  await expect(rows.nth(1)).toContainText('Tied Alpha')
  await expect(rows.nth(1).locator('td').nth(0)).toHaveText('2')
  await expect(rows.nth(2)).toContainText('Tied Bravo')
  await expect(rows.nth(2).locator('td').nth(0)).toHaveText('2')
  await expect(rows.nth(3)).toContainText('Fourth')
  await expect(rows.nth(3).locator('td').nth(0)).toHaveText('4')
  expect(browserErrors).toEqual([])
})
