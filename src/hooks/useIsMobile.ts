"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the device is mobile
 * Uses media query to check for touch-enabled devices
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device has touch support and small screen
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasSmallScreen = window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(hasTouchScreen && hasSmallScreen);
    };

    checkMobile();

    // Listen for screen resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
