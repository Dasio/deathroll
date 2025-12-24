# PWA Icons Generation

The DeathRoll PWA requires icon files in PNG format. You have several options to generate them:

## Option 1: Use the HTML Generator (Easiest)

1. Open `scripts/generate-icons.html` in your web browser
2. Click the download buttons for each icon size
3. Save the files as `icon-192.png` and `icon-512.png` in this directory

## Option 2: Convert SVG to PNG using Command Line

If you have ImageMagick or rsvg-convert installed:

```bash
# Using rsvg-convert
rsvg-convert -w 192 -h 192 icon-192.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon-512.svg -o icon-512.png

# Or using ImageMagick
convert -background none -resize 192x192 icon-192.svg icon-192.png
convert -background none -resize 512x512 icon-512.svg icon-512.png
```

## Option 3: Use Online Tools

1. Go to https://realfavicongenerator.net/ or similar service
2. Upload a logo or use the SVG files provided
3. Download the generated icons
4. Place `icon-192.png` and `icon-512.png` in this directory

## Option 4: Create Custom Icons

Replace the generated SVG files with your own design and use any of the above methods to convert them to PNG.

## Required Sizes

- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels

Both icons should have a transparent or solid background and be recognizable as dice or game-related imagery.
