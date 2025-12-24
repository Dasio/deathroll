'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    workbox?: any;
  }
}

export function PWARegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      // Register service worker
      const wb = window.workbox;

      // Event listener for when service worker is waiting
      wb.addEventListener('waiting', () => {
        console.log(
          '[PWA] A new service worker is waiting. Reload to activate.'
        );
      });

      // Event listener for when service worker is controlling the page
      wb.addEventListener('controlling', () => {
        console.log('[PWA] Service worker is now controlling the page');
        window.location.reload();
      });

      // Event listener for when service worker has installed successfully
      wb.addEventListener('installed', (event: any) => {
        if (!event.isUpdate) {
          console.log('[PWA] Service worker installed for the first time');
        } else {
          console.log('[PWA] Service worker has been updated');
        }
      });

      // Register the service worker
      wb.register();
    } else if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // Manual registration fallback
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);

          // Check for updates periodically (every hour)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  console.log('[PWA] New service worker available');
                  // Optionally notify user or auto-update
                  if (
                    confirm(
                      'A new version of DeathRoll is available. Reload to update?'
                    )
                  ) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Handle service worker controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service worker controller changed');
      });
    }
  }, []);

  return null;
}
