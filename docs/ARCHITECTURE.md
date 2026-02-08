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
|                                                              |
|                          98.8                                |
|                        +-----+                               |
|          o             | BOT |              o                |
|                        +-----+                               |
|                      Spin Bot 1.0                            |
|    +-----+                                  +-----+          |
|    | BOT |           \                      | BOT |          |
|    +-----+            \  (scan arc)         +-----+          |
|                                                              |
+-------------------------------------------------------------+
```
- "LIVE | ROUND X | TURN Y" indicator
- Arena with bots, bullets, scan arcs, explosions
- NO scoreboard (scores not available during battle)

#### State 4: Battle Ended
```
+-------------------------------------------------------------+
| LIVE                                                     *  |
|                                                              |
|    (dimmed) +---------------------------------------+        |
|             | Bot list table...                     |        |
|             +---------------------------------------+        |
|                                                              |
|          +---------------------------------------+           |
|          |          BATTLE RESULTS               |           |
|          |---------------------------------------|           |
|          | 1. Spin Bot 1.0      2250 pts         |           |
|          | 2. Fire 1.0          1890 pts         |           |
|          | 3. Crazy 1.0         1456 pts         |           |
|          +---------------------------------------+           |
|                                                              |
+-------------------------------------------------------------+
```
- "LIVE" indicator (no round/turn)
- Background: dimmed bot list table
- Foreground: solid results overlay (no transparency)
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
         |           | on GameStarted
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

## Phase 5: TrueSkill Rating System

A local rating system that tracks bot performance over time.

### Features

- **Local TrueSkill ratings** indexed by bot name
- **Persisted in localStorage** - survives browser refresh, accumulates across sessions
- **Recalculated after each battle** based on results (rankings)
- **Displayed in bot list** (State 2) as star rating or rank icons
- **Export/Import JSON** from settings dialog (nice-to-have)

### Storage Schema

```json
{
  "ratings": {
    "Spin Bot 1.0": { "mu": 25.0, "sigma": 8.333 },
    "Fire 1.0": { "mu": 27.5, "sigma": 6.2 },
    ...
  },
  "lastUpdated": "2026-02-08T12:00:00Z"
}
```

### Display

In the bot list table (State 2), show rating as:
- Star rating (1-5 stars based on mu)
- Or rank tier icons (Bronze/Silver/Gold/Platinum/Diamond)
- Tooltip showing exact mu/sigma values

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
- Future: TrueSkill ratings, arena background image

#### UI (`ui.ts`)
- Manages DOM elements for controls
- Server URL input and connect button
- Connection status indicator
- Battle information display (round, turn)
- Bot list and results display
- Binds settings values to form inputs

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
