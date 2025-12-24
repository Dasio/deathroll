# Smart Reconnection Integration Guide

This guide shows how to integrate the new smart reconnection features into the DeathRoll game UI.

## Features Implemented

### 1. Enhanced State Persistence (sessionStorage)
- **Location**: `/src/lib/storage.ts`
- Saves active game state to sessionStorage during gameplay
- Automatically restores state on page refresh
- Cleared when tab is closed or user manually disconnects

### 2. Auto-Reconnect on Network Drop
- **Location**: `/src/lib/peer/PlayerPeer.ts`
- Detects browser online/offline events
- Automatically attempts reconnection without user action
- Improved exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
- Maximum 10 reconnection attempts

### 3. State Sync on Reconnect
- Messages now include optional sequence numbers for ordering
- Player sends existing `playerId` in `JOIN_REQUEST` when reconnecting
- Host recognizes reconnection and sends `RECONNECT_ACCEPTED`
- Full game state synced after successful reconnection

### 4. Network Quality Indicator
- **Location**: `/src/components/ui/ConnectionStatus.tsx`
- Monitors latency via heartbeat messages
- Quality levels: excellent (<100ms), good (<300ms), poor (>=300ms), offline
- Visual indicator with colored WiFi icon

### 5. Reconnection UI
- **Component**: `ConnectionStatus`
- Automatic overlay when reconnecting
- Shows progress: "Reconnecting... (attempt 3/10)"
- Progress bar visualization
- Manual "Retry" button appears after 3+ failed attempts
- Success toast on reconnection

## How to Integrate ConnectionStatus Component

### Basic Usage in Play Page

Add to the top of your play page component:

```tsx
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

function PlayContent() {
  const {
    // ... existing hooks
    networkQuality,
    latency,
    reconnectionState,
    manualReconnect,
  } = usePlayerGame();

  return (
    <>
      {/* Add ConnectionStatus - renders overlay automatically */}
      <ConnectionStatus
        networkQuality={networkQuality}
        latency={latency}
        reconnectionState={reconnectionState}
        onRetry={manualReconnect}
      />

      {/* Your existing game UI */}
      <main className="min-h-screen p-4">
        {/* ... */}
      </main>
    </>
  );
}
```

### Show Network Quality Indicator

Add the indicator to your game header:

```tsx
<div className="flex items-center gap-4">
  <h1 className="text-2xl font-bold">DeathRoll</h1>

  {/* Network quality indicator */}
  {status === "open" && (
    <ConnectionStatus
      networkQuality={networkQuality}
      latency={latency}
      className="ml-auto"
    />
  )}
</div>
```

### Alternative: Use Separate Components

For more control, use the individual components:

```tsx
import {
  ReconnectionOverlay,
  ConnectionRestoredToast,
} from "@/components/ui/ConnectionStatus";

function PlayContent() {
  const { reconnectionState, manualReconnect } = usePlayerGame();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!reconnectionState.isReconnecting && reconnectionState.attempt > 0) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [reconnectionState.isReconnecting]);

  return (
    <>
      <ReconnectionOverlay
        isVisible={reconnectionState.isReconnecting}
        attempt={reconnectionState.attempt}
        maxAttempts={reconnectionState.maxAttempts}
        onRetry={manualReconnect}
      />

      <ConnectionRestoredToast isVisible={showSuccess} />

      {/* Your game UI */}
    </>
  );
}
```

## API Reference

### usePlayerGame Hook - New Properties

```typescript
const {
  // Existing properties
  status,
  playerId,
  gameState,
  // ... others

  // NEW: Network monitoring
  networkQuality: NetworkQuality,        // "excellent" | "good" | "poor" | "offline"
  latency: number,                       // Average latency in ms
  reconnectionState: ReconnectionState,  // { isReconnecting, attempt, maxAttempts }

  // NEW: Manual reconnect
  manualReconnect: () => void,          // Manually trigger reconnection
} = usePlayerGame();
```

### ConnectionStatus Component Props

```typescript
interface ConnectionStatusProps {
  networkQuality: NetworkQuality;
  latency: number;
  reconnectionState?: ReconnectionState;
  onRetry?: () => void;
  className?: string;
}
```

### Storage Functions

```typescript
// Session storage (cleared on tab close)
saveActiveGameSession(roomCode, playerId, playerName, gameState, isSpectator);
loadActiveGameSession(): ActiveGameSession | null;
clearActiveGameSession();

// Persistent storage (localStorage)
savePlayerSession(roomCode, playerName, playerId);
loadPlayerSession(): SavedPlayerSession | null;
clearPlayerSession();
```

## How It Works

### Connection Flow

