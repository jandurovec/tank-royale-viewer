import { describe, expect, it } from 'vitest'
import { RoundTracker, type RoundResult } from './roundTracker.js'

function result(id: number, name: string, firstPlaces: number, totalScore: number, isTeam = false): RoundResult {
  return { id, name, firstPlaces, totalScore, isTeam }
}

describe('RoundTracker', () => {
  it('finds first-round winners from first-place deltas without using rank or score', () => {
    const tracker = new RoundTracker()
    expect(tracker.process(1, [result(1, 'A', 1, 10), result(2, 'B', 0, 100)])).toMatchObject([
      { type: 'round-winner', roundNumber: 1, winners: [{ id: 1, name: 'A' }] }
    ])
  })

  it('finds later winners from accumulated first places', () => {
    const tracker = new RoundTracker()
    tracker.process(1, [result(1, 'A', 1, 100), result(2, 'B', 0, 90)])
    expect(tracker.process(2, [result(1, 'A', 1, 150), result(2, 'B', 1, 200)])).toMatchObject([
      { type: 'round-winner', roundNumber: 2, winners: [{ id: 2, name: 'B' }] },
      { type: 'aggregate-lead', leaders: [{ id: 2, name: 'B' }] }
    ])
  })

  it('keeps tied, same-name, and bot/team-colliding winners distinct', () => {
    const tracker = new RoundTracker()
    expect(tracker.process(1, [result(7, 'Clone', 1, 20), result(7, 'Clone', 1, 20, true)])).toMatchObject([
      { type: 'round-winner', winners: [{ id: 7, isTeam: false }, { id: 7, isTeam: true }] }
    ])
  })

  it('does not produce a winner when no first-place total increases', () => {
    const tracker = new RoundTracker()
    tracker.process(1, [result(1, 'A', 1, 100)])
    expect(tracker.process(2, [result(1, 'A', 1, 200)])).toEqual([])
  })

  it('establishes round-one leaders silently and announces a new sole leader', () => {
    const tracker = new RoundTracker()
    expect(tracker.process(1, [result(1, 'A', 0, 100), result(2, 'B', 0, 90)])).toEqual([])
    expect(tracker.process(2, [result(1, 'A', 0, 110), result(2, 'B', 0, 120)])).toMatchObject([
      { type: 'aggregate-lead', leaders: [{ id: 2, name: 'B' }] }
    ])
  })

  it('announces tied leaders if one newly enters and ignores unchanged or shrinking leaders', () => {
    const tracker = new RoundTracker()
    tracker.process(1, [result(1, 'A', 0, 100), result(2, 'B', 0, 90)])
    expect(tracker.process(2, [result(1, 'A', 0, 120), result(2, 'B', 0, 120)])).toMatchObject([
      { type: 'aggregate-lead', leaders: [{ name: 'A' }, { name: 'B' }] }
    ])
    expect(tracker.process(3, [result(1, 'A', 0, 130), result(2, 'B', 0, 120)])).toEqual([])
  })

  it('sorts tied identities by name and then identity', () => {
    const tracker = new RoundTracker()
    expect(tracker.process(1, [result(2, 'Zulu', 1, 1), result(4, 'Alpha', 1, 1), result(3, 'Alpha', 1, 1)])).toMatchObject([
      { winners: [{ id: 3, name: 'Alpha' }, { id: 4, name: 'Alpha' }, { id: 2, name: 'Zulu' }] }
    ])
  })
})
