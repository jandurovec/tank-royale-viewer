# Architecture

This document describes the architecture of the Tank Royale Battle Viewer, including design decisions and their rationale.

## Overview

The Tank Royale Battle Viewer is a web application that connects to a Robocode Tank Royale server as an **observer** and renders battles in real-time. It receives game state updates via WebSocket and displays them using GPU-accelerated 2D graphics.

## Tech Stack Decisions

### TypeScript over JavaScript

**Decision:** Use TypeScript for all application code.

**Rationale:**
- The Tank Royale protocol uses well-defined JSON message schemas
- Type definitions for protocol messages catch errors at compile time
- Complex state management (bots, bullets, events) benefits from type safety
- Better IDE support with autocompletion and refactoring
- Improved maintainability for future development

### PixiJS for Rendering

**Decision:** Use PixiJS v8 for battle visualization instead of raw Canvas or other frameworks.

**Rationale:**
- **GPU acceleration:** WebGL rendering offloads graphics from CPU to GPU. This is critical because the CPU is typically busy running the Tank Royale server and bot processes.
- **Automatic batching:** PixiJS batches draw calls efficiently, reducing overhead when rendering many bots and bullets.
- **Canvas fallback:** Automatically falls back to Canvas 2D on devices without WebGL support.
- **Excellent TypeScript support:** First-class type definitions.
- **Simple API:** Easy to draw shapes, sprites, and text without WebGL boilerplate.

**Alternatives considered:**
- *Raw Canvas 2D:* CPU-based rendering would compete with bot processes for CPU time.
- *Raw WebGL:* Too much boilerplate for a 2D application.
- *Three.js:* Overkill for 2D rendering.
- *Phaser:* Full game engine with features we don't need.

### Vite as Build Tool

**Decision:** Use Vite for development and production builds.

**Rationale:**
- Near-instant hot module replacement (HMR) during development
- Zero-config TypeScript support
- Simple production builds with tree-shaking
- Native ES modules in development (no bundling delay)
- Lightweight compared to Webpack

## User Experience Vision

The viewer is designed for **presentation on large displays** (conference rooms, wall screens) with a **sports broadcast aesthetic** - like watching a live sporting event.

### Design Principles

1. **Full-screen, immersive experience** - The arena is the star; no distracting UI chrome
2. **TV broadcast feel** - Clean transitions between states
3. **Hidden configuration** - Settings accessible only via a minimal gear icon in top-right corner

### View States

The viewer has four distinct states:

#### State 1: Connecting
```
+-------------------------------------------------------------+
| Connecting...                                            *  |
|                                                              |
|                                                              |
|                     (empty arena)                            |
|                                                              |
|                                                              |
+-------------------------------------------------------------+
```
- "Connecting..." indicator (pulsing animation)
- Settings gear icon (top-right)
- Empty arena background
- No round/turn info, no bot list

#### State 2: Connected, Waiting for Battle
```
+-------------------------------------------------------------+
| LIVE                                                     *  |
|                                                              |
|             +--------------------------------+               |
|             | Bot                 | Author   |               |
|             |---------------------|----------|               |
|             | [US] Crazy 1.0      | Alice    |               |
|             | [GB] Fire 1.0       | Bob      |               |
|             | [DE] Spin Bot 1.0   | Charlie  |               |
|             +--------------------------------+               |
|                    (centered bot list)                       |
+-------------------------------------------------------------+
```
- "LIVE" indicator (no round/turn yet)
- Centered bot list table (alphabetically sorted):
  - Flag(s) inline before bot name (Olympics-style)
  - Bot name + version
  - Author
  - TrueSkill rating (Phase 5)

#### State 3: Battle in Progress
```
+-------------------------------------------------------------+
| LIVE | ROUND 1 | TURN 75                                 *  |
|              +--------------------------------+             |
| +-----------+:            ARENA               |             |
| | Bot List  |:                                |             |
| | (behind)  |:         o       98.8       o   |             |
| | - Spin    |:               +-----+          |             |
| | - Fire    |:               | BOT |          |             |
| | - Crazy   |:               +-----+          |             |
| +-----------+:              MyBot 1.0         |             |
|  70% opacity +--------------------------------+             |
|                       (arena is on top of bot list)         |
+-------------------------------------------------------------+
          ^--- transparent canvas margin where bot list shows through
```
- "LIVE | ROUND X | TURN Y" indicator
- Arena with bots, bullets, scan arcs, explosions
- Bot list docked left, behind the arena (lower z-index)
- Visible in transparent canvas margins on wide displays
- NO scoreboard (scores not available during battle)

