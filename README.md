# Tank Royale Battle Viewer

A web-based viewer for [Robocode Tank Royale](https://github.com/robocode-dev/tank-royale) battles with GPU-accelerated rendering.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## What This Is

A **passive observer** designed for broadcasting battles on a shared display (projector, TV, conference room screen) - giving your audience a polished "live sports broadcast" experience.

## What This Is Not

This viewer **does not control battles**. There are no features for starting battles, selecting bots, or managing the server. Use the official Tank Royale GUI (or another controller) on a separate screen for that.

## Features

- 📺 **TV broadcast experience** - Full-screen, designed for conference rooms and wall displays
- 🔌 **WebSocket connection** to Tank Royale server with auto-reconnect
- 🎮 **Real-time battle visualization** that keeps up with any server TPS
- 🚀 **GPU-accelerated graphics** using PixiJS/WebGL (frees CPU for bots)
- 🤖 **Tank rendering** based on the official Robocode GUI style with enhancements
- 👥 **Team support** with colored indicators and grouped displays
- 🏆 **Battle results** always captured and displayed
- 📈 **Skill ratings** - Local skill tracking (OpenSkill or TrueSkill, selectable) with tier badges (Scrap → Legend)
- 🖼️ **Custom arena logo** - Upload your own background image
- 🌓 **Light/dark theme** - Toggle the surrounding UI between themes; the arena stays dark for broadcast clarity
- ⚙️ **Minimal UI** - Settings hidden behind a subtle gear icon

## Quick Start

Since this is a static web app running in your browser, you can use it directly at:

**https://jandurovec.github.io/tank-royale-viewer/**

No installation required - just open the link and connect to your local Tank Royale server.

### Local Development

If you want to modify the viewer or run it locally:

#### Prerequisites

- [Node.js](https://nodejs.org/) 24 or later (24 LTS recommended)
- [Tank Royale](https://github.com/robocode-dev/tank-royale/releases) (for running battles)

#### Setup

```bash
# Clone the repository (the official one or your fork)
git clone https://github.com/jandurovec/tank-royale-viewer.git
cd tank-royale-viewer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173/ in your browser.

### Connecting to Tank Royale

1. Start Tank Royale GUI:
   ```bash
   java -jar robocode-tankroyale-gui-x.y.z.jar
   ```
2. The server starts automatically on `ws://localhost:7654`
3. Open the viewer - it connects automatically to the default URL
4. Start a battle in the Tank Royale GUI
5. Watch the battle in the viewer!

## Usage

The viewer is designed for full-screen presentation with minimal UI.

### Settings (Gear Icon)

Click the subtle gear icon in the top-right corner to access:
- **Server URL:** WebSocket URL of the Tank Royale server (default: `ws://localhost:7654`)
- **Secret:** Optional authentication secret if server has secrets enabled
- **Arena logo:** Upload a custom background image with adjustable opacity and size
- **Skill ratings:** Toggle display, choose rating algorithm (OpenSkill or TrueSkill), configure thresholds, export/import/reset ratings

### Views

**Pre-Battle:** Shows list of connected bots with ratings and team groupings

**During Battle:**
- Full-screen arena with bots, bullets, and visual effects
- Mini bot list docked left (visible through transparent arena margins)
- Round and turn counter

**Post-Battle:** Results screen with final rankings, statistics, and rating changes

### Recommended Setup

1. Open viewer in browser
2. Press F11 for full-screen mode
3. UI connects automatically (click the gear icon to verify server URL and secret)
4. Start battle in Tank Royale GUI
5. Enjoy the show!

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
4. Run `npm run test:all` and `npm run build`
5. Submit a pull request

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed instructions.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Robocode Tank Royale](https://github.com/robocode-dev/tank-royale) by Flemming N. Larsen
- [PixiJS](https://pixijs.com/) for excellent 2D rendering
