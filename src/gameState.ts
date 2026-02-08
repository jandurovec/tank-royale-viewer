export interface BotState {
  id: number
  energy: number
  x: number
  y: number
  direction: number
  gunDirection: number
  radarDirection: number
  radarSweep: number
  speed: number
  isDroid?: boolean
  bodyColor?: string
  turretColor?: string
  radarColor?: string
  bulletColor?: string
  scanColor?: string
  tracksColor?: string
  gunColor?: string
}

export interface BulletState {
  bulletId: number
  ownerId: number
  power: number
  x: number
  y: number
  direction: number
  color?: string
}

export interface GameSetup {
  arenaWidth: number
  arenaHeight: number
  numberOfRounds: number
}

export interface Participant {
  id: number
  name: string
  version: string
}

export interface GameState {
  setup: GameSetup | null
  roundNumber: number
  turnNumber: number
  bots: Map<number, BotState>
  bullets: BulletState[]
  participants: Map<number, Participant>
}

const state: GameState = {
  setup: null,
  roundNumber: 0,
  turnNumber: 0,
  bots: new Map(),
  bullets: [],
  participants: new Map()
}

export function getState(): GameState {
  return state
}

export function setGameSetup(setup: GameSetup): void {
  state.setup = setup
}

export function setParticipants(participants: Participant[]): void {
  state.participants.clear()
  for (const p of participants) {
    state.participants.set(p.id, p)
  }
}

export function setRound(roundNumber: number): void {
  state.roundNumber = roundNumber
  state.turnNumber = 0
}

export function updateTick(roundNumber: number, turnNumber: number, botStates: BotState[], bulletStates: BulletState[]): void {
  state.roundNumber = roundNumber
  state.turnNumber = turnNumber
  state.bots.clear()
  for (const bot of botStates) {
    state.bots.set(bot.id, bot)
  }
  state.bullets = bulletStates
}

export function reset(): void {
  state.setup = null
  state.roundNumber = 0
  state.turnNumber = 0
  state.bots.clear()
  state.bullets = []
  state.participants.clear()
}