#### State 4: Battle Ended
```
+-------------------------------------------------------------+
| LIVE                                                     *  |
|                                                             |
| +-----------+      +----------------------------------+     |
| | Bot List  |      |         BATTLE RESULTS           |     |
| | (behind)  |      |----------------------------------|     |
| | - Spin    |      | 1. Spin Bot 1.0      2250 pts    |     |
| | - Fire    |      | 2. Fire 1.0          1890 pts    |     |
| | - Crazy   |      | 3. Crazy 1.0         1456 pts    |     |
| +-----------+      +----------------------------------+     |
|  70% opacity           (results overlay centered)           |
+-------------------------------------------------------------+
```
- "LIVE" indicator (no round/turn)
- Bot list remains docked left (same position as during battle)
- Results overlay centered on screen
- Results disappear when new battle starts

#### State Transitions
```
              +-------------+
              | Connecting  | <------ on disconnect
              |   (State 1) |
              +------+------+
                     | on connect
                     v
              +-------------+
         +--> |   Waiting   | <------ on battle end
         |    |   (State 2) |         (show results)
         |    +------+------+
         |           | on GameStarted (bot list docks to left)
         |           v
         |    +-------------+
         |    |   Battle    |
         |    |   (State 3) |
         |    +------+------+
         |           | on GameEnded
         |           v
         |    +-------------+
         +--- |   Results   |
              |   (State 4) |
              +-------------+
                     | on new battle
                     v
              (back to State 3)
```

### Bot List Dock Transition

When a battle starts, the bot list animates from centered to docked on the left. This keeps bot information at least partially visible during battles—fully visible on wide displays where the arena doesn't fill the viewport.

- **Animation:** 1 second ease-out CSS transition
- **Scale:** Shrinks from 100% to 80%
- **Position:** Docks to left, vertically centered
- **Opacity:** Fades to 70% (100% on hover)
- **Z-order:** Bot list (z-index: 0) renders behind arena canvas (z-index: 1)
- **Canvas:** PixiJS uses transparent background so docked list shows through margins

### Bot Labels

Each bot displays (matching official GUI):
- **Above bot:** Energy value (e.g., "98.8")
- **Below bot:** Name and version only (e.g., "Spin Bot 1.0") - internal ID is not displayed
- **Phase 4 (nice-to-have):** HP bar (green → red gradient) in addition to numeric energy

### Radar Scan Arcs

The triangular/line shapes visible in the arena are **radar scan arcs**, not gun direction lines. When a bot doesn't rotate its radar, the scan arc appears as a thin line (sweep angle is 0). When rotating, it shows as a triangular sweep.

### Bullet Rendering

Bullets vary in size based on power (float range 0–3):
- **Low power (closer to 0):** Smaller bullet, faster travel, less damage
- **High power (closer to 3):** Larger bullet, slower travel, more damage

Bullet size should be proportional to power for visual distinction.

## Phase 5: Skill Rating System

A local rating system that tracks bot performance over time using the OpenSkill algorithm.

### OpenSkill Configuration

- **Library:** `openskill` (npm package)
- **Parameters:** μ=1200, σ=400, β=100, z=3
- **Conservative rating:** μ - 3σ (determines rank tier after placement games)
- **Beta=100** (vs default 200): Faster convergence, assuming bot battles are mostly skill-determined
- Bots below the ranked games threshold are **Unranked** regardless of rating
- Bots between ranked and provisional thresholds have **Provisional** rank (icon at 50% opacity)

### Rank Tiers

Bots progress through ranking stages:
- **Unranked:** below ranked games threshold (default: 20, configurable)
- **Provisional [Tier]:** between ranked and provisional threshold (default: 50, configurable) - icon shown at 50% opacity
- **Full rank:** at or above provisional games threshold

Ranked tiers calculated as value-based percentiles among fully-ranked bots:
- **Scrap:** bottom 20% (rating < min + 0.20 × range)
- **Rookie:** 20th-60th percentile
- **Veteran:** 60th-80th percentile
- **Elite:** 80th-95th percentile
- **Legend:** top 5% (rating ≥ min + 0.95 × range)

Percentiles are calculated from rating values, not ranks:
- `threshold = minRating + (percentile / 100) × (maxRating - minRating)`
- This ensures the lowest-rated bot is always at the 0th percentile (Scrap with 4+ bots)

Thresholds require minimum bot counts for each tier:
- 1 bot: everyone is Rookie
- 2 bots: Veteran threshold at 60%
- 3 bots: + Elite threshold at 80%
- 4 bots: + Scrap/Rookie boundary at 20%
- 5+ bots: + Legend threshold at 95%
### Features

- **Local OpenSkill ratings** indexed by bot name ("Name Version" format)
- **Persisted in localStorage** (`tank-royale-viewer-ratings`) - survives browser refresh
- **Recalculated after each battle** based on final rankings
- **Displayed in both tables** (connected bots and results)
- **Enable/disable toggle** in settings (defaults to enabled)
- **Export/Import/Reset** functionality in settings panel

