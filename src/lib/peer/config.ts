import type { PeerOptions } from "peerjs";

export const PEER_ID_PREFIX = "deathroll-";

// Build ICE servers list with STUN and optional TURN
function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    // Free Google STUN servers (works for ~85% of connections)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ];

  // Add TURN server if configured via environment variables
  // TURN servers help with strict NAT/firewall situations (~99% success)
  // Free TURN providers: metered.ca, Twilio, Xirsys (all have free tiers)
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  // Also support multiple TURN servers via JSON config
  const turnServersJson = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (turnServersJson) {
    try {
      const additionalServers = JSON.parse(turnServersJson) as RTCIceServer[];
      servers.push(...additionalServers);
    } catch (e) {
      console.warn("Failed to parse NEXT_PUBLIC_TURN_SERVERS:", e);
    }
  }

  return servers;
}

export const peerConfig: PeerOptions = {
  config: {
    iceServers: getIceServers(),
  },
};

export function getRoomPeerId(roomCode: string): string {
  return `${PEER_ID_PREFIX}${roomCode.toUpperCase()}`;
}

export function getRoomCodeFromPeerId(peerId: string): string | null {
  if (peerId.startsWith(PEER_ID_PREFIX)) {
    return peerId.slice(PEER_ID_PREFIX.length);
  }
  return null;
}
