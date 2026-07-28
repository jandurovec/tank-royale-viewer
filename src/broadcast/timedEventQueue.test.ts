import { describe, expect, it, vi } from 'vitest'
import { TimedEventQueue } from './timedEventQueue.js'
import type { BattleBroadcastEvent } from './events.js'

const WINNER: BattleBroadcastEvent = { type: 'round-winner', roundNumber: 1, winners: [{ id: 1, isTeam: false, name: 'A' }] }
const LEAD: BattleBroadcastEvent = { type: 'aggregate-lead', leaders: [{ id: 1, isTeam: false, name: 'A' }] }
const HIT: BattleBroadcastEvent = { type: 'bullet-hit', attacker: { id: 1, isTeam: false, name: 'A' }, victim: { id: 2, isTeam: false, name: 'B' }, damage: 4 }
const RAMMING: BattleBroadcastEvent = { type: 'ramming', rammer: { id: 1, isTeam: false, name: 'A' }, victim: { id: 2, isTeam: false, name: 'B' } }
const ELIMINATION: BattleBroadcastEvent = { type: 'elimination', attacker: { id: 1, isTeam: false, name: 'A' }, victim: { id: 2, isTeam: false, name: 'B' } }

describe('TimedEventQueue', () => {
  it('expires each event after exactly five seconds', () => {
    vi.useFakeTimers()
    const changes: BattleBroadcastEvent[][] = []
    const queue = new TimedEventQueue(events => changes.push([...events]))
    queue.add([WINNER])
    vi.advanceTimersByTime(4_999)
    expect(changes.at(-1)).toEqual([WINNER])
    vi.advanceTimersByTime(1)
    expect(changes.at(-1)).toEqual([])
  })

  it('clearing cancels every expiry timer', () => {
    vi.useFakeTimers()
    const listener = vi.fn()
    const queue = new TimedEventQueue(listener)
    queue.add([WINNER, HIT, ELIMINATION])
    queue.clear()
    listener.mockClear()
    vi.advanceTimersByTime(5_000)
    expect(listener).not.toHaveBeenCalled()
  })

  it('expires hits at two seconds and other events at five seconds', () => {
    vi.useFakeTimers()
    const changes: BattleBroadcastEvent[][] = []
    const queue = new TimedEventQueue(events => changes.push([...events]))
    queue.add([WINNER, LEAD, HIT, RAMMING, ELIMINATION])
    vi.advanceTimersByTime(1_999)
    expect(changes.at(-1)).toEqual([WINNER, LEAD, HIT, RAMMING, ELIMINATION])
    vi.advanceTimersByTime(1)
    expect(changes.at(-1)).toEqual([WINNER, LEAD, ELIMINATION])
    vi.advanceTimersByTime(2_999)
    expect(changes.at(-1)).toEqual([WINNER, LEAD, ELIMINATION])
    vi.advanceTimersByTime(1)
    expect(changes.at(-1)).toEqual([])
  })

  it('expires staggered additions independently', () => {
    vi.useFakeTimers()
    const changes: BattleBroadcastEvent[][] = []
    const queue = new TimedEventQueue(events => changes.push([...events]))
    queue.add([HIT])
    vi.advanceTimersByTime(1_000)
    queue.add([ELIMINATION])
    vi.advanceTimersByTime(1_000)
    expect(changes.at(-1)).toEqual([ELIMINATION])
    vi.advanceTimersByTime(3_999)
    expect(changes.at(-1)).toEqual([ELIMINATION])
    vi.advanceTimersByTime(1)
    expect(changes.at(-1)).toEqual([])
  })

  it('removes matching events and cancels only their expiry timers', () => {
    vi.useFakeTimers()
    const changes: BattleBroadcastEvent[][] = []
    const queue = new TimedEventQueue(events => changes.push([...events]))
    queue.add([WINNER, HIT, ELIMINATION])
    queue.removeWhere(event => event.type === 'bullet-hit')
    expect(changes.at(-1)).toEqual([WINNER, ELIMINATION])
    vi.advanceTimersByTime(2_000)
    expect(changes.at(-1)).toEqual([WINNER, ELIMINATION])
    vi.advanceTimersByTime(3_000)
    expect(changes.at(-1)).toEqual([])
  })
})
