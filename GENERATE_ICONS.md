# Generate PWA Icons

The PWA requires PNG icon files. Choose one of these methods to generate them:

## Method 1: Browser-Based Generator (Recommended)

1. Open `scripts/generate-icons.html` in your web browser
2. Click the download buttons for each icon
3. Save them as `public/icon-192.png` and `public/icon-512.png`

## Method 2: Command Line (macOS/Linux)

If you have ImageMagick or librsvg installed:

```bash
# Make the script executable
chmod +x scripts/create-placeholder-icons.sh

# Run the script
./scripts/create-placeholder-icons.sh
```

Or manually:

```bash
# Using rsvg-convert (recommended)
rsvg-convert -w 192 -h 192 public/icon-192.svg -o public/icon-192.png
rsvg-convert -w 512 -h 512 public/icon-512.svg -o public/icon-512.png

# Or using ImageMagick
convert -background none -resize 192x192 public/icon-192.svg public/icon-192.png
convert -background none -resize 512x512 public/icon-512.svg public/icon-512.png
```

## Method 3: Node.js Script

```bash
node scripts/generate-icons.js
```

Note: Requires `canvas` package. Install with:
```bash
npm install canvas --save-dev
```

## After Generating Icons

Once you have the PNG files in place, build and test the PWA:

```bash
npm run build
npm start
```

Visit the app in a browser and check:
- The install prompt appears
- The manifest is loaded (check DevTools > Application > Manifest)
- The service worker is registered (check DevTools > Application > Service Workers)
