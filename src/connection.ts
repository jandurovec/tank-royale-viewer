const RETRY_INTERVAL = 5000
const CONNECT_TIMEOUT = 3000
const VIEWER_NAME = 'Tank Royale Viewer'
const VIEWER_VERSION = '0.1.0'

export interface ConnectionCallbacks {
  onConnecting: () => void
  onConnected: () => void
  onDisconnected: () => void
  onError: (message: string) => void
  onMessage: (msg: unknown) => void
  debug: (...args: unknown[]) => void
}

export interface Connection {
  connect: (url: string, secret?: string) => void
  disconnect: () => void
  isConnected: () => boolean
}

export function createConnection(callbacks: ConnectionCallbacks): Connection {
  let ws: WebSocket | null = null
  let pendingSocket: WebSocket | null = null
  let retryTimeout: number | null = null
  let sessionId: string | null = null
  let currentUrl = ''
  let currentSecret = ''

  function handleMessage(data: string) {
    const msg = JSON.parse(data)
    callbacks.debug('Received:', msg.type, msg)

    if (msg.type === 'ServerHandshake') {
      sessionId = msg.sessionId
      const handshake: Record<string, string> = {
        type: 'ObserverHandshake',
        sessionId: sessionId!,
        name: VIEWER_NAME,
        version: VIEWER_VERSION
      }
      if (currentSecret) {
        handshake.secret = currentSecret
      }
      callbacks.debug('Sending:', handshake)
      ws?.send(JSON.stringify(handshake))
      callbacks.onConnected()
    } else {
      callbacks.onMessage(msg)
    }
  }

  function cancelPending() {
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
    if (pendingSocket) {
      pendingSocket.onopen = null
      pendingSocket.onclose = null
      pendingSocket.onmessage = null
      pendingSocket.close()
      pendingSocket = null
    }
  }

  function attemptConnect() {
    cancelPending()
    callbacks.onConnecting()

    const socket = new WebSocket(currentUrl)
    pendingSocket = socket

    const timeout = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }, CONNECT_TIMEOUT)

    socket.onopen = () => {
      callbacks.debug('WebSocket connected')
      clearTimeout(timeout)
      pendingSocket = null
      ws = socket
    }

    socket.onmessage = (e) => handleMessage(e.data)

    socket.onclose = (e) => {
      callbacks.debug('WebSocket closed:', e.code, e.reason)
      clearTimeout(timeout)
      if (socket === ws) {
        ws = null
        sessionId = null
      }
      if (socket === pendingSocket) {
        pendingSocket = null
      }

      if (e.reason) {
        callbacks.onError(e.reason)
      }

      if (!ws && !pendingSocket) {
        callbacks.onDisconnected()
        retryTimeout = setTimeout(attemptConnect, RETRY_INTERVAL) as unknown as number
      }
    }

    socket.onerror = (e) => {
      callbacks.debug('WebSocket error:', e)
    }
  }

  return {
    connect(url: string, secret?: string) {
      currentUrl = url
      currentSecret = secret || ''
      if (ws) {
        ws.onclose = null
        ws.close()
        ws = null
      }
      attemptConnect()
    },

    disconnect() {
      cancelPending()
      if (ws) {
        ws.onclose = null
        ws.close()
        ws = null
      }
      sessionId = null
    },

    isConnected() {
      return ws !== null && ws.readyState === WebSocket.OPEN
    }
  }
}
