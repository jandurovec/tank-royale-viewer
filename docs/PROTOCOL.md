# Tank Royale WebSocket Protocol

This document describes the WebSocket protocol used to communicate with the Tank Royale server as an observer.

## Connection

The Tank Royale server listens on WebSocket at:
- **Default URL:** `ws://localhost:7654`
- **Default port:** 7654

## Message Format

All messages are JSON objects with a `type` field indicating the message type:

```json
{
  "type": "MessageType",
  ...additional fields
}
```

## Handshake Sequence

### 1. Server → Observer: ServerHandshake

Sent immediately when a client connects:

```json
{
  "type": "ServerHandshake",
  "sessionId": "unique-session-id",
  "name": "Robocode Tank Royale Server",
  "variant": "Tank Royale",
  "version": "0.x.x",
  "gameSetup": {
    "gameType": "classic",
    "arenaWidth": 800,
    "arenaHeight": 600,
    "numberOfRounds": 10,
    "gunCoolingRate": 0.1,
    "maxInactivityTurns": 450,
    "turnTimeout": 30000,
    "readyTimeout": 1000000
  }
}
```

### 2. Observer → Server: ObserverHandshake

Observer must respond to identify itself:

```json
{
  "type": "ObserverHandshake",
  "sessionId": "session-id-from-server",
  "name": "Tank Royale Viewer",
  "version": "1.0.0",
  "secret": "optional-observer-secret"
}
```

The `secret` field is only required if the server has secrets enabled.

## Bot List

### BotListUpdate

Sent to observers when bots connect or disconnect, and immediately after observer handshake:

```json
{
  "type": "BotListUpdate",
  "bots": [
    {
      "sessionId": "bot-session-id",
      "name": "MyBot",
      "version": "1.0",
      "authors": ["Author Name"],
      "countryCodes": ["US"],
      "host": "127.0.0.1",
      "port": 54321,
      "teamId": 1,
      "teamName": "MyTeam",
      "teamVersion": "1.0",
      "isDroid": false
    }
  ]
}
```

The `bots` array contains all currently connected bots (full list, not delta). May be empty.

Team fields (`teamId`, `teamName`, `teamVersion`, `isDroid`) are only present for bots that are part of a team. A droid is a team member with no radar but +20 energy (120 HP).

## Game Events

### GameStartedEventForObserver

Sent when a battle begins:

```json
{
  "type": "GameStartedEventForObserver",
  "gameSetup": {
    "gameType": "classic",
    "arenaWidth": 800,
    "arenaHeight": 600,
    "numberOfRounds": 10,
    ...
  },
  "participants": [
    {
      "id": 1,
      "sessionId": "bot-session-id",
      "name": "MyBot",
      "version": "1.0",
      "authors": ["Author Name"],
      "description": "Bot description",
      "homepage": "https://example.com",
      "countryCodes": ["US"],
      "gameTypes": ["classic", "melee"],
      "platform": "JVM",
      "programmingLang": "Java",
      "teamId": 1,
      "teamName": "MyTeam",
      "teamVersion": "1.0"
    },
    ...
  ]
}
```

### RoundStartedEvent

Sent at the start of each round:

```json
{
  "type": "RoundStartedEvent",
  "roundNumber": 1
}
```

### TickEventForObserver

Sent every turn with the complete game state:

```json
{
  "type": "TickEventForObserver",
  "roundNumber": 1,
  "turnNumber": 42,
  "botStates": [
    {
      "id": 1,
      "energy": 100.0,
      "x": 150.5,
      "y": 200.3,
      "direction": 45.0,
      "gunDirection": 90.0,
      "radarDirection": 90.0,
      "radarSweep": 45.0,
      "speed": 8.0,
      "turnRate": 5.0,
      "gunTurnRate": 10.0,
      "radarTurnRate": 20.0,
      "gunHeat": 0.0,
      "bodyColor": "#FF0000",
      "turretColor": "#00FF00",
      "radarColor": "#0000FF",
      "bulletColor": "#FFFF00",
      "scanColor": "#FF00FF",
      "tracksColor": "#00FFFF",
      "gunColor": "#FFFFFF"
    },
    ...
  ],
  "bulletStates": [
    {
      "bulletId": 1,
      "ownerId": 1,
      "power": 2.0,
      "x": 300.0,
      "y": 400.0,
      "direction": 180.0,
      "color": "#FFFF00"
    },
    ...
  ],
  "events": [
    {
      "type": "BotDeathEvent",
      "turnNumber": 42,
      "victimId": 2
    },
    {
      "type": "BulletHitBotEvent",
      "turnNumber": 42,
      "bulletId": 1,
      "victimId": 2,
      "damage": 8.0,
      "energy": 92.0
    },
    ...
  ]
}
```

