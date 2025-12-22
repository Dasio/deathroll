# DeathRoll - Multiplayer Dice Game

## Overview

DeathRoll is a browser-based multiplayer dice game using **WebRTC/PeerJS** for peer-to-peer communication. It can be hosted on any static file server (S3, Vercel, Netlify) since it uses **Next.js with static export**.

## Game Rules

1. N players take turns rolling dice (minimum: 1 player)
2. First player sets the starting range (e.g., 100), rolls 1-100
3. The result becomes the next player's maximum (rolled 40 → next rolls 1-40)
4. Player who rolls **1** loses that round (DEATH ROLL!)
5. Game continues infinitely, tracking each player's loss count
6. The loser of each round chooses the starting range for the next round
7. **Special**: Rolling the maximum value triggers "MAX ROLL!" - previous player drinks (for drinking game mode)

## Architecture

### Star Topology (Host as Hub)

```
        ┌─────────┐
        │  HOST   │  ← Source of truth, generates all rolls
        │  (TV)   │
        └────┬────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼───┐┌───▼───┐┌───▼───┐
│Player1││Player2││Player3│  ← Connect to host only
└───────┘└───────┘└───────┘
```

### Room Code System

- Host creates game → generates 4-char code (e.g., "AXYZ")
- Host registers as PeerJS peer: `deathroll-AXYZ`
- Players enter code → connect to that peer ID
- QR code available for easy mobile joining

### Why Host Generates Rolls

- Prevents cheating (players can't manipulate RNG)
- Single source of truth for game state
- All players receive same state updates via broadcast
- Uses cryptographic RNG (`crypto.getRandomValues`)

## Game Modes

1. **Local/Hot-seat**: All players on one device (host adds local players)
2. **Remote**: Players join via room code from their own devices
3. **Hybrid**: Mix of local + remote players

## Tech Stack

| Component | Choice |
|-----------|--------|
| Framework | Next.js 16 (static export) |
| Styling | Tailwind CSS (dark theme) |
| P2P | PeerJS (WebRTC) |
| State | React useState/useCallback |
| Hosting | Any static host |

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Landing page (Create/Join)
│   ├── host/page.tsx      # Host view (TV mode or playing)
│   ├── play/page.tsx      # Remote player view
│   └── globals.css        # Dark theme CSS variables
│
├── components/
│   ├── ui/                # Button, Input, Card
│   └── game/              # RollDisplay, PlayerList, RollHistory, RoomCode
│
├── lib/
│   ├── peer/
│   │   ├── HostPeer.ts    # Host connection manager
│   │   ├── PlayerPeer.ts  # Player connection manager
│   │   └── config.ts      # ICE/STUN servers config
│   │
│   └── game/
│       ├── gameLogic.ts   # Turn logic, roll processing
│       ├── roomCode.ts    # 4-char code generation
│       └── random.ts      # Cryptographic RNG
│
├── hooks/
│   ├── useHostGame.ts     # Host game state management
│   └── usePlayerGame.ts   # Player game state management
│
└── types/
    ├── game.ts            # GameState, Player, RollEntry types
    └── messages.ts        # P2P message types
```

## Key Types

```typescript
interface Player {
  id: string;
  name: string;
  isLocal: boolean;       // true = on host device
  isConnected: boolean;
  connectionId?: string;  // PeerJS connection ID (remote only)
  losses: number;         // Loss count for this player
}

interface GameState {
  phase: "lobby" | "playing";
  players: Player[];
  currentPlayerIndex: number;
  currentMaxRoll: number;
  initialMaxRoll: number;
  lastRoll: number | null;
  lastMaxRoll: number | null;     // For detecting max rolls
  lastRollPlayerId: string | null;
  rollHistory: RollEntry[];
  lastLoserId: string | null;     // Who just lost
  roundNumber: number;
}
```

## P2P Message Types

```typescript
// Player → Host
type PlayerMessage =
  | { type: "JOIN_REQUEST"; name: string; spectator?: boolean }
  | { type: "ROLL_REQUEST"; overrideRange?: number }  // Range can be set atomically with roll
  | { type: "SET_RANGE"; maxRange: number }
  | { type: "HEARTBEAT" };

// Host → Player
type HostMessage =
  | { type: "JOIN_ACCEPTED"; playerId: string; state: GameState }
  | { type: "RECONNECT_ACCEPTED"; playerId: string; state: GameState }
  | { type: "JOIN_REJECTED"; reason: string }
  | { type: "STATE_UPDATE"; state: GameState }
  | { type: "GAME_OVER"; loserId: string }
  | { type: "KICK"; reason: string }
  | { type: "HEARTBEAT_ACK" };
```

## Key Features

### Dice Animation
- 10-frame animation showing random numbers
- Excludes "1" from random display to prevent false "DEATH ROLL!" flash
- Shows final result after animation completes
- "DEATH ROLL!" text only appears after animation ends
- "MAX ROLL!" notification when rolling the maximum value

### Notifications Timing
- Loser/winner notifications are delayed until dice animation completes
- Uses `onAnimationComplete` callback from RollDisplay component
- Local state tracks when to show notifications

### Range Limits
- Minimum range: 2
- Maximum range: No limit (JavaScript safe integer max)
- Numbers displayed with locale formatting (e.g., "1,000,000")

### Mid-Game Joining
- Players can join at any time, even after the game has started
- New players start with 0 losses
- They wait for their turn in the rotation

### Player Management
- Host can kick remote players at any time (lobby or during game)
- Host can remove local players
- Kicked players see a "You were kicked" message

## Known Limitations

1. **Host closes = game ends** (no host migration)
2. **NAT issues**: ~85% success with STUN only, would need TURN for 99%
3. **PeerJS cloud**: Has rate limits (can self-host peerjs-server)

## Potential Improvements

### High Priority
- [ ] Add TURN server fallback for better NAT traversal
- [x] Persist game state to localStorage for refresh recovery
- [ ] Host migration when host disconnects
- [x] Sound effects for rolls, death roll, max roll
- [x] Vibration on mobile when it's your turn

### Medium Priority
- [x] Spectator mode (join without playing)
- [x] Kick player functionality for host
- [x] Reconnection handling for disconnected players
- [x] Custom player avatars/colors (emoji + color)
- [ ] Game history/statistics persistence

### Low Priority
- [ ] Multiple game modes (elimination, timed rounds)
- [ ] Customizable drinking rules
- [ ] Tournament mode with brackets
- [ ] Voice chat integration
- [ ] Dark/light theme toggle

### Technical Improvements
- [ ] Add unit tests for game logic
- [ ] E2E tests with Playwright
- [ ] Self-hosted PeerJS server option
- [ ] Service worker for offline support
- [ ] PWA manifest for "Add to Home Screen"

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production (static export)
npm run build

# Output in /out directory, deploy anywhere
```

## Deployment

The `npm run build` command generates a static site in `/out`. Deploy to:
- AWS S3 + CloudFront
- Vercel
- Netlify
- GitHub Pages
- Any static file server

## NAT Traversal

Current config uses free Google STUN servers:
```typescript
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
```

For production with better connectivity, add TURN servers (Twilio/Xirsys have free tiers).