### Storage Schema

```json
{
  "Spin Bot 1.0": { "mu": 1250.5, "sigma": 85.2, "version": "1.0", "games": 42 },
  "Fire 1.0": { "mu": 1180.3, "sigma": 92.1, "version": "1.0", "games": 38 }
}
```

Storage key: `tank-royale-viewer-ratings`

The `games` field tracks the number of ranked games played. When loading data without this field (backward compatibility), it defaults to 1 if the bot has rating data. New bots start with `games: 0`.

### Display

Both bot list (State 2) and results (State 4) tables show:
- **Tier column:** Rank tier icon (provisional icons at 50% opacity)
- **Percentile column:** Percentile value (0-100 scale based on ranked bot population)
- **Tooltip (CSS):** Shows μ and σ values on hover via `data-tooltip` attribute
- **Results table:** Also shows delta indicator (▲/▼) for percentile change after battle

#### Percentile Calculation

Percentiles are calculated from conservative ratings using the min/max range of fully-ranked bots:
- Formula: `percentile = ((rating - min) / (max - min)) * 100`
- Range is based only on bots with games ≥ provisionalGamesThreshold
- Percentile can exceed 0-100 bounds for provisional bots (rating outside ranked range)

#### Display Rules by Bot Status

| Status | Percentile Display | Delta Display |
|--------|-------------------|---------------|
| Unranked (games < ranked threshold) | "-" | (not shown) |
| Provisional (ranked ≤ games < provisional) | "(45.3)" dimmed | "▲2.5" |
| Fully Ranked (games ≥ provisional) | "45.3" | "▲2.5" |

Percentiles and deltas are shown with 1 decimal place.

### Debug Logging

When debug mode is enabled in settings, tier calculations are logged:
- Which bots are eligible for tier calculation (games ≥ provisionalGamesThreshold)
- Each bot's conservative rating, μ, σ, and games count
- Calculated tier thresholds in rating points
- Per-bot tier assignments with reasoning

## Phase 6: Arena Background Customization

Allow users to upload a custom arena background image.

### Features

- **Upload PNG image** (ideally with transparent background)
- **Stored in localStorage** as base64 encoded string
- **Displayed behind arena** during battle
- **Clear/reset option** in settings

### Settings Panel (Top-Right Gear Icon)

Clicking the gear icon reveals a settings overlay:
- Server WebSocket URL
- Optional authentication secret
- Connect/Disconnect button
- Display options (if any)

The panel should slide in/out smoothly and auto-hide when connection is established.

## Application Architecture

```
+-------------------------------------------------------------------+
|                           Browser                                 |
|  +-----------+  +------------+  +----------+  +-------------+     |
|  |    UI     |  | Connection |  |  Game    |  |  Rendering  |     |
|  |   (DOM)   |  | (WebSocket)|  |  State   |  |  (PixiJS)   |     |
|  +-----+-----+  +------+-----+  +----+-----+  +------+------+     |
|        |               |             |               |            |
|        +---------------+-------------+---------------+            |
|                              |                                    |
|                           main.ts                                 |
|                       (orchestration)                             |
+-------------------------------------------------------------------+
                               |
                           WebSocket
                               |
                               v
                    +---------------------+
                    |  Tank Royale Server |
                    |   (localhost:7654)  |
                    +---------------------+
```

### Component Responsibilities

#### Connection (`connection.ts`)
- Establishes WebSocket connection to Tank Royale server
- Performs observer handshake protocol
- Parses incoming JSON messages into typed objects
- Emits typed events for other components to handle
- Handles reconnection on disconnect

#### Game State (`gameState.ts`)
- Maintains current state of the battle
- Tracks arena dimensions
- Stores bot states (position, direction, energy, colors)
- Stores bullet states (position, direction, power)
- Tracks round and turn numbers
- Accumulates results for display

#### Rendering Module (`rendering/`)
A modular system for GPU-accelerated battle visualization:

- **`index.ts`** - PixiJS application lifecycle, orchestration, re-exports
- **`arena.ts`** - Arena background and border rendering
- **`tank.ts`** - Bot/tank graphics creation and update
- **`bullets.ts`** - Bullet rendering with size based on power
- **`effects.ts`** - Explosions and burst effects (tick-based timing)
- **`colors.ts`** - Color constants, parsing, and interpolation utilities

Key responsibilities:
- Initializes PixiJS application with WebGL
- Creates and manages graphics objects for bots and bullets
- Updates graphics positions each tick
- Renders bot components: body (square), turret, radar (future)
- Displays visual effects (explosions, hit bursts)
- Handles coordinate transform (Y-flip from game to screen)

#### Settings (`settings.ts`)
- Manages application settings with localStorage persistence
- Provides typed Settings interface
- Handles load/save with fallback to defaults on parse errors
- Settings survive browser refresh
- Includes `showRatings` toggle for enabling/disabling skill rating display

