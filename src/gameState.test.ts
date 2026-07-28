import { describe, it, expect, beforeEach } from 'vitest'
import {
  getState,
  enrichParticipants,
  setGameSetup,
  setParticipants,
  setRound,
  updateTick,
  reset,
  type BotState,
  type BulletState,
} from './gameState'

const bot = (id: number, overrides: Partial<BotState> = {}): BotState => ({
  id,
  energy: 100,
  x: 0,
  y: 0,
  direction: 0,
  gunDirection: 0,
  radarDirection: 0,
  radarSweep: 0,
  speed: 0,
  ...overrides,
})

const bullet = (bulletId: number, overrides: Partial<BulletState> = {}): BulletState => ({
  bulletId,
  ownerId: 1,
  power: 1,
  x: 0,
  y: 0,
  direction: 0,
  ...overrides,
})

describe('gameState', () => {
  beforeEach(() => {
    reset()
  })

  it('starts in a clean initial state', () => {
    const state = getState()
    expect(state.setup).toBeNull()
    expect(state.roundNumber).toBe(0)
    expect(state.turnNumber).toBe(0)
    expect(state.bots.size).toBe(0)
    expect(state.bullets).toEqual([])
    expect(state.participants.size).toBe(0)
  })

  it('setGameSetup stores the setup', () => {
    setGameSetup({ arenaWidth: 800, arenaHeight: 600, numberOfRounds: 10 })
    expect(getState().setup).toEqual({ arenaWidth: 800, arenaHeight: 600, numberOfRounds: 10 })
  })

  it('setParticipants replaces participants by id', () => {
    setParticipants([
      { id: 1, name: 'A', version: '1.0' },
      { id: 2, name: 'B', version: '1.0' },
    ])
    expect(getState().participants.size).toBe(2)

    setParticipants([{ id: 3, name: 'C', version: '1.0' }])
    expect(getState().participants.size).toBe(1)
    expect(getState().participants.get(3)?.name).toBe('C')
    expect(getState().participants.get(1)).toBeUndefined()
  })

  it('enrichParticipants fills missing metadata without replacing authoritative values', () => {
    setParticipants([
      { id: 1, name: 'Authoritative', version: '1.0' },
      { id: 3, name: '', version: '' }
    ])

    enrichParticipants([
      {
        id: 1,
        sessionId: 'session-authoritative',
        name: 'Tick name',
        version: '2.0',
        teamId: 4,
        teamName: 'Tick Team',
        teamVersion: '1.0'
      },
      { id: 2, name: 'Late joiner', version: '1.0' },
      { id: 3, sessionId: 'session-missing', name: 'Filled name', version: '3.0' }
    ])

    expect(getState().participants.get(1)).toMatchObject({
      sessionId: 'session-authoritative',
      name: 'Authoritative',
      version: '1.0',
      teamId: 4,
      teamName: 'Tick Team',
      teamVersion: '1.0'
    })
    expect(getState().participants.get(2)).toMatchObject({ name: 'Late joiner', version: '1.0' })
    expect(getState().participants.get(3)).toMatchObject({
      sessionId: 'session-missing',
      name: 'Filled name',
      version: '3.0'
    })
  })

  it('setRound resets turnNumber', () => {
    updateTick(1, 42, [], [])
    expect(getState().turnNumber).toBe(42)

    setRound(2)
    expect(getState().roundNumber).toBe(2)
    expect(getState().turnNumber).toBe(0)
  })

  it('updateTick replaces bots and bullets (does not merge)', () => {
    updateTick(1, 1, [bot(1), bot(2)], [bullet(10)])
    expect(getState().bots.size).toBe(2)
    expect(getState().bullets.length).toBe(1)

    updateTick(1, 2, [bot(3)], [])
    const state = getState()
    expect(state.turnNumber).toBe(2)
    expect(state.bots.size).toBe(1)
    expect(state.bots.get(3)).toBeDefined()
    expect(state.bots.get(1)).toBeUndefined()
    expect(state.bullets).toEqual([])
  })

  it('reset clears everything', () => {
    setGameSetup({ arenaWidth: 1, arenaHeight: 1, numberOfRounds: 1 })
    setParticipants([{ id: 1, name: 'A', version: '1' }])
    updateTick(3, 7, [bot(1)], [bullet(1)])

    reset()

    const state = getState()
    expect(state.setup).toBeNull()
    expect(state.roundNumber).toBe(0)
    expect(state.turnNumber).toBe(0)
    expect(state.bots.size).toBe(0)
    expect(state.bullets).toEqual([])
    expect(state.participants.size).toBe(0)
  })
})
