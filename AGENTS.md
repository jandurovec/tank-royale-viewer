# Agent Instructions

This file provides instructions for AI agents (Warp, Copilot, Cursor, etc.) working on the Tank Royale Battle Viewer codebase.

## Project Overview

A web-based viewer for Robocode Tank Royale battles designed for **large display presentation** (conference rooms, wall screens). The UX follows a **TV sports broadcast** aesthetic - immersive, full-screen, with minimal UI chrome.

**Tech Stack:** TypeScript, Vite, PixiJS v8

**Key UX Principles:**
- Full-screen arena is the focus
- Settings hidden behind gear icon (top-right)
- Four view states with clean transitions
- No distracting UI during battle

## Quick Reference

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run typecheck    # Check TypeScript types
npm run lint         # Run linter
```

## Project Structure

```
src/
├── main.ts           # Entry point, wires components together
├── connection.ts     # WebSocket connection to Tank Royale server
├── gameState.ts      # Battle state management
├── renderer.ts       # PixiJS rendering
├── ui.ts             # DOM-based UI controls
└── types/
    └── protocol.ts   # TypeScript types for protocol messages
```

## Coding Principles

- **YAGNI** - Don't add code until it's needed
- **KISS** - Simple solutions over complex ones
- **DRY** - Don't repeat yourself
- **Minimal code** - If it can be done simply, do it simply
- **Minimal comments** - Only comment non-obvious things (complex algorithms, assumptions, edge cases). Don't restate what the code already says.

```typescript
// BAD: comment restates the code
const count = items.length; // Get the length of items

// GOOD: comment explains WHY, not WHAT
// TrueSkill sigma below 2.0 indicates confident rating
if (rating.sigma < 2.0) { ... }
```

## Clarification

**Ask for clarification** when you encounter:
- Ambiguous or contradictory requirements
- Gaps in specifications (e.g., undefined edge cases)
- Technical constraints that conflict with requested features
- Values or thresholds that don't make logical sense together

Do not assume or guess. It's better to ask than to implement something incorrectly.

## Code Quality Review

**After completing any feature or making significant changes**, review the code for:

1. **Modularization** - Is code in the correct module per documentation in `docs/`? Each module should have a single responsibility.

2. **Module coupling** - Do modules communicate via callbacks/interfaces, not direct dependencies? Modules should not know about each other's internals.

3. **Code duplication** - Is there repeated code that should be extracted?

4. **Complexity** - Can any code be simplified? Are there unnecessary abstractions?

5. **TypeScript** - Does it compile with `npx tsc --noEmit`?

6. **Whitespace** - No trailing whitespace. Lines should not end with spaces or tabs.

If refactoring is needed, do it before marking the task complete.

## Key Conventions

### TypeScript

- **Strict mode enabled** - all code must pass strict type checking
- Use `interface` for object shapes, `type` for unions/primitives
- Explicit return types on all exported functions
- Use `readonly` for immutable properties

### Imports

- Use `.js` extension for local imports (ES modules requirement)
- External imports first, then local imports
- Use `import type` for type-only imports

```typescript
// ✓ Correct
import { Application } from 'pixi.js';
import type { BotState } from './types/protocol.js';
import { GameState } from './gameState.js';

// ✗ Incorrect
import { GameState } from './gameState';  // Missing .js
```

### Naming

- Files: `camelCase.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Protocol Types

All message types from the Tank Royale server are defined in `src/types/protocol.ts`. When handling messages:

1. Parse JSON with `JSON.parse()`
2. Check the `type` field to determine message type
3. Cast to the appropriate interface
4. Handle with type-safe code

### Coordinate Transformation

Tank Royale uses bottom-left origin with Y-up. PixiJS uses top-left origin with Y-down. Always transform:

```typescript
const screenY = arenaHeight - gameY;
```

### PixiJS Patterns

- Create graphics objects once, update positions each frame
- Use `Graphics` for shapes (bots, bullets)
- Use `Text` for labels
- Batch updates in render loop

## Common Tasks

### Adding a New Protocol Message Type

1. Add interface to `src/types/protocol.ts`
2. Add to `MessageType` union
3. Handle in `connection.ts` message handler
4. Update `gameState.ts` if state changes needed

### Adding Visual Effects

1. Create effect class/function in `renderer.ts`
2. Trigger from game events in tick handler
3. Clean up finished effects each frame

### Adding UI Controls

1. Add HTML element in `index.html`
2. Add event handler in `ui.ts`
3. Connect to appropriate component in `main.ts`

## Documentation

- `docs/ARCHITECTURE.md` - Design decisions and rationale
- `docs/PROTOCOL.md` - Tank Royale WebSocket protocol
- `docs/DEVELOPMENT.md` - Development setup and workflow

## Testing

Run the viewer against a live Tank Royale server:

1. Start Tank Royale GUI: `java -jar robocode-tankroyale-gui-x.y.z.jar`
2. Start viewer: `npm run dev`
3. Connect and start a battle

## Important Notes

- **GPU rendering:** PixiJS uses WebGL to offload rendering from CPU. Do not introduce CPU-heavy operations in the render loop.
- **TPS vs FPS:** The server sends ticks at variable TPS. The render loop runs at 60fps. These are decoupled - game state is updated on every tick, but rendering only shows the latest state.
- **Critical events:** Never discard critical events (`GameEndedEventForObserver`, `RoundEndedEventForObserver`, `BotDeathEvent`). These are queued and processed by the renderer regardless of tick rate.
- **Performance:** Keep per-frame operations O(n) where n is number of bots/bullets.
- **Protocol changes:** If Tank Royale updates its protocol, check the [schema directory](https://github.com/robocode-dev/tank-royale/tree/main/schema) for changes.

## Implementation Phases

1. **Phase 1 (MVP):** Core viewer - connection, game state, simple bot shapes, view states
2. **Phase 2:** Proper tank sprites matching official Robocode GUI
3. **Phase 3:** Particle effects, smooth animations, visual polish
4. **Phase 4:** HP bar (green→red gradient) above bots
5. **Phase 5:** TrueSkill rating system (localStorage, bot list display, export/import)

## View States

| State | Indicator | Content |
|-------|-----------|--------|
| 1. Connecting | `Connecting...` (pulsing) | Empty arena |
| 2. Waiting | `LIVE` | Centered bot list table |
| 3. Battle | `LIVE \| ROUND X \| TURN Y` | Arena with bots, bullets, effects |
| 4. Results | `LIVE` | Dimmed bot list + results overlay |

- On disconnect: return to State 1
- On new battle: results overlay disappears, go to State 3

## Bot Labels (Matching Official GUI)

- **Above bot:** Energy value (e.g., "98.8")
- **Below bot:** Name and version only (e.g., "Spin Bot 1.0") - do NOT display internal ID

## Bullet Rendering

- Power range: 0–3 (float)
- Size proportional to power (bigger = more powerful)
- Low power: smaller, faster, less damage
- High power: larger, slower, more damage

## Bot List Table (States 2 & 4)

- Centered horizontally and vertically
- Flag(s) displayed inline before bot name (Olympics-style: `[US] Spin Bot 1.0`)
- Columns: Flag + Bot name + version, Author, TrueSkill rating (Phase 5)
- Alphabetically sorted by bot name
- In State 4: dimmed behind results overlay
