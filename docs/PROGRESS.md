# Progress & Status

This document tracks implementation progress for AI assistants and developers resuming work on this project.

**Last updated:** 2026-05-24

## Current State

**Phase:** 11 (Theme Switching) - Complete
**Status:** Full battle viewer with light/dark theme toggle

### What's Working

#### Connection & Protocol
- ✅ WebSocket connection with auto-reconnect (5s interval, 3s timeout)
- ✅ Observer handshake protocol
- ✅ Toast notifications for server errors
- ✅ Game state management (`gameState.ts`)

#### UI & Status
- ✅ Status indicator: pulsing "Connecting..." → green "LIVE" box with drop shadow
- ✅ Round/turn indicator during battle (LIVE | ROUND X | TURN Y)
- ✅ Settings dialog (gear icon): server URL, secret, debug logging, scan opacity slider
- ✅ Arena Logo section: opacity slider (5-100%), size slider (10-100%), upload/remove buttons
- ✅ Skill Ratings section with icon buttons (import/export/reset using Font Awesome)
- ✅ Toast notifications: green for success, red for errors
- ✅ View states: Connecting → Waiting → Battle → Results
- ✅ Light/dark theme toggle (sun/moon icon left of gear), persisted in settings

#### Bot List
- ✅ Bot list with flags, authors, description, platform icons
- ✅ Skill rating columns: Tier + percentile (with μ/σ tooltip)
- ✅ Platform icons: custom SVGs for Java, Python, .NET
- ✅ "Waiting for bots to connect..." pulsing message
- ✅ Auto-scaling to fit viewport
- ✅ Team support: teams grouped with header row, members indented below
- ✅ Team color indicators (bookmark icon with assigned color)
- ✅ Droid icon (eye-slash) for droid team members (no radar, 120HP)

#### Battle Rendering (PixiJS)
- ✅ Arena background with coordinate transform (Y-flip)
- ✅ Custom arena logo (user-uploaded, configurable size and opacity)
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
- ✅ Skill rating columns: Tier + percentile with delta indicators (▲/▼)
- ✅ Medal-style rank indicators (gold/silver/bronze circles) for top 3
- ✅ Bold bot names
- ✅ Bot list docked left during battle and results (80% scale, behind arena)
- ✅ Results backdrop overlay
- ✅ Team color indicators for team results
- ✅ Rank computed locally (server rank is broken for teams)

#### Bot Labels
- ✅ Energy value above bot
- ✅ Name/version below bot
- ✅ Team name below bot name (in team color, only for team members)
- ✅ Health bar below name/team (green→yellow→red gradient, shrinks toward center)

### File Structure

