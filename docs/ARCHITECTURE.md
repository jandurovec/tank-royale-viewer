# Architecture

This document describes the architecture of the Tank Royale Battle Viewer, including design decisions and their rationale.

## Overview

The Tank Royale Battle Viewer is a web application that connects to a Robocode Tank Royale server as an **observer** and renders battles in real-time. It receives game state updates via WebSocket and displays them using GPU-accelerated 2D graphics.

### Design Philosophy: Passive Viewer

This viewer is **intentionally a passive observer only**. It does not include any controller features such as starting battles, selecting bots, or managing the server.

**Rationale:**

The primary use case is **broadcasting live events on a big screen** - giving participants and audience a "live sports broadcast" experience. In this scenario:

- The **viewer runs on a shared display** (projector, TV, conference room screen) visible to everyone
- A **controller (e.g., official Tank Royale GUI) runs on the operator's private screen** where they manage battles, boot bots, and configure settings

Separating viewing from control ensures the audience sees only the polished broadcast experience, while the operator retains full control without exposing administrative UI to the shared display.

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
  - Skill rating (Phase 5)

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

`RoundEndedEventForObserver` does not introduce another view state or show a
per-round results overlay. The viewer remains in the battle view until the next
round starts or the game ends. This matches the official Java GUI.

Disconnecting or changing the server connection clears the active battle,
round and turn indicators, results, cached bot list, team colors, and renderer
graphics before reconnecting. An aborted game clears battle and result state
but preserves the current connected-bot list. Every new game clears the
previous arena and results before initializing its own setup.

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

A local rating system that tracks bot performance over time. The user can
choose between two Bayesian rating algorithms in the settings panel:

- **OpenSkill** (default) — patent-free Plackett-Luce / Bradley-Terry model
  via the `openskill` npm package. Fast and stable for free-for-all games.
- **TrueSkill** — Microsoft's factor-graph rating model via the `ts-trueskill`
  npm package. The TrueSkill™ brand is restricted to non-commercial use.

Both algorithms expose the same `μ`, `σ`, `β`, `τ` parameters, store the same
`{mu, sigma}` per bot, and feed the same downstream tier/percentile logic in
`tiers.ts`. Switching algorithms keeps existing stored ratings, but the
rating dynamics will differ; the settings panel surfaces a warning toast
suggesting a reset (same warning shown when μ/σ/β/τ are changed).

### Configuration

