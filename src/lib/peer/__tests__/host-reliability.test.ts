import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockPeer, MockDataConnection } from "./helpers/mockPeer";

// Mock peerjs at module level
vi.mock("peerjs", () => ({
  default: MockPeer,
  Peer: MockPeer,
}));

// Capture listeners for simulation
const windowListeners: Record<string, (() => void)[]> = {};
const documentListeners: Record<string, (() => void)[]> = {};

vi.stubGlobal("window", {
  addEventListener: vi.fn((event: string, handler: () => void) => {
    if (!windowListeners[event]) windowListeners[event] = [];
    windowListeners[event].push(handler);
  }),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

vi.stubGlobal("document", {
  addEventListener: vi.fn((event: string, handler: () => void) => {
    if (!documentListeners[event]) documentListeners[event] = [];
    documentListeners[event].push(handler);
  }),
  removeEventListener: vi.fn(),
  visibilityState: "visible",
});

import { HostPeer, HostPeerCallbacks } from "../HostPeer";

function makeCallbacks(overrides?: Partial<HostPeerCallbacks>): HostPeerCallbacks {
  return {
    onStatusChange: vi.fn(),
    onPlayerJoinRequest: vi.fn(),
    onPlayerReconnect: vi.fn(),
    onPlayerDisconnect: vi.fn(),
    onPlayerMessage: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

/** Connect a HostPeer and add a mock player connection */
async function setupHost(cbs: HostPeerCallbacks): Promise<{ host: HostPeer; peer: MockPeer }> {
  const host = new HostPeer("ABCD", cbs);
  await host.connect();
  const peer = (host as unknown as { peer: MockPeer }).peer;
  return { host, peer };
}

function addPlayerConnection(
  host: HostPeer,
  peer: MockPeer,
  peerId: string = "player-1",
): MockDataConnection {
  const conn = new MockDataConnection(peerId);

  // Simulate incoming connection — this sets up event handlers via handleNewConnection
  peer.emit("connection", conn);

  // Simulate open — this registers in lastHeartbeatTimes
  conn.emit("open");

  // Also register in connections map (normally done when JOIN_REQUEST is accepted)
  const connections = (host as unknown as { connections: Map<string, MockDataConnection> })
    .connections;
  connections.set(peerId, conn);

  return conn;
}

describe("HostPeer reliability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear listener registrations
    for (const key of Object.keys(windowListeners)) delete windowListeners[key];
    for (const key of Object.keys(documentListeners)) delete documentListeners[key];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Heartbeat timeout closes stale connection
  it("disconnects player after heartbeat timeout", async () => {
    const cbs = makeCallbacks();
    const { host, peer } = await setupHost(cbs);

    const conn = addPlayerConnection(host, peer, "stale-player");

    // Advance past heartbeat timeout (30s) + check interval (5s)
    await vi.advanceTimersByTimeAsync(36000);

    expect(conn.close).toHaveBeenCalled();
    expect(cbs.onPlayerDisconnect).toHaveBeenCalledWith("stale-player");

    host.disconnect();
  });

  // 2. No double onPlayerDisconnect
  it("fires onPlayerDisconnect exactly once on heartbeat timeout", async () => {
    const cbs = makeCallbacks();
    const { host, peer } = await setupHost(cbs);

    addPlayerConnection(host, peer, "dup-player");

    // Advance past heartbeat timeout
    await vi.advanceTimersByTimeAsync(36000);

    // conn.close() fires the "close" event via queueMicrotask
    await vi.advanceTimersByTimeAsync(0);
    // Flush microtasks
    await Promise.resolve();
    await Promise.resolve();

    const disconnectCalls = (cbs.onPlayerDisconnect as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => c[0] === "dup-player",
    );
    expect(disconnectCalls.length).toBe(1);

    host.disconnect();
  });

  // 3. Host pauses heartbeat monitoring when hidden
  it("stops heartbeat check interval when page is hidden", async () => {
    const cbs = makeCallbacks();
    const { host, peer } = await setupHost(cbs);

    addPlayerConnection(host, peer, "bg-player");

    // Simulate page hidden
    (document as { visibilityState: string }).visibilityState = "hidden";
    documentListeners["visibilitychange"]?.forEach((h) => h());

    // Advance past heartbeat timeout — should NOT disconnect because monitoring is paused
    (cbs.onPlayerDisconnect as ReturnType<typeof vi.fn>).mockClear();
    await vi.advanceTimersByTimeAsync(60000);

    expect(cbs.onPlayerDisconnect).not.toHaveBeenCalled();

    host.disconnect();
  });

  // 4. Host resumes monitoring with reset timestamps
  it("resets heartbeat timestamps on page visible so no false timeouts", async () => {
    const cbs = makeCallbacks();
    const { host, peer } = await setupHost(cbs);

    addPlayerConnection(host, peer, "mobile-player");

    // Simulate hidden for 60s
    (document as { visibilityState: string }).visibilityState = "hidden";
    documentListeners["visibilitychange"]?.forEach((h) => h());

    await vi.advanceTimersByTimeAsync(60000);

    // Come back visible
    (document as { visibilityState: string }).visibilityState = "visible";
    documentListeners["visibilitychange"]?.forEach((h) => h());

    // Should not immediately timeout — timestamps were reset
    (cbs.onPlayerDisconnect as ReturnType<typeof vi.fn>).mockClear();
    await vi.advanceTimersByTimeAsync(5000); // One check interval

    expect(cbs.onPlayerDisconnect).not.toHaveBeenCalled();

    host.disconnect();
  });

  // 5. Host reconnects signaling on visibility change
  it("calls peer.reconnect() when becoming visible with disconnected signaling", async () => {
    const cbs = makeCallbacks();
    const { host, peer } = await setupHost(cbs);

    // Simulate signaling disconnect
    peer.disconnected = true;

    // Simulate page visible
    (document as { visibilityState: string }).visibilityState = "visible";
    documentListeners["visibilitychange"]?.forEach((h) => h());

    expect(peer.reconnect).toHaveBeenCalled();

    host.disconnect();
  });

  // 6. HOST_DISCONNECTING broadcast on disconnect()
  it("broadcasts HOST_DISCONNECTING when disconnect() is called", async () => {
    const cbs = makeCallbacks();
    const { host, peer } = await setupHost(cbs);

    const conn = addPlayerConnection(host, peer, "active-player");

    // Need to register the connection in the connections map
    // Simulate a JOIN_REQUEST that gets accepted
    const connections = (host as unknown as { connections: Map<string, MockDataConnection> })
      .connections;
    connections.set("active-player", conn);

    host.disconnect();

    // Should have sent HOST_DISCONNECTING before closing
    const disconnectingSends = conn.send.mock.calls.filter(
      (c) => c[0]?.type === "HOST_DISCONNECTING",
    );
    expect(disconnectingSends.length).toBe(1);
  });

  // 7. beforeunload broadcasts HOST_DISCONNECTING
  it("broadcasts HOST_DISCONNECTING on beforeunload event", async () => {
    const cbs = makeCallbacks();
    const { host, peer } = await setupHost(cbs);

    const conn = addPlayerConnection(host, peer, "unload-player");
    const connections = (host as unknown as { connections: Map<string, MockDataConnection> })
      .connections;
    connections.set("unload-player", conn);

    // Trigger beforeunload
    windowListeners["beforeunload"]?.forEach((h) => h());

    const disconnectingSends = conn.send.mock.calls.filter(
      (c) => c[0]?.type === "HOST_DISCONNECTING",
    );
    expect(disconnectingSends.length).toBe(1);

    host.disconnect();
  });
});
