# Development Guide

This document describes how to set up the development environment and work on the Tank Royale Battle Viewer.

## Prerequisites

- **Node.js** 22 or later (LTS recommended)
- **npm** (comes with Node.js)
- **Tank Royale Server** for testing (optional during UI development)

> **Note:** Node.js 18 reached EOL in April 2025, and Node.js 20 EOL is April 2026. Use Node.js 22 LTS for longest support (until April 2027).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test:unit` | Run Vitest once |
| `npm run test:e2e` | Run the Chromium battle-journey test |
| `npm run test:all` | Run lint, type checking, unit tests, and browser tests |

`npm run test:e2e` automatically installs the Playwright-managed Chromium
version required by the locked dependency. No global or manual browser
installation is required. GitHub Actions additionally installs Chromium's
Linux system dependencies before running the same command.

## Project Structure

```
tank-royale-viewer/
├── index.html            # Entry HTML (Vite entry point)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
├── vitest.config.ts      # Vitest configuration (jsdom env)
├── eslint.config.js      # ESLint configuration
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md   # Design decisions
│   ├── PROTOCOL.md       # WebSocket protocol reference
│   ├── PROGRESS.md       # Implementation phase tracking
│   └── DEVELOPMENT.md    # This file
├── AGENTS.md             # AI agent instructions
├── README.md             # User-facing documentation
└── src/
    ├── main.ts           # Application entry point
    ├── connection.ts     # WebSocket connection manager (+ test)
    ├── gameState.ts      # Game state management (+ test)
    ├── ui.ts             # DOM controls and view-state rendering
    ├── style.css         # Application styles
    ├── settings.ts       # Persisted settings (localStorage) (+ test)
    ├── ratings.ts        # Skill rating storage (algorithm-agnostic) (+ test)
    ├── resultPreparation.ts # Result ordering, aggregation, placement (+ test)
    ├── ratingProviders/   # Pluggable rating algorithm implementations
    │   ├── index.ts       # RatingProvider strategy interface + factory
    │   ├── openskill.ts   # OpenSkill (default, patent-free)
    │   └── trueskill.ts   # TrueSkill (alternative, brand-restricted)
    ├── tiers.ts          # Pure tier calculation (+ test)
    ├── logoStorage.ts    # Custom arena logo storage (+ test)
    ├── teamColors.ts     # Team color allocation (+ test)
    ├── vite-env.d.ts     # Vite-injected type declarations
    ├── assets/           # Platform and tier icons (SVG/PNG)
    └── rendering/
        ├── index.ts      # PixiJS app lifecycle and orchestration
        ├── arena.ts      # Arena background and logo
        ├── tank.ts       # Bot/tank graphics
        ├── bullets.ts    # Bullet rendering
        ├── effects.ts    # Explosions and burst effects
        └── colors.ts     # Color utilities (+ test)
```

Protocol message types are defined inline in the modules that consume
them (`connection.ts`, `gameState.ts`, `ui.ts`) rather than centralized
in a `types/` directory.

## Development Workflow

### Running with Tank Royale Server

1. Download Tank Royale from [releases](https://github.com/robocode-dev/tank-royale/releases)
2. Start the GUI: `java -jar robocode-tankroyale-gui-x.y.z.jar`
3. The server starts automatically on `ws://localhost:7654`
4. Start the viewer: `npm run dev`
5. Connect to the server and start a battle in the Tank Royale GUI

### Running without Server (UI Development)

For UI development without a running server, you can:
- Work on styling and layout
- Test connection error handling
- Mock game state for rendering tests

### Hot Module Replacement

Vite provides instant updates when you save files:
- TypeScript changes: Automatically recompiled and reloaded
- CSS changes: Injected without full page reload
- HTML changes: Full page reload

## Code Style

### TypeScript

- Use strict mode (`strict: true` in tsconfig)
- Prefer `const` over `let`
- Use explicit return types for functions
- Use interfaces for object shapes, types for unions/primitives

### Naming Conventions

- **Files:** `camelCase.ts`
- **Classes:** `PascalCase`
- **Functions/variables:** `camelCase`
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Types/Interfaces:** `PascalCase`

### Imports

- Use named imports where possible
- Group imports: external packages first, then local modules
- Use `.js` extension in imports (required for ES modules)

```typescript
// External
import { Application, Graphics } from 'pixi.js';

// Local
import { GameState } from './gameState.js';
import type { BotState } from './types/protocol.js';
```

## Automated Testing

### Browser Journeys

```bash
npm run test:e2e
```

The browser tests start Vite and mock the Tank Royale WebSocket at the browser
boundary. They replay a sanitized server 1.0.2 battle from the waiting view
through final results and verify cleanup across abort, disconnect, reconnect,
server URL changes, reload, subsequent battles, team identity, and shared
placements. They do not require a live Tank Royale server.

## Testing with Tank Royale

### Local Server Setup

1. Ensure Java 11+ is installed
2. Download the GUI JAR from releases
3. Run: `java -jar robocode-tankroyale-gui-x.y.z.jar`
4. Add sample bots from the Config menu
5. Start a battle from Battle → New Battle

### Server URL

- Default: `ws://localhost:7654`
- Can be changed in Server Options in the GUI

### Server Secrets

If secrets are enabled on the server:
1. Find `server.properties` in the Tank Royale config directory
2. Copy the `controller-secrets` value
3. Enter it in the viewer when connecting

## Building for Production

```bash
# Create optimized build
npm run build

# Output is in dist/ folder
```

The production build:
- Bundles and minifies JavaScript
- Tree-shakes unused code
- Generates source maps
- Can be served by any static file server

## Troubleshooting

### "WebSocket connection failed"

- Ensure Tank Royale server is running
- Check the server URL (default: `ws://localhost:7654`)
- Check if server secrets are required

### "TypeScript errors"

- Run `npm run typecheck` for detailed errors
- Ensure all imports use `.js` extension

### "PixiJS WebGL not working"

- Check browser WebGL support: `chrome://gpu`
- PixiJS falls back to Canvas automatically
- Try a different browser

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Run `npm run test:all` and `npm run build`
4. Submit a pull request

See AGENTS.md for coding conventions that help maintain consistency.
