# Progress & Status

This document tracks implementation progress for AI assistants and developers resuming work on this project.

**Last updated:** 2026-02-08

## Current State

**Phase:** 1 (MVP) - In Progress
**Status:** Core viewer complete (no battle rendering), results display working

### What's Working

- ✅ Vite + TypeScript project setup
- ✅ WebSocket connection with auto-reconnect (5s interval, 3s timeout)
- ✅ Observer handshake protocol
- ✅ Status indicator: pulsing "Connecting..." → green "LIVE" box
- ✅ Settings dialog (gear icon): server URL, secret, debug logging
- ✅ Toast notifications for server errors
- ✅ Bot list with flags, authors, description, platform icons (`BotListUpdate`)
- ✅ Platform icons: custom SVGs for Java, Python, .NET
- ✅ "Connected Bots" header (hidden when waiting)
- ✅ "Waiting for bots to connect..." pulsing message
- ✅ "Battle in progress..." pulsing message (`GameStartedEventForObserver`)
- ✅ Full results table (`GameEndedEventForObserver`)
- ✅ Mini bot list shown during results (60% scale, updates live)
- ✅ Results backdrop overlay for visual clarity
- ✅ Auto-scaling: bot list and results scale down to fit viewport
- ✅ Game abort handling (`GameAbortedEvent`)
- ✅ View states: Connecting → Waiting → Battle → Results

### File Structure

```
src/
├── main.ts           # Entry point, wires modules together (~65 lines)
├── connection.ts     # WebSocket + handshake + reconnect (~140 lines)
├── ui.ts             # DOM manipulation + view states (~230 lines)
├── style.css         # Styling (~360 lines)
└── assets/           # Platform icons (java.svg, python.svg, dotnet.svg)
```

## Implementation Phases

### Phase 1: MVP Core Viewer (Current)

- [x] WebSocket connection with auto-reconnect
- [x] Observer handshake
- [x] Status indicator (Connecting/LIVE)
- [x] Settings dialog (URL, secret, debug)
- [x] Error notifications (toast)
- [x] Code modularization
- [x] Bot list with flags and authors
- [x] "Battle in progress" placeholder
- [x] Full results table (all score columns)
- [x] View states: Connecting → Waiting → Battle → Results
- [ ] Game state management (`gameState.ts`)
- [ ] PixiJS renderer setup (`renderer.ts`)
- [ ] Simple bot shapes (circle + direction line)
- [ ] Bullet rendering (size based on power)
- [ ] Arena rendering with coordinate transform (Y-flip)

### Phase 2: Tank Sprites

- [ ] Replace circles with tank body sprites
- [ ] Turret sprite (independent rotation)
- [ ] Radar dish sprite (independent rotation)
- [ ] Bot colors from server applied to sprites

### Phase 3: Visual Effects

- [ ] Scan arc rendering
- [ ] Explosion particles on bot death
- [ ] Hit effects
- [ ] Smooth animations/interpolation

### Phase 4: HP Bar

- [ ] Health bar above bots (green → red gradient)
- [ ] Energy value text

### Phase 5: TrueSkill Ratings

- [ ] Local TrueSkill implementation
- [ ] localStorage persistence
- [ ] Display in bot list (star rating or tier icons)
- [ ] Export/import JSON

## Key Technical Decisions

1. **PixiJS v8** for GPU-accelerated rendering (CPU reserved for bots/server)
2. **Callback-based module communication** (KISS over EventEmitter)
3. **Coordinate transform:** `screenY = arenaHeight - gameY` (Tank Royale is Y-up, PixiJS is Y-down)
4. **TPS/FPS decoupling:** Game state updated every tick, renderer runs at 60fps showing latest state
5. **flag-icons package** for offline country flags (bundled as CSS data URLs)

## Next Steps (Suggested)

1. Create `gameState.ts` to track bots, bullets, arena, round/turn
2. Initialize PixiJS in `renderer.ts`
3. Handle `TickEventForObserver` messages during battle
4. Render bots as simple circles with name/energy labels
5. Render bullets (size based on power)

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
