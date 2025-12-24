# DeathRoll PWA Setup Guide

This guide explains how to set up and test the Progressive Web App features for DeathRoll.

## Quick Start

1. **Generate Icons** (choose one method):
   ```bash
   # Option A: Open in browser
   open scripts/generate-icons.html
   # Then download the icons and save them in public/

   # Option B: Command line (requires ImageMagick or librsvg)
   chmod +x scripts/create-placeholder-icons.sh
   ./scripts/create-placeholder-icons.sh

   # Option C: Node.js with Canvas
   npm install canvas --save-dev
   node scripts/generate-icons.js

   # Option D: Quick placeholders (for testing only)
   npm run generate-icons
   ```

2. **Build and Test**:
   ```bash
   npm run build
   npm start
   ```

3. **Test PWA Features**:
   - Open http://localhost:3000 in Chrome
   - Open DevTools (F12)
   - Go to Application tab
   - Check Manifest, Service Workers, and Cache Storage

## What's Included

### 1. Manifest (`public/manifest.json`)
- App metadata (name, description, colors)
- Icon references
- Display mode (standalone)
- Theme colors

### 2. Service Worker (`public/sw.js`)
- Cache-first strategy for static assets
- Network-first strategy for API calls
- Offline fallback page
- Automatic cache updates

### 3. PWA Registration (`src/components/pwa/PWARegistration.tsx`)
- Registers the service worker
- Handles updates
- Manages cache lifecycle

### 4. Install Prompt (`src/components/pwa/InstallPrompt.tsx`)
- Beautiful "Add to Home Screen" banner
- Auto-dismisses after installation
- Session-based dismissal tracking

### 5. Offline Page (`public/offline.html`)
- Shown when the app is offline
- Maintains brand styling
- Provides helpful information

## Testing Checklist

### Local Testing

1. **Build the app**:
   ```bash
   npm run build
   npm start
   ```

2. **Test in Chrome**:
   - Open DevTools → Application tab
   - Manifest: Should show all metadata and icons
   - Service Workers: Should show "activated and running"
   - Cache Storage: Should show cached assets

3. **Test Installation**:
   - Look for install button in address bar (desktop)
   - On mobile: "Add to Home Screen" option
   - Install prompt should appear after 3 seconds

4. **Test Offline**:
   - DevTools → Network tab → Set to "Offline"
   - Reload page
   - Should show offline page with dice icon

### Production Testing

1. **Deploy the app** to a hosting service with HTTPS
2. **Visit on mobile device**
3. **Check for install prompt**
4. **Install the app**
5. **Test offline functionality**

## PWA Requirements

For a fully functional PWA, ensure:

- ✅ HTTPS (required for service workers)
- ✅ Valid manifest.json
- ✅ Service worker registered
- ✅ Icons (at least 192x192 and 512x512)
- ✅ Offline fallback

## Lighthouse Audit

Run a Lighthouse audit to verify PWA compliance:

1. Open DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"

Target Score: 100/100

## Troubleshooting

### Service Worker Not Registering

- Check browser console for errors
- Ensure you're on HTTPS or localhost
- Clear cache and hard reload (Ctrl+Shift+R)

### Icons Not Showing

- Verify files exist: `public/icon-192.png` and `public/icon-512.png`
- Check manifest.json paths
- Clear app data in DevTools → Application → Clear Storage

### Install Prompt Not Appearing

- Must meet PWA criteria (manifest, service worker, icons)
- Some browsers only show prompt after user engagement
- May not appear if previously dismissed

### Offline Page Not Working

- Verify offline.html exists in public/
- Check service worker cache in DevTools
- Try unregistering and re-registering service worker

## Browser Support

- Chrome/Edge: Full support
- Safari: Partial support (no install prompt)
- Firefox: Partial support
- Mobile browsers: Good support on iOS 16.4+ and Android

## File Structure

```
deathroll/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── offline.html           # Offline fallback
│   ├── icon-192.png          # App icon (192x192)
│   ├── icon-512.png          # App icon (512x512)
│   └── icon-*.svg            # Source SVG files
├── src/
│   ├── app/
│   │   └── layout.tsx        # Updated with PWA metadata
│   └── components/
│       └── pwa/
│           ├── PWARegistration.tsx  # Service worker registration
│           └── InstallPrompt.tsx    # Install banner
└── scripts/
    ├── generate-icons.html        # Browser-based icon generator
    ├── create-placeholder-icons.sh # CLI icon generator
    ├── create-placeholder-pngs.js # Node.js placeholder generator
    └── setup-pwa.sh              # Full setup script
```

## Next Steps

1. Replace placeholder icons with high-quality designs
2. Customize colors in manifest.json
3. Add more shortcuts in manifest
4. Implement push notifications (optional)
5. Add background sync (optional)

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)

---

For questions or issues, see the main README.md
