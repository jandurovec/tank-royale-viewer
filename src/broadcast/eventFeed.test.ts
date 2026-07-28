import { describe, expect, it, vi } from 'vitest'
import { BattleEventFeed, presentBattleEvents } from './eventFeed.js'

describe('presentBattleEvents', () => {
  it('reads the lane minimum from the semantic CSS custom property', () => {
    vi.stubGlobal('ResizeObserver', class {
      public observe(): void {}
      public disconnect(): void {}
    })
    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('innerHeight', 800)
    document.documentElement.style.setProperty('--battle-event-feed-min-width', '230px')
    const feedElement = document.createElement('div')
    const feed = new BattleEventFeed(feedElement)

    feed.setArenaRect({ left: 100, top: 50, right: 972, bottom: 650, width: 872, height: 600 })

    expect(feedElement.style.width).toBe('230px')
    expect(feedElement.style.left).toBe('954px')
    feed.destroy()
    document.documentElement.style.removeProperty('--battle-event-feed-min-width')
  })

  it('uses a zero-width fallback for an invalid CSS minimum', () => {
    vi.stubGlobal('ResizeObserver', class {
      public observe(): void {}
      public disconnect(): void {}
    })
    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('innerHeight', 800)
    document.documentElement.style.setProperty('--battle-event-feed-min-width', 'invalid')
    const feedElement = document.createElement('div')
    const feed = new BattleEventFeed(feedElement)

    feed.setArenaRect(null)

    expect(feedElement.style.width).toBe('0px')
    expect(feedElement.style.left).toBe('1184px')
    feed.destroy()
    document.documentElement.style.removeProperty('--battle-event-feed-min-width')
  })

  it('preserves the compact wording while marking every participant name', () => {
    const fireBot = { id: 1, isTeam: false, name: 'FireBot' }
    const crazyBot = { id: 2, isTeam: false, name: 'CrazyBot' }
    const specialBot = { id: 3, isTeam: false, name: '<Strong & Safe>' }
    const items = presentBattleEvents([
      { type: 'bullet-hit', attacker: fireBot, victim: crazyBot, damage: 10 },
      { type: 'elimination', attacker: fireBot, victim: crazyBot },
      { type: 'elimination', victim: specialBot },
      { type: 'round-winner', roundNumber: 3, winners: [fireBot, crazyBot] },
      { type: 'aggregate-lead', leaders: [fireBot] },
      { type: 'aggregate-lead', leaders: [fireBot, specialBot] }
    ])

    expect(items.map(item => item.text)).toEqual([
      'FireBot hit CrazyBot · 10 damage',
      'FireBot eliminated CrazyBot',
      '<Strong & Safe> eliminated',
      'FireBot, CrazyBot won Round 3',
      'FireBot takes the aggregate lead',
      'FireBot, <Strong & Safe> share the aggregate lead'
    ])
    expect(items.map(item => item.parts)).toEqual([
      [{ kind: 'name', text: 'FireBot' }, { kind: 'text', text: ' hit ' }, { kind: 'name', text: 'CrazyBot' }, { kind: 'text', text: ' · 10 damage' }],
      [{ kind: 'name', text: 'FireBot' }, { kind: 'text', text: ' eliminated ' }, { kind: 'name', text: 'CrazyBot' }],
      [{ kind: 'name', text: '<Strong & Safe>' }, { kind: 'text', text: ' eliminated' }],
      [{ kind: 'name', text: 'FireBot' }, { kind: 'text', text: ', ' }, { kind: 'name', text: 'CrazyBot' }, { kind: 'text', text: ' won Round 3' }],
      [{ kind: 'name', text: 'FireBot' }, { kind: 'text', text: ' takes the aggregate lead' }],
      [{ kind: 'name', text: 'FireBot' }, { kind: 'text', text: ', ' }, { kind: 'name', text: '<Strong & Safe>' }, { kind: 'text', text: ' share the aggregate lead' }]
    ])
  })

  it('renders name parts as literal strong elements without HTML injection', () => {
    vi.stubGlobal('ResizeObserver', class {
      public observe(): void {}
      public disconnect(): void {}
    })
    const feedElement = document.createElement('div')
    const feed = new BattleEventFeed(feedElement)
    feed.setItems(presentBattleEvents([{
      type: 'bullet-hit',
      attacker: { id: 1, isTeam: false, name: '<strong>Not markup</strong>' },
      victim: { id: 2, isTeam: false, name: 'A & B' },
      damage: 4
    }]))

    const card = feedElement.firstElementChild!
    expect(card.textContent).toBe('<strong>Not markup</strong> hit A & B · 4 damage')
    expect(card.querySelectorAll('strong')).toHaveLength(2)
    expect([...card.querySelectorAll('strong')].map(name => name.textContent)).toEqual(['<strong>Not markup</strong>', 'A & B'])
    expect(card.querySelectorAll('strong strong')).toHaveLength(0)
    feed.destroy()
  })

  it('renders ramming names as safe strong elements', () => {
    vi.stubGlobal('ResizeObserver', class {
      public observe(): void {}
      public disconnect(): void {}
    })
    const feedElement = document.createElement('div')
    const feed = new BattleEventFeed(feedElement)
    feed.setItems(presentBattleEvents([{
      type: 'ramming',
      rammer: { id: 1, isTeam: false, name: '<Ram>' },
      victim: { id: 2, isTeam: false, name: 'Wall & Bot' }
    }]))

    const card = feedElement.firstElementChild!
    expect(card.textContent).toBe('<Ram> rammed Wall & Bot')
    expect(card.querySelectorAll('strong')).toHaveLength(2)
    expect([...card.querySelectorAll('strong')].map(name => name.textContent)).toEqual(['<Ram>', 'Wall & Bot'])
    feed.destroy()
  })
})