1. **Initial Connection**
   - Player connects with `JOIN_REQUEST`
   - Host sends `JOIN_ACCEPTED` with playerId
   - Session saved to both sessionStorage and localStorage

2. **Connection Drop**
   - Browser detects offline event OR connection closes
   - Status changes to "reconnecting"
   - Reconnection overlay appears automatically
   - Auto-reconnect begins with exponential backoff

3. **Reconnection Attempt**
   - Player sends `JOIN_REQUEST` with existing `playerId`
   - Host recognizes player and sends `RECONNECT_ACCEPTED`
   - Full game state synced
   - UI shows "Connection restored!" toast

4. **Page Refresh**
   - sessionStorage restores last known game state
   - localStorage prompts user to rejoin previous room
   - Player reconnects with saved playerId

### Network Monitoring

- Heartbeat every 5 seconds
- Ping monitoring every 10 seconds
- Latency calculated from round-trip time
- Rolling average of last 10 samples
- Quality thresholds:
  - Excellent: < 100ms
  - Good: 100-300ms
  - Poor: > 300ms
  - Offline: No connection

### Edge Cases Handled

1. **Multiple Tabs**: Each tab has independent sessionStorage
2. **Page Refresh**: State restored from sessionStorage
3. **Browser Close**: sessionStorage automatically cleared
4. **Network Flap**: Exponential backoff prevents rapid reconnection spam
5. **Max Attempts**: Shows error after 10 failed attempts
6. **Manual Disconnect**: Skips auto-reconnect when user clicks disconnect

## Testing Recommendations

### Test Scenarios

1. **Basic Reconnection**
   - Start game, disconnect WiFi, reconnect WiFi
   - Should auto-reconnect within seconds

2. **Poor Network**
   - Use Chrome DevTools Network throttling
   - Set to "Slow 3G" and verify "poor" indicator

3. **Page Refresh**
   - Start game, refresh page
   - State should be restored from sessionStorage

4. **Max Attempts**
   - Disconnect network, wait for 10 failed attempts
   - Verify error message and manual retry button

5. **Multiple Players**
   - Start game with 2+ players
   - Disconnect one player, verify game continues
   - Reconnect player, verify they rejoin with same playerId

### Chrome DevTools Network Simulation

```
Network > Throttling > Add custom profile:
- Download: 50 kb/s
- Upload: 20 kb/s
- Latency: 500ms
```

This will show "poor" network quality indicator.

## Customization

### Change Reconnection Parameters

Edit `/src/lib/peer/PlayerPeer.ts`:

```typescript
private maxReconnectAttempts: number = 10;  // Change max attempts

// In attemptReconnect():
const baseDelay = 1000 * Math.pow(2, Math.min(this.reconnectAttempts - 1, 4));
const delay = Math.min(baseDelay, 30000);  // Change max delay
```

### Customize Network Quality Thresholds

Edit `/src/lib/peer/PlayerPeer.ts`:

```typescript
private updateLatency(latency: number) {
  // Change thresholds here
  if (avgLatency < 100) {
    quality = "excellent";
  } else if (avgLatency < 300) {
    quality = "good";
  } else {
    quality = "poor";
  }
}
```

### Style the Reconnection Overlay

Edit `/src/components/ui/ConnectionStatus.tsx`:

```tsx
// Change overlay background
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">

// Change card style
<div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-8">

// Change progress bar color
<div className="h-full bg-[var(--primary)]">
```

## Files Modified

### Core Files
- `/src/lib/storage.ts` - Added sessionStorage helpers
- `/src/lib/peer/PlayerPeer.ts` - Enhanced reconnection logic
- `/src/hooks/usePlayerGame.ts` - Integrated reconnection state
- `/src/types/messages.ts` - Added sequence numbers and new message types

### New Files
- `/src/components/ui/ConnectionStatus.tsx` - UI components for connection status

### Updated Files
- `/src/app/globals.css` - Added fadeIn animation
- `/src/lib/peer/HostPeer.ts` - Handle STATE_SYNC_REQUEST message

## Benefits

1. **Better UX**: Automatic reconnection without user intervention
2. **State Preservation**: No game progress lost on network hiccups
3. **Visibility**: Clear feedback on connection status
4. **Reliability**: Exponential backoff prevents server overload
5. **Flexibility**: Manual retry option for persistent issues
6. **Network Awareness**: Users can see when connection is poor

## Future Enhancements

Possible improvements:

1. **Missed Events Queue**: Queue events during disconnection and replay on reconnect
2. **Peer-to-Peer Sync**: Allow peers to sync state with each other
3. **Connection History**: Log connection events for debugging
4. **Adaptive Backoff**: Adjust backoff based on network conditions
5. **Bandwidth Indicator**: Show upload/download speeds
6. **Connection Stats**: Show detailed connection metrics in settings