- **Default parameters:** μ=25, σ=μ/3, β=σ/2, τ=μ/300 (all four configurable
  in the settings panel; defaults match OpenSkill's library defaults)
- **TrueSkill draw probability** is hard-coded to 0 — Tank Royale matches
  don't produce draws
- **Conservative rating:** `ordinal()` (OpenSkill) or `expose()` (TrueSkill).
  Both reduce to `μ − k·σ` with `k = mu/sigma = 3` at default parameters,
  so tier thresholds remain comparable across algorithms.
- Bots below the ranked games threshold are **Unranked** regardless of rating
- Bots between ranked and provisional thresholds have **Provisional** rank
  (icon at 50% opacity)

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

- **Local skill ratings** (OpenSkill or TrueSkill, selectable) indexed by bot
  name (the server-provided `name` field; `version` is stored as a property
  of each rating, not part of the key)
- **Persisted in localStorage** (`tank-royale-viewer-ratings`) - survives browser refresh
- **Recalculated after each battle** based on final rankings
- **Displayed in both tables** (connected bots and results)
- **Enable/disable toggle** in settings (defaults to enabled)
- **Export/Import/Reset** functionality in settings panel

### Storage Schema

```json
{
  "Spin Bot": { "mu": 28.4, "sigma": 5.2, "version": "1.0", "games": 42 },
  "Fire":     { "mu": 24.1, "sigma": 6.8, "version": "1.0", "games": 38 }
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

## Team Support

The viewer supports team battles where multiple bots form a team.

### Team Colors

**Decision:** Use a stateful color allocation module (`teamColors.ts`) with a curated palette.

**Rationale:**
- Colors must be consistent across bot list, arena labels, and results
- When teams disconnect, their colors should be freed for reuse
- A pool-based approach ensures the same team always gets the same color within a session

The module maintains a map of allocated colors and returns freed colors to the pool when teams disconnect (triggered on `BotListUpdate`).

### Team Detection in Results

**Challenge:** Team IDs and bot IDs can collide (there can be a team and a bot with the same ID), and the server doesn't explicitly mark results as team vs bot.

**Solution:** Check both `result.id` AND `result.name` against participant team data. This is only needed for displaying team color indicators in results.

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
- Stores participant identity used when preparing team results

#### Result Preparation (`resultPreparation.ts`)
- Collapses repeated result records by bot or team name and averages every
  displayed score component
- Sorts by total score descending, then participant ID and name
- Assigns shared placements such as `1, 2, 2, 4` for equal total scores
- Identifies teams by matching both result ID and name against participants
- Produces the single ordered result set used by the UI and rating providers

#### Rendering Module (`rendering/`)
A modular system for GPU-accelerated battle visualization:

- **`index.ts`** - PixiJS application lifecycle, orchestration, re-exports
- **`arena.ts`** - Arena background and border rendering
- **`tank.ts`** - Bot/tank graphics creation and update
- **`bullets.ts`** - Bullet rendering with size based on power
- **`effects.ts`** - Turn-based explosions and hit bursts that span rounds
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
- Algorithm-agnostic skill-rating storage. Does not import any rating
  library directly — all algorithm-specific math is delegated to a
  `RatingProvider` selected via `getRatingProvider()`
- Persistence to localStorage with a uniform `BotRating { mu, sigma, version, games }` shape
- Handles "Unranked" status for bots below the games threshold
- Delegates tier calculation to `tiers.ts`
- Rating updates after each completed battle
- Exports `BotTier` type ('Unranked' | Tier)

#### Rating Providers (`ratingProviders/`)
- `index.ts` — defines the `RatingProvider` strategy interface
  (`rate(teams, ranks)` and `conservative(r)`) plus a `getRatingProvider()`
  factory that picks the active provider based on `settings.ratingAlgorithm`
- `openskill.ts` — wraps the `openskill` library (default, patent-free,
  Plackett-Luce / Bradley-Terry model)
- `trueskill.ts` — wraps the `ts-trueskill` library (Microsoft TrueSkill
  factor-graph model; draw probability fixed at 0 since Tank Royale matches
  don't produce draws)
- Each provider is a stateless singleton that reads μ/σ/β/τ from settings
  on every call, so live edits in the settings panel take effect immediately
- Frozen-reference canary tests in `ratings.test.ts` pin tight bounds around
  observed mu/sigma values for each library on a fixed 3-bot fixture. These
  fail loudly if a library upgrade silently changes the algorithm or its
  defaults — the signal that stored ratings should be reset (or bounds
  re-baselined consciously)

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

Messages are processed in WebSocket delivery order. The viewer does not reorder
ticks or add stale-message suppression within one connection.

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

Bots are rendered similarly to the official Robocode Tank Royale GUI using procedural graphics:

- **Tank body** - Rectangle with tracks on both sides, proper orientation
- **Turret** - Square mounted on body, independently rotatable
- **Gun barrel** - Two-part cannon (thick base + barrel) extending from turret
- **Radar dish** - Curved dish shape, independently rotatable (hidden for droids)
- **Scan arcs** - Triangular sweeps or lines showing radar coverage
- **Visual details** - Shadows, borders, highlights for 3D effect
- **Labels** - Energy value above, name/version below

All graphics are drawn procedurally using PixiJS Graphics API, scaled from a 500-unit internal coordinate system to match the original Kotlin implementation. Bot colors from the server are applied to body, turret, radar, gun, tracks, and scan arc.

### Differences from Official GUI

While the core tank rendering matches the official GUI, there are some intentional differences:

- **No internal ID** - The official GUI shows bot ID; we show only name and version
- **Health bar** - We added a color-coded bar (green→yellow→red) below the bot name for visual HP indication; the official GUI only shows the numeric energy value
- **Team name display** - Shown below the bot name using the assigned team color; the official GUI doesn't have team colors (team colors are a viewer-specific feature for distinguishing teams)

### Coordinate Transform

Tank Royale uses degrees counter-clockwise from East. PixiJS uses radians clockwise. The renderer applies a 180° offset and negation to match the original GUI orientation.

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
