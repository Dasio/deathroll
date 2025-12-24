#!/bin/bash

# Setup script for DeathRoll PWA
# This script sets up all necessary PWA files and assets

set -e

cd "$(dirname "$0")/.."

echo "🎲 Setting up DeathRoll PWA..."
echo ""

# Step 1: Create placeholder icons
echo "📦 Creating placeholder icons..."
node scripts/create-placeholder-pngs.js

# Step 2: Verify manifest exists
if [ -f "public/manifest.json" ]; then
    echo "✓ manifest.json exists"
else
    echo "❌ manifest.json not found!"
    exit 1
fi

# Step 3: Verify service worker exists
if [ -f "public/sw.js" ]; then
    echo "✓ sw.js exists"
else
    echo "❌ sw.js not found!"
    exit 1
fi

# Step 4: Verify offline page exists
if [ -f "public/offline.html" ]; then
    echo "✓ offline.html exists"
else
    echo "❌ offline.html not found!"
    exit 1
fi

echo ""
echo "✅ PWA setup complete!"
echo ""
echo "Next steps:"
echo "1. Generate proper icons (see GENERATE_ICONS.md)"
echo "2. Build the app: npm run build"
echo "3. Test PWA features in Chrome DevTools"
echo ""
