# DeathRoll PWA - Quick Start

## 🚀 Get Started in 3 Steps

### 1. Generate Icons

Pick any method:

**A) Browser (Recommended)**
```bash
# Open this file in your browser
open scripts/generate-icons.html

# Click download buttons, save as:
# - public/icon-192.png
# - public/icon-512.png
```

**B) Quick Placeholders**
```bash
npm run pwa:init
```

**C) High Quality (requires ImageMagick or librsvg)**
```bash
chmod +x scripts/create-placeholder-icons.sh
./scripts/create-placeholder-icons.sh
```

### 2. Build & Run

```bash
npm run build
npm start
```

### 3. Test PWA

Open http://localhost:3000 in Chrome:
- Install prompt appears after 3 seconds
- Check DevTools → Application → Manifest
- Test offline: Network tab → Offline → Reload

## ✅ What's Included

- ✅ **Manifest** (`public/manifest.json`) - App metadata
- ✅ **Service Worker** (`public/sw.js`) - Caching & offline
- ✅ **Offline Page** (`public/offline.html`) - Fallback UI
- ✅ **Install Prompt** - Custom "Add to Home Screen" banner
- ✅ **Icons** - SVG sources + PNG generation scripts

## 📱 Features

- **Offline Support** - Works without internet
- **Install** - Add to home screen on mobile/desktop
- **Fast Loading** - Cached assets load instantly
- **Updates** - Automatic update notifications

## 🧪 Testing

```bash
# DevTools → Lighthouse → PWA Audit
# Target Score: 100/100
```

## 📚 More Info

- **Setup Guide**: `PWA_SETUP.md`
- **Full Summary**: `PWA_IMPLEMENTATION_SUMMARY.md`
- **Icon Help**: `GENERATE_ICONS.md`

## ⚠️ Important

- PWA requires **HTTPS** in production (localhost is OK for testing)
- Icons must be PNG format (not just SVG)
- Service worker only works on HTTPS or localhost

## 🎯 Next Steps

1. Replace placeholder icons with custom designs
2. Deploy to HTTPS hosting
3. Test on mobile devices
4. Run Lighthouse audit

---

**Questions?** See `PWA_SETUP.md` for detailed docs
