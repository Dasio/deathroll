import type { PeerOptions } from "peerjs";
import { logger } from "../logger";

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
    // Validate TURN URL format
    try {
      new URL(turnUrl);
      servers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });
      logger.info("TURN server configured:", turnUrl);
    } catch (e) {
      logger.error("Invalid TURN URL format:", turnUrl, e);
    }
  } else if (turnUrl || turnUsername || turnCredential) {
    logger.warn("TURN server partially configured. All three env vars required: NEXT_PUBLIC_TURN_URL, NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_CREDENTIAL");
  }

  // Also support multiple TURN servers via JSON config
  const turnServersJson = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (turnServersJson) {
    try {
      const additionalServers = JSON.parse(turnServersJson) as RTCIceServer[];

      // Validate each server configuration
      const validServers = additionalServers.filter((server) => {
        if (!server.urls) {
          logger.warn("TURN server missing 'urls' field, skipping");
          return false;
        }
        return true;
      });

      servers.push(...validServers);
      logger.info(`Loaded ${validServers.length} additional TURN servers from JSON config`);
    } catch (e) {
      logger.error("Failed to parse NEXT_PUBLIC_TURN_SERVERS:", e);
    }
  }

  logger.info(`Configured ${servers.length} ICE servers (${servers.filter(s => s.urls.toString().includes('turn')).length} TURN, ${servers.filter(s => s.urls.toString().includes('stun')).length} STUN)`);

  return servers;
}

/**
 * Validate the peer configuration at startup
 */
export function validatePeerConfig(): void {
  const iceServers = getIceServers();

  const hasTurn = iceServers.some(s => s.urls.toString().includes('turn'));

  if (!hasTurn) {
    logger.warn("No TURN server configured. Connections may fail behind strict NATs/firewalls. Consider setting NEXT_PUBLIC_TURN_URL, NEXT_PUBLIC_TURN_USERNAME, and NEXT_PUBLIC_TURN_CREDENTIAL.");
  }
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
