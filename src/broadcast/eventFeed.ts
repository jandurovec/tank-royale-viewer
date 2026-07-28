import { getFeedPosition, type ArenaViewportRect } from './feedPosition.js'
import type { BattleBroadcastEvent } from './events.js'

export interface BattleEventFeedItem {
  readonly parts: readonly BattleEventFeedPart[]
  readonly text: string
  readonly type: BattleBroadcastEvent['type']
}

export interface BattleEventFeedPart {
  readonly kind: 'name' | 'text'
  readonly text: string
}

export class BattleEventFeed {
  private readonly element: HTMLElement
  private readonly resizeObserver: ResizeObserver
  private arenaRect: ArenaViewportRect | null = null

  public constructor(element: HTMLElement) {
    this.element = element
    this.resizeObserver = new ResizeObserver(() => this.reposition())
    this.resizeObserver.observe(element)
    window.addEventListener('resize', this.reposition)
    document.addEventListener('fullscreenchange', this.reposition)
  }

  public setItems(items: readonly BattleEventFeedItem[]): void {
    this.element.replaceChildren(...items.map(item => {
      const card = document.createElement('div')
      card.className = `battle-event-feed-card battle-event-feed-card--${item.type}`
      card.replaceChildren(...item.parts.map(part => {
        if (part.kind === 'text') return document.createTextNode(part.text)
        const name = document.createElement('strong')
        name.textContent = part.text
        return name
      }))
      return card
    }))
  }

  public setArenaRect(rect: ArenaViewportRect | null): void {
    this.arenaRect = rect
    this.reposition()
  }

  public reposition = (): void => {
    const position = getFeedPosition(this.arenaRect, {
      width: window.innerWidth,
      height: window.innerHeight
    }, getFeedMinimumWidth())

    this.element.style.left = `${position.left}px`
    this.element.style.bottom = `${position.bottom}px`
    this.element.style.width = `${position.width}px`
  }

  public clear(): void {
    this.element.replaceChildren()
  }

  public destroy(): void {
    this.resizeObserver.disconnect()
    window.removeEventListener('resize', this.reposition)
    document.removeEventListener('fullscreenchange', this.reposition)
  }
}

function getFeedMinimumWidth(): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--battle-event-feed-min-width'))
  return Number.isFinite(value) && value >= 0 ? value : 0
}

export function presentBattleEvents(events: readonly BattleBroadcastEvent[]): readonly BattleEventFeedItem[] {
  return events.map(event => {
    if (event.type === 'bullet-hit') return createItem(event.type, [
      namePart(event.attacker.name), textPart(' hit '), namePart(event.victim.name), textPart(` · ${formatDamage(event.damage)} damage`)
    ])
    if (event.type === 'ramming') return createItem(event.type, [
      namePart(event.rammer.name), textPart(' rammed '), namePart(event.victim.name)
    ])
    if (event.type === 'elimination') return createItem(event.type, event.attacker === undefined
      ? [namePart(event.victim.name), textPart(' eliminated')]
      : [namePart(event.attacker.name), textPart(' eliminated '), namePart(event.victim.name)])
    const names = event.type === 'round-winner' ? event.winners.map(winner => winner.name) : event.leaders.map(leader => leader.name)
    const nameParts = joinNameParts(names)
    if (event.type === 'round-winner') return createItem(event.type, [...nameParts, textPart(` won Round ${event.roundNumber}`)])
    return createItem(event.type, [...nameParts, textPart(names.length === 1 ? ' takes the aggregate lead' : ' share the aggregate lead')])
  })
}

function createItem(type: BattleBroadcastEvent['type'], parts: readonly BattleEventFeedPart[]): BattleEventFeedItem {
  return { type, parts, text: parts.map(part => part.text).join('') }
}

function namePart(text: string): BattleEventFeedPart {
  return { kind: 'name', text }
}

function textPart(text: string): BattleEventFeedPart {
  return { kind: 'text', text }
}

function joinNameParts(names: readonly string[]): readonly BattleEventFeedPart[] {
  return names.flatMap((name, index) => index === 0 ? [namePart(name)] : [textPart(', '), namePart(name)])
}

function formatDamage(damage: number): string {
  return damage.toFixed(1).replace(/\.0$/, '')
}
