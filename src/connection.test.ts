import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createConnection } from './connection'

const RETRY_INTERVAL = 5000
const CONNECT_TIMEOUT = 3000

interface FakeCloseEvent {
  code: number
  reason: string
}

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  url: string
  readyState: number = FakeWebSocket.CONNECTING
  sent: string[] = []
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: ((ev: FakeCloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  closeCalls = 0

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closeCalls++
    this.readyState = FakeWebSocket.CLOSED
  }

  // Convenience helpers for tests
  open(): void {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  message(payload: object): void {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }

  triggerClose(reason = ''): void {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code: 1000, reason })
  }
}

function makeCallbacks() {
  return {
    onConnecting: vi.fn(),
    onConnected: vi.fn(),
    onDisconnected: vi.fn(),
    onError: vi.fn(),
    onMessage: vi.fn(),
    debug: vi.fn(),
  }
}

const SERVER_HANDSHAKE = {
  type: 'ServerHandshake',
  sessionId: 'sess-123',
  name: 'Robocode Tank Royale Server',
  version: '0.1.0',
}

beforeEach(() => {
  FakeWebSocket.instances.length = 0
  vi.stubGlobal('WebSocket', FakeWebSocket)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createConnection - basic lifecycle', () => {
  it('opens a WebSocket and reports connecting', () => {
    const cb = makeCallbacks()
    const conn = createConnection(cb)
    conn.connect('ws://localhost:7654')

    expect(cb.onConnecting).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toBe('ws://localhost:7654')
    expect(conn.isConnected()).toBe(false)
  })

  it('reports connected after open + ServerHandshake', () => {
    const cb = makeCallbacks()
    const conn = createConnection(cb)
    conn.connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]

    ws.open()
    ws.message(SERVER_HANDSHAKE)

    expect(cb.onConnected).toHaveBeenCalledTimes(1)
    expect(cb.onConnected).toHaveBeenCalledWith(null)
    expect(conn.isConnected()).toBe(true)
  })
})

describe('handshake response', () => {
  it('forwards the exact game setup from ServerHandshake', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    const gameSetup = { arenaWidth: 1200, arenaHeight: 800, numberOfRounds: 3 }

    ws.open()
    ws.message({ ...SERVER_HANDSHAKE, gameSetup })

    expect(cb.onConnected).toHaveBeenCalledWith(gameSetup)
  })

  it('sends an ObserverHandshake with sessionId, name, version (no secret by default)', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.message(SERVER_HANDSHAKE)

    expect(ws.sent).toHaveLength(1)
    const sent = JSON.parse(ws.sent[0])
    expect(sent.type).toBe('ObserverHandshake')
    expect(sent.sessionId).toBe('sess-123')
    expect(sent.name).toBeTypeOf('string')
    expect(sent.name.length).toBeGreaterThan(0)
    expect(sent.version).toBeTypeOf('string')
    expect('secret' in sent).toBe(false)
  })

  it('includes the secret only when one was provided to connect()', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654', 's3cret')
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.message(SERVER_HANDSHAKE)

    const sent = JSON.parse(ws.sent[0])
    expect(sent.secret).toBe('s3cret')
  })
})

describe('message routing', () => {
  it('routes non-handshake messages to onMessage', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.message(SERVER_HANDSHAKE)

    const tick = { type: 'TickEventForObserver', roundNumber: 1, turnNumber: 5 }
    ws.message(tick)

    expect(cb.onMessage).toHaveBeenCalledTimes(1)
    expect(cb.onMessage).toHaveBeenCalledWith(tick)
  })

  it('does NOT route the ServerHandshake itself through onMessage', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.message(SERVER_HANDSHAKE)

    expect(cb.onMessage).not.toHaveBeenCalled()
  })
})

describe('disconnect / reconnect behaviour', () => {
  it('fires onDisconnected and schedules a retry after RETRY_INTERVAL', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.message(SERVER_HANDSHAKE)

    ws.triggerClose()

    expect(cb.onDisconnected).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(1)

    vi.advanceTimersByTime(RETRY_INTERVAL)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(cb.onConnecting).toHaveBeenCalledTimes(2)
  })

  it('reports the close reason via onError before onDisconnected', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.message(SERVER_HANDSHAKE)

    ws.triggerClose('bad credentials')

    expect(cb.onError).toHaveBeenCalledWith('bad credentials')
    expect(cb.onError.mock.invocationCallOrder[0]).toBeLessThan(
      cb.onDisconnected.mock.invocationCallOrder[0]
    )
  })

  it('disconnect() cancels pending retry and does not fire onDisconnected again', () => {
    const cb = makeCallbacks()
    const conn = createConnection(cb)
    conn.connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.message(SERVER_HANDSHAKE)
    ws.triggerClose()

    expect(cb.onDisconnected).toHaveBeenCalledTimes(1)

    conn.disconnect()
    vi.advanceTimersByTime(RETRY_INTERVAL * 2)

    // No new socket created and no extra onDisconnected fired
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(cb.onDisconnected).toHaveBeenCalledTimes(1)
  })

  it('connect() to a new URL closes the previous socket and opens a fresh one', () => {
    const cb = makeCallbacks()
    const conn = createConnection(cb)

    conn.connect('ws://first')
    const first = FakeWebSocket.instances[0]
    first.open()
    first.message(SERVER_HANDSHAKE)

    conn.connect('ws://second')
    expect(first.closeCalls).toBeGreaterThan(0)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[1].url).toBe('ws://second')
  })
})

describe('connect timeout', () => {
  it('closes a socket that is still CONNECTING after CONNECT_TIMEOUT', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]

    expect(ws.closeCalls).toBe(0)
    expect(ws.readyState).toBe(FakeWebSocket.CONNECTING)

    vi.advanceTimersByTime(CONNECT_TIMEOUT)

    expect(ws.closeCalls).toBe(1)
  })

  it('does not close a socket that has already opened', () => {
    const cb = makeCallbacks()
    createConnection(cb).connect('ws://localhost:7654')
    const ws = FakeWebSocket.instances[0]
    ws.open()

    vi.advanceTimersByTime(CONNECT_TIMEOUT)

    expect(ws.closeCalls).toBe(0)
  })
})
