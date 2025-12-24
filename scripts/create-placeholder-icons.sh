#!/bin/bash

# Script to create placeholder PWA icons for DeathRoll
# This creates simple solid color PNG files as placeholders

PUBLIC_DIR="$(cd "$(dirname "$0")/../public" && pwd)"

echo "Creating placeholder PWA icons..."

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to create icons..."

    # Create 192x192 icon with dice emoji if possible, otherwise solid color
    convert -size 192x192 xc:'#0a0a0a' \
        -fill '#dc2626' -draw 'roundrectangle 36,36 156,156 16,16' \
        -fill '#ffffff' -draw 'circle 96,96 96,78' \
        "$PUBLIC_DIR/icon-192.png"
    echo "✓ Created icon-192.png"

    # Create 512x512 icon
    convert -size 512x512 xc:'#0a0a0a' \
        -fill '#dc2626' -draw 'roundrectangle 96,96 416,416 40,40' \
        -fill '#ffffff' -draw 'circle 256,256 256,208' \
        "$PUBLIC_DIR/icon-512.png"
    echo "✓ Created icon-512.png"

    echo "Icons created successfully!"

elif command -v rsvg-convert &> /dev/null; then
    echo "Using rsvg-convert to create icons..."

    rsvg-convert -w 192 -h 192 "$PUBLIC_DIR/icon-192.svg" -o "$PUBLIC_DIR/icon-192.png"
    echo "✓ Created icon-192.png"

    rsvg-convert -w 512 -h 512 "$PUBLIC_DIR/icon-512.svg" -o "$PUBLIC_DIR/icon-512.png"
    echo "✓ Created icon-512.png"

    echo "Icons created successfully!"

else
    echo "❌ Neither ImageMagick nor rsvg-convert found."
    echo ""
    echo "Please install one of these tools:"
    echo "  - macOS: brew install imagemagick"
    echo "  - macOS: brew install librsvg"
    echo ""
    echo "Or use one of these alternative methods:"
    echo "  1. Open scripts/generate-icons.html in your browser"
    echo "  2. Use an online PNG generator"
    echo "  3. Run: node scripts/generate-icons.js"
    echo ""
    exit 1
fi
