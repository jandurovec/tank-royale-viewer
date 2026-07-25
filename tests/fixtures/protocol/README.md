# Protocol Replay Fixtures

These JSON files are scenario containers for controller, browser, and visual
tests. Their top-level metadata is not part of the Tank Royale protocol; the
objects inside `messages` are incoming observer messages.

The messages follow the official Tank Royale schemas at commit
`86a4bd58514bcdc4d36f1dd374900e6eae3b29f3`.

- `solo-battle.json` is a condensed, sanitized server 1.0.2 battle. Its
  `GameStartedEventForObserver`, selected firing and lethal ticks, and
  `GameEndedEventForObserver` are derived from expanded real messages. Session
  IDs and network addresses are replaced. Intermediate turn ranges are
  intentionally omitted.
- Its bot-list snapshots are constructed from the observed participant
  metadata, and its one-round `RoundEndedEventForObserver` reuses the final
  results as the server does.

Do not infer that omitted turns or messages were absent from the original
battle. Replay tests should treat this fixture as a condensed scenario, not a
lossless wire recording.

Connection retry mechanics remain covered by `src/connection.test.ts`.
Browser lifecycle tests reuse these observer messages after mocked connections
to verify cleanup across abort, reconnect, reload, and subsequent battles.

When a supported Tank Royale protocol changes, update or add a fixture rather
than silently changing the meaning of an existing scenario.
