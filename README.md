# 🎲 DeathRoll - Multiplayer Dice Game

> **Note:** This project was fully vibe coded with Claude Code.

A real-time multiplayer dice game built with Next.js and WebRTC. Players take turns rolling dice with decreasing ranges until someone rolls a 1 and loses. Features team mode, statistics tracking, smart reconnection, and PWA support.

## ✨ Features

- 🎮 **Real-time Multiplayer** - Peer-to-peer gaming using WebRTC (no server needed!)
- 👥 **Flexible Team Mode** - Any team combination (1v2v3, 2v2, 1v1v1, etc.)
- 📊 **Statistics Dashboard** - Track wins, losses, streaks, and achievements
- 🔌 **Smart Reconnection** - Auto-reconnect with network quality indicator
- 📱 **PWA Support** - Install on mobile/desktop, works offline
- ⚡ **Real-time Sync** - State synchronization across all players
- 🎨 **Custom Avatars** - Emoji avatars and color themes for each player
- ⌨️ **Keyboard Shortcuts** - Space/Enter to roll dice

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build static export
npm run build

# Output in ./out directory
```

## 🎮 How to Play

1. **Host a Game**
   - Click "Host Game"
   - Share the room code with players
   - Configure teams (optional)
   - Start the game when everyone joins

2. **Join a Game**
   - Click "Join Game"
   - Enter the room code
   - Choose your name and avatar
   - Wait for host to start

3. **Gameplay**
   - First roll: 1-100
   - Each subsequent roll: 1-(previous result)
   - Roll a 1 → You lose!
   - Last player standing wins

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **WebRTC:** PeerJS
- **PWA:** Service Workers + Web App Manifest
- **State:** React Hooks + Context

## 🌐 Deployment

Deploy to GitHub Pages, Vercel, Netlify, or Cloudflare Pages:

```bash
# GitHub Pages (automatic via Actions)
git push origin main

# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=out
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📱 PWA Installation

After deployment:
1. Visit your app URL in Chrome/Edge
2. Look for "Install app" prompt
3. Or: Menu → "Add to Home Screen"
4. App works offline after first visit

## 🔧 Configuration

### Optional: TURN Server

Improve connection reliability (85% → 99%) by configuring a TURN server:

```bash
# .env.local
NEXT_PUBLIC_TURN_URL=turn:your-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=username
NEXT_PUBLIC_TURN_CREDENTIAL=password
```

Free TURN providers: [Metered.ca](https://www.metered.ca/tools/openrelay/), [Twilio](https://www.twilio.com/stun-turn)

### Optional: Custom Base Path

For GitHub Pages at `username.github.io/repo-name/`:

```bash
NEXT_PUBLIC_BASE_PATH=/repo-name npm run build
```

## 📊 Statistics

Track your performance at `/stats`:
- Win/loss record and win rate
- Current and longest streaks
- Total rolls and average roll
- Achievements (Fastest Win, Comeback, etc.)
- Global leaderboard
- Export/share stats

## 🎯 Game Modes

### Free-for-All (Default)
- 2-8 players
- Last player standing wins

### Team Mode
- Create any team combination
- 1v2v3, 2v2, 3v3, etc.
- Teams share turns
- Eliminate entire team when any member rolls 1

## 🔌 Connection Features

- **Auto-reconnect** on network drop
- **Network quality indicator** (excellent/good/poor)
- **State persistence** survives page refresh
- **Exponential backoff** prevents spam
- **Manual retry** after failed attempts

## 📁 Project Structure

```
deathroll/
├── src/
│   ├── app/              # Next.js app routes
│   │   ├── page.tsx      # Home page
│   │   ├── host/         # Host game page
│   │   ├── play/         # Join game page
│   │   └── stats/        # Statistics dashboard
│   ├── components/       # React components
│   │   ├── game/         # Game-specific UI
│   │   ├── ui/           # Reusable UI components
│   │   └── pwa/          # PWA components
│   ├── hooks/            # React hooks
│   │   ├── useHostGame.ts
│   │   └── usePlayerGame.ts
│   ├── lib/              # Core logic
│   │   ├── game/         # Game rules & state
│   │   ├── peer/         # WebRTC peer management
│   │   ├── statistics.ts # Stats tracking
│   │   └── storage.ts    # LocalStorage helpers
│   └── types/            # TypeScript types
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   ├── sw.js            # Service worker
│   └── icons/           # App icons
└── scripts/             # Build scripts
```

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for anything!

## 🎮 Live Demo

Play now: [https://Dasio.github.io/deathroll/](https://Dasio.github.io/deathroll/)

---

Built with ❤️ using Next.js, WebRTC, and good vibes
