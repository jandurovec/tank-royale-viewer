# Progress & Status

This document tracks implementation progress for AI assistants and developers resuming work on this project.

**Last updated:** 2026-02-09

## Current State

**Phase:** 5 (Skill Rating System) - Complete
**Status:** Full battle viewer with skill ratings and tier icons

### What's Working

#### Connection & Protocol
- ✅ WebSocket connection with auto-reconnect (5s interval, 3s timeout)
- ✅ Observer handshake protocol
- ✅ Toast notifications for server errors
- ✅ Game state management (`gameState.ts`)

#### UI & Status
- ✅ Status indicator: pulsing "Connecting..." → green "LIVE" box with drop shadow
- ✅ Round/turn indicator during battle (LIVE | ROUND X | TURN Y)
- ✅ Settings dialog (gear icon): server URL, secret, debug logging, scan opacity slider, show ratings toggle
- ✅ Skill ratings export/import/reset in settings
- ✅ View states: Connecting → Waiting → Battle → Results

#### Bot List
- ✅ Bot list with flags, authors, description, platform icons
- ✅ Skill rating columns: Tier + conservative rating (with μ/σ tooltip)
- ✅ Platform icons: custom SVGs for Java, Python, .NET
- ✅ "Waiting for bots to connect..." pulsing message
- ✅ Auto-scaling to fit viewport

#### Battle Rendering (PixiJS)
- ✅ Arena background with coordinate transform (Y-flip)
- ✅ Full tank rendering matching Kotlin GUI:
  - Body with shading and border
  - Tracks (static links)
  - Turret with shadow and border
  - Gun barrel with shading
  - Radar dish
- ✅ Bot colors from server applied to all parts
- ✅ Energy text above bots
- ✅ Name/version labels below bots
- ✅ Bullet rendering (size based on power)
- ✅ Scan arc rendering with configurable opacity (reduces flickering)

#### Visual Effects
- ✅ Bot death explosions (multi-circle burst)
- ✅ Bullet hit bot effects
- ✅ Bullet hit wall effects
- ✅ Bullet hit bullet effects
- ✅ Color gradient animation (white → yellow → orange → gray → black)

#### Results
- ✅ Full results table with compact bonus columns
- ✅ Skill rating columns: Tier + conservative rating with delta indicators (▲/▼)
- ✅ Medal-style rank indicators (gold/silver/bronze circles) for top 3
- ✅ Bold bot names
- ✅ Mini bot list shown during results (60% scale)
- ✅ Results backdrop overlay

#### Bot Labels
- ✅ Energy value above bot
- ✅ Name/version below bot
- ✅ Health bar below name (green→yellow→red gradient, shrinks toward center)

### File Structure

```
src/
├── main.ts           # Entry point, wires modules together
├── connection.ts     # WebSocket + handshake + reconnect
├── gameState.ts      # Battle state management
├── ui.ts             # DOM manipulation + view states
├── style.css         # Styling
├── settings.ts       # Settings persistence (localStorage)
├── ratings.ts        # Skill rating system (OpenSkill, localStorage, Unranked handling)
├── tiers.ts          # Pure tier calculation (value-based percentiles, caching)
├── assets/           # Platform icons (java.svg, python.svg, dotnet.svg)
└── rendering/
    ├── index.ts      # PixiJS app lifecycle, orchestration
    ├── arena.ts      # Arena background rendering
    ├── tank.ts       # Full tank graphics (body, turret, gun, radar, tracks)
    ├── bullets.ts    # Bullet rendering
    ├── effects.ts    # Explosions and burst effects
    └── colors.ts     # Color utilities (HSL manipulation, parsing)
```

## Implementation Phases

### Phase 1: MVP Core Viewer ✅

- [x] WebSocket connection with auto-reconnect
- [x] Observer handshake
- [x] Status indicator (Connecting/LIVE)
- [x] Settings dialog (URL, secret, debug)
- [x] Error notifications (toast)
- [x] Bot list with flags and authors
- [x] Results table
- [x] View states: Connecting → Waiting → Battle → Results
- [x] Game state management (`gameState.ts`)
- [x] PixiJS renderer setup
- [x] Bullet rendering (size based on power)
- [x] Arena rendering with coordinate transform (Y-flip)

