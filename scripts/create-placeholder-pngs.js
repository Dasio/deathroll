#!/usr/bin/env node

/**
 * Create placeholder PNG files for PWA icons
 * This creates minimal valid PNG files that can be replaced later
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Minimal 1x1 red PNG (base64)
// We'll use this as a placeholder that can be replaced
const smallRedPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

// For a more appropriate placeholder, let's create a simple red square PNG
// This is a 192x192 red square
const red192PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA' +
  'AXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABgSURBVHgB7cGBAAAAAMOg+VPf4ARVAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgM3JwAB/c7hqgAAAABJRU5ErkJggg==',
  'base64'
);

console.log('Creating placeholder PNG icons...\n');

try {
  // Create 192x192 placeholder
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), smallRedPNG);
  console.log('✓ Created placeholder icon-192.png');

  // Create 512x512 placeholder (same small image, will be scaled by browser)
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), smallRedPNG);
  console.log('✓ Created placeholder icon-512.png');

  console.log('\n⚠️  IMPORTANT: These are minimal placeholder icons!');
  console.log('\nTo create proper icons, use one of these methods:');
  console.log('1. Open scripts/generate-icons.html in your browser');
  console.log('2. Run: ./scripts/create-placeholder-icons.sh (requires ImageMagick or librsvg)');
  console.log('3. Use an online icon generator\n');
  console.log('See GENERATE_ICONS.md for detailed instructions.\n');

} catch (error) {
  console.error('Error creating placeholder icons:', error);
  process.exit(1);
}
