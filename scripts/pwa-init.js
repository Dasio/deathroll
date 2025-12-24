#!/usr/bin/env node

/**
 * PWA Initialization Script
 * Creates placeholder PNG icons and verifies PWA setup
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Simple red placeholder PNG (1x1 pixel, will be scaled by browser)
const placeholderPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

console.log('🎲 Initializing DeathRoll PWA...\n');

// Create icons
try {
  const icon192Path = path.join(publicDir, 'icon-192.png');
  const icon512Path = path.join(publicDir, 'icon-512.png');

  if (!fs.existsSync(icon192Path)) {
    fs.writeFileSync(icon192Path, placeholderPNG);
    console.log('✓ Created icon-192.png (placeholder)');
  } else {
    console.log('✓ icon-192.png already exists');
  }

  if (!fs.existsSync(icon512Path)) {
    fs.writeFileSync(icon512Path, placeholderPNG);
    console.log('✓ Created icon-512.png (placeholder)');
  } else {
    console.log('✓ icon-512.png already exists');
  }
} catch (error) {
  console.error('❌ Error creating icons:', error.message);
  process.exit(1);
}

// Verify other files
console.log('\n📋 Verifying PWA files...');

const requiredFiles = [
  'manifest.json',
  'sw.js',
  'offline.html'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('\n✅ PWA initialization complete!');
  console.log('\nYour app is ready to be a PWA. Next steps:');
  console.log('1. Build: npm run build');
  console.log('2. Start: npm start');
  console.log('3. Test: Open http://localhost:3000 in Chrome');
  console.log('\n💡 To create better icons, see PWA_SETUP.md');
} else {
  console.log('\n❌ Some PWA files are missing.');
  console.log('Please ensure all required files are present.');
  process.exit(1);
}

console.log('\n' + '='.repeat(50) + '\n');