### Phase 2: Tank Rendering ✅

- [x] Tank body with tracks (matching Kotlin)
- [x] Turret (independent rotation)
- [x] Gun barrel with shading
- [x] Radar dish (independent rotation)
- [x] Bot colors from server applied to all parts
- [x] HSL color utilities for shading effects

### Phase 3: Visual Effects ✅

- [x] Scan arc rendering with configurable opacity
- [x] Explosion particles on bot death
- [x] Bullet hit effects (bot, wall, bullet)
- [x] Round/turn indicator

### Phase 4: Polish ✅

- [x] Energy value text above bots
- [x] Health bar below name (green→yellow→red gradient)
- [x] Health bar shrinks toward center as HP decreases
- [x] Droid max HP (120) vs normal bot max HP (100) supported

### Phase 5: Skill Rating System ✅

Using OpenSkill library (patent-free Weng-Lin Bayesian ranking).

- [x] Install openskill, create `ratings.ts` module
- [x] Rating parameters: mu=1200, sigma=400, beta=100, z=3, indexed by bot name
- [x] Beta=100 for faster convergence (bot battles are mostly skill-determined)
- [x] Version change handling: keep mu, reset sigma
- [x] Rank tiers based on value-based percentiles among fully-ranked bots:
  - Scrap (bottom 20%), Rookie (20-60%), Veteran (60-80%), Elite (80-95%), Legend (top 5%)
  - Percentile formula: threshold = min + (percentile/100) × (max - min)
  - Minimum bot counts for tiers: 2=Veteran, 3=Elite, 4=Scrap, 5=Legend
  - Ranked games threshold configurable in settings (default: 20)
  - Provisional games threshold configurable in settings (default: 50)
  - Provisional ranks shown with 50% opacity icon and "Provisional [Tier]" tooltip
  - Unranked bots have dimmed rating display (50% opacity)
- [x] Module separation: tiers.ts (pure calculation) vs ratings.ts (storage + Unranked logic)
- [x] Debug logging for tier calculations (eligible bots, thresholds, assignments)
- [x] Games counter: tracks number of ranked games per bot
- [x] Update ratings on GameEndedEventForObserver
- [x] Bot list table: add rank + mu columns
- [x] Results table: add rank + mu + change indicator (▲/▼)
- [x] Settings: export/import JSON, reset ratings
- [x] Rank tier PNG icons (hexagon badges with progression):
  - Unranked: shown for bots with < 20 games
  - Scrap: rusty brown with rust spots
  - Rookie: gray with chevron
  - Veteran: silver with star
  - Elite: gold with star + wings
  - Legend: ornate gold with star + wings + laurel

### Phase 6: Arena Background (Not Started)

- [ ] Upload PNG image in settings
- [ ] Store as base64 in localStorage
- [ ] Display behind arena during battle
- [ ] Clear/reset option

## Key Technical Decisions

1. **PixiJS v8** for GPU-accelerated rendering (CPU reserved for bots/server)
2. **Modular rendering system** - separate files for arena, tanks, bullets, effects, colors
3. **Coordinate transform:** `screenY = arenaHeight - gameY` (Tank Royale is Y-up, PixiJS is Y-down)
4. **TPS/FPS decoupling:** Game state updated every tick, renderer runs at 60fps showing latest state
5. **Tick-based effects:** Effects use game turn numbers, not real time, for consistent playback
6. **Configurable scan opacity:** Slider (0-100%) to reduce visual flickering on large displays

## Testing

Run viewer against Tank Royale server:
```bash
npm run dev                    # Start viewer at http://localhost:5173
java -jar robocode-tankroyale-gui-x.y.z.jar  # Start server
```

Default server URL: `ws://localhost:7654`

## Reference Docs

- `docs/ARCHITECTURE.md` - Design decisions, UX vision, view states
- `docs/PROTOCOL.md` - Tank Royale WebSocket protocol messages
- `docs/DEVELOPMENT.md` - Dev setup
- `AGENTS.md` - Coding conventions for AI assistants
