"use client";

import { useEffect, useState, useCallback } from "react";
import { logger } from "@/lib/logger";

/**
 * Hook to manage the Screen Wake Lock API to keep the screen on during gameplay
 *
 * The Wake Lock API prevents the screen from dimming or locking while the app is active.
 * This is especially useful for games where users are waiting for their turn.
 *
 * Browser support:
 * - Chrome/Edge 84+
 * - Safari 16.4+
 * - Firefox (behind flag)
 *
 * Falls back gracefully if not supported.
 */
export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // Check if Wake Lock API is supported
  useEffect(() => {
    if (typeof window !== "undefined" && "wakeLock" in navigator) {
      setIsSupported(true);
    }
  }, []);

  // Request wake lock
  const requestWakeLock = useCallback(async () => {
    if (!isSupported) {
      logger.debug("[WakeLock] Wake Lock API not supported");
      return false;
    }

    try {
      const lock = await navigator.wakeLock.request("screen");
      setWakeLock(lock);
      setIsActive(true);
      logger.debug("[WakeLock] Wake Lock acquired");

      // Listen for wake lock release
      lock.addEventListener("release", () => {
        logger.debug("[WakeLock] Wake Lock released");
        setIsActive(false);
        setWakeLock(null);
      });

      return true;
    } catch (err) {
      logger.error("[WakeLock] Failed to acquire wake lock:", err);
      setIsActive(false);
      return false;
    }
  }, [isSupported]);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        setIsActive(false);
        logger.debug("[WakeLock] Wake Lock manually released");
      } catch (err) {
        logger.error("[WakeLock] Failed to release wake lock:", err);
      }
    }
  }, [wakeLock]);

  // Re-acquire wake lock when page becomes visible (handles screen lock/unlock)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive && !wakeLock) {
        logger.debug("[WakeLock] Page visible, re-acquiring wake lock");
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, isActive, wakeLock, requestWakeLock]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release().catch((err) => {
          logger.error("[WakeLock] Failed to release wake lock on unmount:", err);
        });
      }
    };
  }, [wakeLock]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
}
