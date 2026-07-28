import type { BattleBroadcastEvent } from './events.js'

export type QueueListener = (events: readonly BattleBroadcastEvent[]) => void

export class TimedEventQueue {
  private readonly timeouts = new Map<BattleBroadcastEvent, ReturnType<typeof setTimeout>>()
  private events: BattleBroadcastEvent[] = []
  private readonly onChange: QueueListener
  private readonly defaultLifetimeMs: number

  public constructor(onChange: QueueListener, defaultLifetimeMs = 5_000) {
    this.onChange = onChange
    this.defaultLifetimeMs = defaultLifetimeMs
  }

  public add(events: readonly BattleBroadcastEvent[]): void {
    if (events.length === 0) return
    this.events.push(...events)
    for (const event of events) this.timeouts.set(event, setTimeout(() => this.remove(event), this.getLifetimeMs(event)))
    this.onChange(this.events)
  }

  public clear(): void {
    for (const timeout of this.timeouts.values()) clearTimeout(timeout)
    this.timeouts.clear()
    if (this.events.length === 0) return
    this.events = []
    this.onChange(this.events)
  }

  public removeWhere(predicate: (event: BattleBroadcastEvent) => boolean): void {
    const removed = this.events.filter(predicate)
    if (removed.length === 0) return
    for (const event of removed) {
      const timeout = this.timeouts.get(event)
      if (timeout !== undefined) clearTimeout(timeout)
      this.timeouts.delete(event)
    }
    this.events = this.events.filter(event => !predicate(event))
    this.onChange(this.events)
  }

  public destroy(): void { this.clear() }

  private remove(event: BattleBroadcastEvent): void {
    this.timeouts.delete(event)
    this.events = this.events.filter(candidate => candidate !== event)
    this.onChange(this.events)
  }

  private getLifetimeMs(event: BattleBroadcastEvent): number {
    if (event.type === 'bullet-hit' || event.type === 'ramming') return 2_000
    return this.defaultLifetimeMs
  }
}
