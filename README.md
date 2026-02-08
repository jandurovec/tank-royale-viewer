# Tank Royale Battle Viewer

A web-based viewer for [Robocode Tank Royale](https://github.com/robocode-dev/tank-royale) battles with GPU-accelerated rendering.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 📺 **TV broadcast experience** - Full-screen, designed for conference rooms and wall displays
- 🔌 **WebSocket connection** to Tank Royale server
- 🎮 **Real-time battle visualization** that keeps up with any server TPS
- 🚀 **GPU-accelerated graphics** using PixiJS/WebGL (frees CPU for bots)
- 📊 **Live scoreboard** overlay with bot scores and rankings
- 🏆 **Battle results** always captured and displayed
- 🤖 **Tank rendering** matching the official Robocode GUI style
- ⚙️ **Minimal UI** - Settings hidden behind a subtle gear icon

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 22 LTS or later
- [Tank Royale](https://github.com/robocode-dev/tank-royale/releases) (for running battles)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tank-royale-viewer.git
cd tank-royale-viewer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Connecting to Tank Royale

1. Start Tank Royale GUI:
   ```bash
   java -jar robocode-tankroyale-gui-x.y.z.jar
   ```
2. The server starts automatically on `ws://localhost:7654`
3. In the viewer, click **Connect** (default URL is pre-filled)
4. Start a battle in the Tank Royale GUI
5. Watch the battle in the viewer!

## Usage

The viewer is designed for full-screen presentation with minimal UI.

### Settings (Gear Icon)

Click the subtle gear icon in the top-right corner to access:
- **Server URL:** WebSocket URL of the Tank Royale server (default: `ws://localhost:7654`)
- **Secret:** Optional authentication secret if server has secrets enabled
- **Connect/Disconnect:** Toggle connection to server

Settings auto-hide once connected for a clean viewing experience.

### Views

**Pre-Battle:** Shows list of joined bots like team introductions

**During Battle:**
- Full-screen arena with tanks and bullets
- Semi-transparent scoreboard overlay
- Round and turn counter

**Post-Battle:** Results screen with final rankings and statistics

### Recommended Setup

1. Open viewer in browser
2. Press F11 for full-screen mode
3. Click gear icon, enter server URL, connect
4. Settings panel auto-hides
5. Start battle in Tank Royale GUI
6. Enjoy the show!

## Building for Production

```bash
npm run build
```

The built files are in `dist/` and can be served by any static file server.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Design decisions and tech stack rationale
- [Protocol](docs/PROTOCOL.md) - Tank Royale WebSocket protocol reference
- [Development](docs/DEVELOPMENT.md) - Development setup and contribution guide

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool with HMR
- **PixiJS v8** - GPU-accelerated 2D rendering

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run typecheck` and `npm run lint`
5. Submit a pull request

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed instructions.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Robocode Tank Royale](https://github.com/robocode-dev/tank-royale) by Flemming N. Larsen
- [PixiJS](https://pixijs.com/) for excellent 2D rendering
