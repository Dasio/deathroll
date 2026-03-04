import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockPeer, MockDataConnection } from "./helpers/mockPeer";

// Mock peerjs at module level
vi.mock("peerjs", () => ({
  default: MockPeer,
  Peer: MockPeer,
}));

// Stub browser APIs that PlayerPeer uses in constructor
vi.stubGlobal("window", {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});
vi.stubGlobal("document", {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  visibilityState: "visible",
});

import { PlayerPeer, PlayerPeerCallbacks } from "../PlayerPeer";

function makeCallbacks(overrides?: Partial<PlayerPeerCallbacks>): PlayerPeerCallbacks {
  return {
    onStatusChange: vi.fn(),
    onJoinAccepted: vi.fn(),
    onJoinRejected: vi.fn(),
    onStateUpdate: vi.fn(),
    onGameOver: vi.fn(),
    onKicked: vi.fn(),
    onError: vi.fn(),
    onReconnectionStateChange: vi.fn(),
    onNetworkQualityChange: vi.fn(),
    onLatencyUpdate: vi.fn(),
    ...overrides,
  };
}

/** Connect a PlayerPeer and return the MockDataConnection used */
async function connectPlayer(
  player: PlayerPeer,
  conn?: MockDataConnection,
): Promise<MockDataConnection> {
  const mockConn = conn ?? new MockDataConnection("host-peer");
  // Intercept Peer constructor to set up our connection
  const origConnect = MockPeer.prototype.connect;
  MockPeer.prototype.connect = function (_peerId: string, _opts?: object) {
    queueMicrotask(() => mockConn.emit("open"));
    return mockConn as unknown as ReturnType<typeof origConnect>;
  };

  await player.connect("ABCD", "TestPlayer");

  // Restore
  MockPeer.prototype.connect = origConnect;
  return mockConn;
}