### Event Types in TickEventForObserver

Events that can appear in the `events` array:

| Event Type | Description |
|------------|-------------|
| `BotDeathEvent` | A bot has been destroyed |
| `BotHitBotEvent` | Two bots collided |
| `BotHitWallEvent` | A bot hit the arena wall |
| `BulletFiredEvent` | A bot fired a bullet |
| `BulletHitBotEvent` | A bullet hit a bot |
| `BulletHitBulletEvent` | Two bullets collided |
| `BulletHitWallEvent` | A bullet hit the wall |
| `ScannedBotEvent` | A bot scanned another bot |

Visual effects follow battle turns rather than elapsed time. Bot death
explosions contain 15 bursts with a 50-turn period, while bullet-hit effects
have a 25-turn period. The viewer keeps an internal effect turn when the
server's turn number resets, allowing an in-progress effect to continue into
the next round. Starting or ending a game, aborting it, or disconnecting
clears effects. If turns advance through an effect period before the next
display frame, the animation can finish without being drawn.

### RoundEndedEventForObserver

Sent when a round ends:

```json
{
  "type": "RoundEndedEventForObserver",
  "roundNumber": 1,
  "turnNumber": 500,
  "results": [
    {
      "id": 1,
      "rank": 1,
      "survival": 50,
      "lastSurvivorBonus": 10,
      "bulletDamage": 120,
      "bulletKillBonus": 30,
      "ramDamage": 10,
      "ramKillBonus": 5,
      "totalScore": 225,
      "firstPlaces": 1,
      "secondPlaces": 0,
      "thirdPlaces": 0
    },
    ...
  ]
}
```

The viewer accepts this event without changing view state or showing a
per-round result overlay. Battle rendering continues with the next round. Only
`GameEndedEventForObserver` opens the final results view.

### GameEndedEventForObserver

Sent when the entire battle ends:

```json
{
  "type": "GameEndedEventForObserver",
  "numberOfRounds": 10,
  "results": [
    {
      "id": 1,
      "name": "MyBot",
      "version": "1.0",
      "rank": 1,
      "survival": 500,
      "lastSurvivorBonus": 100,
      "bulletDamage": 1200,
      "bulletKillBonus": 300,
      "ramDamage": 100,
      "ramKillBonus": 50,
      "totalScore": 2250,
      "firstPlaces": 8,
      "secondPlaces": 2,
      "thirdPlaces": 0
    },
    ...
  ]
}
```

#### Team Results

For team battles, the server aggregates scores at the team level:
- **Team result:** `id` = teamId, `name` = teamName, `version` = teamVersion
- **Solo bot result:** `id` = botId, `name` = botName, `version` = botVersion

**Known issues:**

1. **ID collision:** Team IDs and bot IDs can have the same numeric value (e.g., Team 3 and Bot 3 can coexist). To detect whether a result is for a team, check if any participant has matching `teamId` AND `teamName`.

2. **Rank field unreliable:** The `rank` field is broken for team battles.
   Multi-member teams always have `rank=0` due to a server bug in score
   aggregation. The viewer computes results once for both display and ratings:
   repeated names are collapsed by averaging their score fields, results are
   sorted by `totalScore` descending and then by participant ID and name, and
   equal totals receive shared placements such as `1, 2, 2, 4`. A self-battle
   therefore produces one prepared participant and does not update ratings.

### GameAbortedEvent

Sent if the game is aborted:

```json
{
  "type": "GameAbortedEvent"
}
```

The viewer returns to the waiting view, retaining the current connected-bot
list while clearing battle graphics, effects, round and turn indicators, and
any previous results.

## Bot Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Bounding circle radius | 18 | Bot collision radius in units |
| Max speed | 8 | Maximum bot movement speed |
| Max turn rate | 10° | Maximum body turn rate (at speed 0) |
| Gun turn rate | 20° | Maximum gun turn rate per turn |
| Radar turn rate | 45° | Maximum radar turn rate per turn |
| Radar range | 1200 | Maximum radar scan distance |

## Colors

Colors are provided as hex strings (e.g., `"#FF0000"`) and should be applied to:
- `bodyColor` - Tank body
- `turretColor` - Gun turret
- `radarColor` - Radar dish
- `bulletColor` - Bullets fired by this bot
- `scanColor` - Scan arc visualization
- `tracksColor` - Tank tracks
- `gunColor` - Gun barrel

## References

- [Tank Royale GitHub](https://github.com/robocode-dev/tank-royale)
- [Tank Royale Documentation](https://robocode-dev.github.io/tank-royale/)
- [Schema definitions](https://github.com/robocode-dev/tank-royale/tree/main/schema)