```
src/
├── main.ts           # Entry point, wires modules together
├── connection.ts     # WebSocket + handshake + reconnect
├── gameState.ts      # Battle state management
├── ui.ts             # DOM manipulation + view states
├── style.css         # Styling
├── settings.ts       # Settings persistence (localStorage)
├── ratings.ts        # Skill rating storage (algorithm-agnostic, localStorage, Unranked handling)
├── ratingProviders/  # Pluggable algorithms: openskill.ts, trueskill.ts behind a RatingProvider interface
├── tiers.ts          # Pure tier calculation (value-based percentiles, caching)
├── logoStorage.ts    # Custom logo storage (localStorage)
├── teamColors.ts     # Team color allocation (stateful, consistent across views)
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

Using OpenSkill library (patent-free Weng-Lin Bayesian ranking) by default.
TrueSkill (`ts-trueskill`) is available as an alternative algorithm,
selectable in the settings panel.

- [x] Install openskill, create `ratings.ts` module
- [x] Rating parameters: μ=25, σ=μ/3, β=σ/2, τ=μ/300 defaults (matching
      OpenSkill library defaults), all four configurable in settings;
      ratings indexed by bot name
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
- [x] Debug logging for rating updates (per-bot μ/σ transitions)
- [x] Unit tests for tier calculation (vitest)
- [x] Frozen-reference canary tests for both OpenSkill and TrueSkill: pin
      tight mu/sigma bounds on a fixed 3-bot fixture so library upgrades
      that silently change algorithm or defaults fail loudly
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

### Phase 6: Custom Logo ✅

Display a custom logo/image centered on the arena floor during battles.

**Approach:** PixiJS sprite rendered in arena.
- Logo stored as base64 data URL in localStorage (`tank-royale-viewer-logo`)
- Rendered as PixiJS Sprite with configurable opacity and size
- Separate settings section with sliders and buttons
- Logo updates immediately when settings change

- [x] Settings UI: dedicated "Arena Logo" section
- [x] Opacity slider (5-100%, default 50%)
- [x] Size slider (10-100%, default 50%)
- [x] Upload/Remove buttons with Font Awesome icons
- [x] Remove button disabled when no logo stored
- [x] Store image as base64 in localStorage (`tank-royale-viewer-logo`)
- [x] `logoStorage.ts`: load/save/clear logo, change callbacks
- [x] `rendering/arena.ts`: render logo as PixiJS Sprite behind bots/bullets

### Phase 7: Percentile Display ✅

Replace raw rating numbers with percentile-based display for more intuitive UX.

**Rationale:** Bayesian skill ratings (OpenSkill, TrueSkill) are unbounded (can go negative, no upper limit). Raw numbers are unpredictable and confusing. Percentiles normalize ratings to a 0-100 scale based on the ranked bot population.

- [x] Add percentile calculation to `tiers.ts` (uses min/max from fully-ranked bots)
- [x] Add percentile API to `ratings.ts` (getPercentileForBot)
- [x] Update bot list table: show percentile instead of conservative rating
- [x] Update results table: show percentile and percentile delta
- [x] Display rules:
  - Unranked bots: "-" (no percentile shown)
  - Provisional bots: dimmed percentile in brackets, e.g. "(45.3)"
  - Fully-ranked bots: percentile, e.g. "45.3"
- [x] Percentile can go < 0 or > 100 for provisional bots (rating outside ranked range)
- [x] Format: 1 decimal place for percentiles and deltas
- [x] Keep μ/σ in tooltip for debugging
- [x] Header tooltip explains "Percentile in ranked bot distribution"

### Phase 8: Docked Bot List ✅

Keep bot list visible during battles by docking it to the left, behind the arena.

- [x] Bot list docks to left when battle starts (animated 1s transition)
- [x] Scale: 80%, vertically centered
- [x] Opacity: 70% (100% on hover)
- [x] Z-order: bot list behind arena canvas (z-index 0 vs 1)
- [x] PixiJS canvas uses transparent background (`backgroundAlpha: 0`)
- [x] Visible in margins on wide displays, covered by arena on narrow displays
- [x] `showBotListMini()` function in ui.ts
- [x] Ratings toggle updates bot list during battle

### Phase 9: Duplicate Bot Instance Handling ✅

Handle battles with multiple instances of the same bot correctly.

**Problem:** Tank Royale allows launching multiple instances of the same bot. Each instance gets a separate rank in results. Since ratings are stored per bot name (not instance), we need special handling.

**Solution:**
- [x] When battle results arrive, identify unique bots by name
- [x] If only 1 unique bot (battled itself), skip rating update entirely
- [x] If multiple unique bots, each potentially has multiple score occurrences:
  - Average `totalScore` across all instances of the same bot
  - Create synthetic ranking based on averaged scores
  - Pass synthetic ranking to OpenSkill
- [x] Preprocessing done in main.ts before calling `updateRatings()`
- [x] `RankedResult` interface unchanged (caller provides deduplicated results)
- [x] Rating algorithm switchable between OpenSkill (default) and TrueSkill
      via a settings dropdown — both algorithms share the same μ/σ/β/τ
      parameters, the same `{mu, sigma}` storage, and the same downstream
      tier/percentile pipeline

### Phase 10: Team Support ✅

Display teams in bot list, arena, and results.

- [x] Extend `BotInfo` with team fields (`teamId`, `teamName`, `teamVersion`, `isDroid`)
- [x] Extend `Participant` in gameState with team fields
- [x] `teamColors.ts`: stateful color allocation with pool-based reuse
- [x] Bot list: group by team, team header row with rating, member rows indented
- [x] Droid icon (eye-slash) marks droids; normal bots have no icon
- [x] Arena: team name label below bot name (in team color)
- [x] Results: team color indicator, rank computed locally (server rank broken)
- [x] Rating system: teams rated as unit under team name
- [x] Colors purged on disconnect, returned to pool for reuse

### Phase 11: Theme Switching ✅

Light/dark theme toggle for the surrounding UI chrome. The PixiJS arena
itself stays dark in both themes — bullet, scan-arc, and explosion colors
come from the Tank Royale protocol assuming a dark playing field, so the
arena is treated as a "broadcast graphic" that doesn't follow page theme.
The status / round / turn pills sit on (or next to) the arena and follow
the same rule.

**Approach:** CSS custom properties on `:root` with overrides under
`:root[data-theme="light"]`. JS only toggles the `data-theme` attribute
on `<html>`; the browser repaints every DOM element automatically. No
JS push into the PixiJS canvas is needed because canvas colors are
intentionally fixed.

- [x] UI colors centralized as CSS variables in `:root`
- [x] Light-theme overrides defined under `:root[data-theme="light"]`
- [x] Sun/moon toggle button placed left of the settings gear (icon shows
      the theme the user will switch *to*: sun while dark, moon while light)
- [x] Theme persisted in `settings.ts` with type-validated load
- [x] Status / round / turn pills use dedicated `--color-status-*` vars
      that are intentionally not overridden in light theme
- [x] Brighter `--color-danger` in light mode so dark icons stay readable
- [x] Arena background, bot labels, bullets, and effects: untouched —
      keep their original dark-arena-friendly hardcoded colors

## Key Technical Decisions

1. **PixiJS v8** for GPU-accelerated rendering (CPU reserved for bots/server)
2. **Modular rendering system** - separate files for arena, tanks, bullets, effects, colors
3. **Coordinate transform:** `screenY = arenaHeight - gameY` (Tank Royale is Y-up, PixiJS is Y-down)
4. **TPS/FPS decoupling:** Game state updated every tick, renderer runs at 60fps showing latest state
5. **Tick-based effects:** Effects use game turn numbers, not real time, for consistent playback
6. **Configurable scan opacity:** Slider (0-100%) to reduce visual flickering on large displays
7. **Font Awesome** for consistent icon styling in settings UI
8. **Logo as PixiJS Sprite** - simple approach, may be slightly blurry when scaled up
9. **Toast types** - green for success actions, red for errors

## Testing

### Unit Tests
```bash
npm test              # Run tests in watch mode
npm test -- --run     # Single test run
```

### Manual Testing
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