describe("PlayerPeer reconnection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Reconnection chain continues after failure
  it("schedules another attempt when connect() fails during reconnection", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn = await connectPlayer(player);

    // Simulate connection close → triggers attemptReconnect
    conn.open = false;
    conn.emit("close");

    // attemptReconnect sets "reconnecting" and schedules a timeout
    expect(cbs.onStatusChange).toHaveBeenCalledWith("reconnecting");

    // Make next connect() fail
    const origConnect = MockPeer.prototype.connect;
    MockPeer.prototype.connect = function () {
      const badConn = new MockDataConnection("host-peer");
      badConn.open = false;
      // Don't emit "open" — instead the peer will emit an error
      queueMicrotask(() => {
        this.emit("error", { type: "network", message: "fail" });
      });
      return badConn as unknown as ReturnType<typeof origConnect>;
    };

    // Advance past first reconnect delay (up to ~1.2s with jitter)
    await vi.advanceTimersByTimeAsync(1500);

    // The connect promise rejects → attemptReconnect is called again
    // Check that reconnectionState shows attempt >= 2
    const reconCalls = (cbs.onReconnectionStateChange as ReturnType<typeof vi.fn>).mock.calls;
    const attempts = reconCalls.map((c) => c[0].attempt);
    expect(Math.max(...attempts)).toBeGreaterThanOrEqual(2);

    MockPeer.prototype.connect = origConnect;
    player.disconnect();
  });

  // 2. Status is "reconnecting" not "closed" during auto-reconnect
  it("never emits 'closed' status during auto-reconnect", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    await connectPlayer(player);

    // Access the peer to simulate disconnected event
    const peer = (player as unknown as { peer: MockPeer }).peer;
    peer.emit("disconnected");

    // Should get "reconnecting", never "closed"
    const statuses = (cbs.onStatusChange as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0],
    );
    expect(statuses).not.toContain("closed");
    expect(statuses).toContain("reconnecting");

    player.disconnect();
  });

  // 3. No concurrent reconnection attempts
  it("prevents duplicate reconnection from conn.close + peer.disconnected", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn = await connectPlayer(player);

    // Fire both events synchronously
    conn.open = false;
    conn.emit("close");
    const peer = (player as unknown as { peer: MockPeer }).peer;
    peer.emit("disconnected");

    // Only one reconnect should be scheduled
    const reconCalls = (cbs.onReconnectionStateChange as ReturnType<typeof vi.fn>).mock.calls;
    const attemptNumbers = reconCalls.map((c) => c[0].attempt);
    // Should have exactly one attempt = 1
    expect(attemptNumbers.filter((a: number) => a === 1).length).toBe(1);

    player.disconnect();
  });

  // 4. Heartbeat not restarted when connection is dead
  it("does not send heartbeat on page visible when connection is dead", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn = await connectPlayer(player);

    // Kill the connection
    conn.open = false;

    // Get the visibility listener that was registered
    const visibilityCalls = (document.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const visHandler = visibilityCalls.find(
      (c) => c[0] === "visibilitychange",
    )?.[1] as (() => void) | undefined;
    expect(visHandler).toBeDefined();

    // Simulate hidden then visible
    (document as { visibilityState: string }).visibilityState = "hidden";
    visHandler!();
    (document as { visibilityState: string }).visibilityState = "visible";
    visHandler!();

    // conn.send should not have been called with HEARTBEAT after visibility change
    // (it was called during connect for JOIN_REQUEST, but not for heartbeat)
    const heartbeatSends = conn.send.mock.calls.filter(
      (c) => c[0]?.type === "HEARTBEAT",
    );
    expect(heartbeatSends.length).toBe(0);

    player.disconnect();
  });

  // 5. Stale reconnectTimeout doesn't block second reconnection
  it("allows second reconnection chain after first disconnect-reconnect-disconnect", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn1 = await connectPlayer(player);

    // First disconnect triggers attemptReconnect which sets reconnectTimeout
    conn1.open = false;
    conn1.emit("close");
    expect(cbs.onStatusChange).toHaveBeenCalledWith("reconnecting");

    // Verify reconnectTimeout is set
    const getReconnectTimeout = () =>
      (player as unknown as { reconnectTimeout: ReturnType<typeof setTimeout> | null })
        .reconnectTimeout;
    expect(getReconnectTimeout()).not.toBeNull();

    // Advance past first delay — the timeout fires and sets reconnectTimeout = null
    // (even if connect fails, the timeout callback clears it before trying)
    const origConnect = MockPeer.prototype.connect;
    MockPeer.prototype.connect = function () {
      const badConn = new MockDataConnection("host-peer");
      badConn.open = false;
      queueMicrotask(() => {
        this.emit("error", { type: "network", message: "fail" });
      });
      return badConn as unknown as ReturnType<typeof origConnect>;
    };

    await vi.advanceTimersByTimeAsync(1500);

    // After the first attempt fires and fails, attemptReconnect schedules another
    // The reconnectTimeout should be set again (second attempt)
    expect(getReconnectTimeout()).not.toBeNull();

    // Verify attempts increased
    const reconCalls = (cbs.onReconnectionStateChange as ReturnType<typeof vi.fn>).mock.calls;
    const attempts = reconCalls.map((c) => c[0].attempt);
    expect(Math.max(...attempts)).toBeGreaterThanOrEqual(2);

    MockPeer.prototype.connect = origConnect;
    player.disconnect();
  });

  // 6. Manual reconnect chains on failure
  it("schedules auto-reconnect when manualReconnect fails", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    await connectPlayer(player);

    // Make next connect fail
    const origConnect = MockPeer.prototype.connect;
    MockPeer.prototype.connect = function () {
      const badConn = new MockDataConnection("host-peer");
      badConn.open = false;
      queueMicrotask(() => {
        this.emit("error", { type: "peer-unavailable", message: "not found" });
      });
      return badConn as unknown as ReturnType<typeof origConnect>;
    };

    player.manualReconnect();

    // Let the connect attempt complete and fail
    await vi.advanceTimersByTimeAsync(100);

    // Should have scheduled another attempt via attemptReconnect
    const reconCalls = (cbs.onReconnectionStateChange as ReturnType<typeof vi.fn>).mock.calls;
    const attempts = reconCalls.map((c) => c[0].attempt);
    expect(Math.max(...attempts)).toBeGreaterThanOrEqual(2);

    MockPeer.prototype.connect = origConnect;
    player.disconnect();
  });

  // 7. Errors suppressed during auto-reconnection
  it("does not call onError for peer errors during auto-reconnect", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn = await connectPlayer(player);

    // Reset error tracking
    (cbs.onError as ReturnType<typeof vi.fn>).mockClear();

    // Trigger auto-reconnect
    conn.open = false;
    conn.emit("close");

    // Make next connect attempt produce a peer error
    const origConnect = MockPeer.prototype.connect;
    MockPeer.prototype.connect = function () {
      const badConn = new MockDataConnection("host-peer");
      badConn.open = false;
      queueMicrotask(() => {
        this.emit("error", { type: "network", message: "offline" });
      });
      return badConn as unknown as ReturnType<typeof origConnect>;
    };

    // Advance past reconnect delay
    await vi.advanceTimersByTimeAsync(1500);

    // onError should NOT have been called (errors suppressed during auto-reconnect)
    expect(cbs.onError).not.toHaveBeenCalled();

    MockPeer.prototype.connect = origConnect;
    player.disconnect();
  });

  // 7b. Connection-level errors also suppressed during auto-reconnection
  it("does not call onError for connection errors during auto-reconnect", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn = await connectPlayer(player);

    (cbs.onError as ReturnType<typeof vi.fn>).mockClear();

    // Trigger auto-reconnect
    conn.open = false;
    conn.emit("close");

    // Make next connect attempt produce a connection-level error (not peer-level)
    const origConnect = MockPeer.prototype.connect;
    MockPeer.prototype.connect = function () {
      const badConn = new MockDataConnection("host-peer");
      badConn.open = false;
      // Fire error on the connection itself, not the peer
      queueMicrotask(() => {
        badConn.emit("error", new Error("Connection failed"));
      });
      return badConn as unknown as ReturnType<typeof origConnect>;
    };

    await vi.advanceTimersByTimeAsync(1500);

    expect(cbs.onError).not.toHaveBeenCalled();

    MockPeer.prototype.connect = origConnect;
    player.disconnect();
  });

  // 8. HOST_DISCONNECTING stops reconnection
  it("sets status closed and stops reconnection on HOST_DISCONNECTING", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn = await connectPlayer(player);

    // Simulate receiving HOST_DISCONNECTING
    conn.emit("data", { type: "HOST_DISCONNECTING" });

    expect(cbs.onStatusChange).toHaveBeenCalledWith("closed");

    // Now simulate connection closing — should NOT trigger reconnect
    (cbs.onStatusChange as ReturnType<typeof vi.fn>).mockClear();
    conn.open = false;
    conn.emit("close");

    // Wait a bit to see if reconnecting gets set
    await vi.advanceTimersByTimeAsync(100);

    const statuses = (cbs.onStatusChange as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0],
    );
    expect(statuses).not.toContain("reconnecting");

    player.disconnect();
  });

  // 9. Exponential backoff with jitter
  it("follows exponential backoff pattern with jitter bounds", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    await connectPlayer(player);

    // Exponential: 2^0=1, 2^1=2, 2^2=4, 2^3=8, 2^4=16, capped at 30s
    const expectedBaseDelays = [1000, 2000, 4000, 8000, 16000, 30000];

    // Make connect always fail so we keep getting new attempts
    const origConnect = MockPeer.prototype.connect;
    MockPeer.prototype.connect = function () {
      const badConn = new MockDataConnection("host-peer");
      badConn.open = false;
      queueMicrotask(() => {
        this.emit("error", { type: "network", message: "fail" });
      });
      return badConn as unknown as ReturnType<typeof origConnect>;
    };

    // Trigger first reconnect
    const conn = (player as unknown as { hostConnection: MockDataConnection }).hostConnection!;
    conn.open = false;
    conn.emit("close");

    // Advance enough time for all 6 attempts to fire and schedule
    // Each attempt: fires timeout → connect fails → schedules next
    for (let i = 0; i < expectedBaseDelays.length; i++) {
      await vi.advanceTimersByTimeAsync(40000);
    }

    // Collect all delays from onReconnectionStateChange calls that have nextAttemptDelay
    const reconCalls = (cbs.onReconnectionStateChange as ReturnType<typeof vi.fn>).mock.calls;
    const delays = reconCalls
      .map((c) => c[0].nextAttemptDelay)
      .filter((d): d is number => typeof d === "number");

    // Should have at least 6 delays
    expect(delays.length).toBeGreaterThanOrEqual(expectedBaseDelays.length);

    // Verify each delay is within +/-20% of expected base
    for (let i = 0; i < expectedBaseDelays.length; i++) {
      const base = expectedBaseDelays[i];
      const low = base * 0.8;
      const high = base * 1.2;
      expect(delays[i]).toBeGreaterThanOrEqual(low);
      expect(delays[i]).toBeLessThanOrEqual(high);
    }

    MockPeer.prototype.connect = origConnect;
    player.disconnect();
  });

  // 10. State sync retry after reconnection
  it("sends STATE_SYNC_REQUEST and retries after 3s on no response", async () => {
    const cbs = makeCallbacks();
    const player = new PlayerPeer(cbs);
    const conn = await connectPlayer(player);

    // Simulate receiving RECONNECT_ACCEPTED
    conn.emit("data", {
      type: "RECONNECT_ACCEPTED",
      playerId: "p1",
      state: { players: [] },
    });

    expect(cbs.onJoinAccepted).toHaveBeenCalledWith("p1", { players: [] });

    // After RECONNECT_ACCEPTED, PlayerPeer schedules requestStateSync after 1s
    conn.send.mockClear();
    await vi.advanceTimersByTimeAsync(1100);

    // Should have sent STATE_SYNC_REQUEST
    const syncSends = conn.send.mock.calls.filter(
      (c) => c[0]?.type === "STATE_SYNC_REQUEST",
    );
    expect(syncSends.length).toBeGreaterThanOrEqual(1);

    // Wait another 3s without responding — should retry
    conn.send.mockClear();
    await vi.advanceTimersByTimeAsync(3100);

    const retrySends = conn.send.mock.calls.filter(
      (c) => c[0]?.type === "STATE_SYNC_REQUEST",
    );
    expect(retrySends.length).toBeGreaterThanOrEqual(1);

    player.disconnect();
  });
});
