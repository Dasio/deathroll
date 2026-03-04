import { vi } from "vitest";

type EventHandler = (...args: unknown[]) => void;

export class MockDataConnection {
  open = true;
  peer: string;
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor(peer: string = "remote-peer") {
    this.peer = peer;
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }

  send = vi.fn();

  close = vi.fn(() => {
    this.open = false;
    // Fire close handler async so callers can inspect state first
    queueMicrotask(() => this.emit("close"));
  });
}

export class MockPeer {
  id: string;
  disconnected = false;
  destroyed = false;
  private handlers: Map<string, EventHandler[]> = new Map();

  /** The connection returned by the next `connect()` call — set by tests */
  nextConnection: MockDataConnection | null = null;

  constructor(idOrConfig?: string | object, _config?: object) {
    this.id = typeof idOrConfig === "string" ? idOrConfig : "mock-peer-id";
    // Auto-fire "open" on next tick so `new Peer()` behaves like the real lib
    queueMicrotask(() => this.emit("open", this.id));
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler: EventHandler) {
    const list = this.handlers.get(event);
    if (list) {
      this.handlers.set(
        event,
        list.filter((h) => h !== handler),
      );
    }
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }

  connect(_peerId: string, _opts?: object): MockDataConnection {
    const conn = this.nextConnection ?? new MockDataConnection(_peerId);
    // Auto-fire "open" on next tick
    queueMicrotask(() => conn.emit("open"));
    return conn;
  }

  reconnect = vi.fn(() => {
    this.disconnected = false;
  });

  destroy = vi.fn(() => {
    this.destroyed = true;
    this.disconnected = true;
  });
}

/** Install the PeerJS module mock — call at top of test file */
export function installPeerMock() {
  vi.mock("peerjs", () => ({
    default: MockPeer,
    Peer: MockPeer,
  }));
}