#### UI (`ui.ts`)
- Manages DOM elements for controls
- Server URL input and connect button
- Connection status indicator
- Battle information display (round, turn)
- Bot list and results display with optional rating columns
- Binds settings values to form inputs
- Handles rating export/import/reset with error toasts

#### Ratings (`ratings.ts`)
- OpenSkill integration for rating calculations
- Persistence to localStorage
- Handles "Unranked" status for bots below games threshold
- Delegates tier calculation to tiers module
- Rating updates after each completed battle
- Exports `BotTier` type ('Unranked' | Tier)

#### Tiers (`tiers.ts`)
- Pure tier calculation module (no external dependencies)
- Value-based percentile calculation: threshold = min + (percentile/100) × range
- Caches calculated thresholds for efficient lookups
- Exports `Tier` type ('Scrap' | 'Rookie' | 'Veteran' | 'Elite' | 'Legend')
- Only knows about actual tiers; 'Unranked' is handled by ratings module
- Unit tested (`tiers.test.ts`)

#### Main (`main.ts`)
- Application entry point
- Instantiates and wires together all components
- Coordinates data flow between components

## Data Flow

1. **Connection** receives WebSocket message from server
2. **Connection** parses JSON and emits typed event
3. **Game State** updates internal state based on event
4. **Renderer** reads state and updates graphics
5. **UI** reads state and updates DOM

## Coordinate System

Tank Royale uses a coordinate system where:
- Origin (0, 0) is at the **bottom-left** of the arena
- X increases to the right
- Y increases upward
- Angles are in degrees, measured counter-clockwise from the positive X-axis

PixiJS uses a coordinate system where:
- Origin (0, 0) is at the **top-left**
- Y increases downward

The renderer must transform Y coordinates: `screenY = arenaHeight - gameY`

## Bot Rendering

### Target: Production Quality

The production viewer should render bots similarly to the official Robocode Tank Royale GUI:
- **Tank body** with tracks, properly oriented
- **Turret** mounted on body, independently rotatable
- **Radar dish** on turret, independently rotatable
- **Visual effects** for firing, explosions, scan arcs

This requires sprite-based rendering with rotation support.

### MVP: Simple Shapes

For initial development and testing, bots can be rendered as simple shapes:
- **Body:** Filled circle (radius 18 units) with direction indicator
- **Turret:** Line extending from center showing gun direction
- **Radar:** Arc showing radar direction and scan width
- **Name label:** Text above the bot

This allows validating the protocol handling and game state management before investing in graphics.

### Implementation Path

1. **Phase 1 (MVP):** Simple geometric shapes
2. **Phase 2:** Replace with tank sprites (can use assets from Tank Royale or create new ones)
3. **Phase 3:** Add particle effects, smooth animations

Bot colors are received from the server and applied to respective parts (body, turret, radar, etc.).

## Tick Rate vs Frame Rate

The viewer must handle the difference between:
- **TPS (Turns Per Second):** Rate at which the server sends tick events (variable, can be very fast)
- **FPS (Frames Per Second):** Rate at which the screen renders (typically 60fps via `requestAnimationFrame`)

### Design Principles

1. **Process all ticks:** Every incoming tick message updates the game state. No tick data is discarded.

2. **Render latest state:** The render loop (60fps) always draws the most recent game state. If multiple ticks arrived since the last frame, intermediate visual states are skipped.

3. **Never miss critical events:** Certain events must always be captured and displayed regardless of tick rate:
   - `GameEndedEventForObserver` - Final results
   - `RoundEndedEventForObserver` - Round results
   - `BotDeathEvent` - Bot eliminations (for death effects)

4. **Queue critical events:** Critical events are queued separately and processed by the renderer even if their tick was "skipped" visually.

### Architecture

```
WebSocket Messages (variable TPS)
         |
         v
+---------------------+
|   Message Handler   |  <- Processes ALL messages
|   (synchronous)     |
+----------+----------+
           |
           v
+---------------------+
|     Game State      |  <- Always reflects latest tick
|  + Critical Events  |  <- Queue of events to display
|       Queue         |
+----------+----------+
           |
           v
+---------------------+
|    Render Loop      |  <- 60fps via requestAnimationFrame
|  (reads latest      |
|   state + events)   |
+---------------------+
```

### Handling High TPS

When the server runs at high TPS (e.g., 1000+ TPS for fast simulations):
- The WebSocket message handler processes each tick immediately
- Game state is overwritten with each tick (only latest positions matter)
- Critical events are accumulated in a queue
- Render loop runs independently at screen refresh rate
- Renderer processes queued critical events (shows explosions, updates scores)
- Renderer draws current bot/bullet positions

This ensures the viewer remains responsive and accurate even when the server runs faster than the display can refresh.
