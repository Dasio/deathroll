#!/usr/bin/env node

/**
 * Simple PNG Icon Generator for DeathRoll PWA
 *
 * This script creates basic PNG icons using canvas if available,
 * or falls back to creating placeholder files that reference the SVG icons.
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Check if we have the canvas package
let Canvas;
try {
  Canvas = require('canvas');
} catch (e) {
  console.log('Canvas package not available. Will create placeholder instructions.');
  Canvas = null;
}

function drawDiceIcon(canvas, size) {
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0a';
  roundRect(ctx, 0, 0, size, size, size * 0.2);
  ctx.fill();

  // Dice body
  const padding = size * 0.1875;
  const diceSize = size * 0.625;
  const radius = size * 0.083;

  ctx.fillStyle = '#dc2626';
  roundRect(ctx, padding, padding, diceSize, diceSize, radius);
  ctx.fill();

  // Dice border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = size * 0.015625;
  ctx.stroke();

  // Dot (showing 1)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.09375, 0, Math.PI * 2);
  ctx.fill();

  // Shine effect
  const gradient = ctx.createLinearGradient(
    padding,
    padding,
    padding + diceSize * 0.33,
    padding + diceSize * 0.33
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  roundRect(
    ctx,
    padding + size * 0.026,
    padding + size * 0.026,
    diceSize * 0.33,
    diceSize * 0.33,
    radius * 0.5
  );
  ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function generateIcons() {
  if (Canvas) {
    console.log('Generating PNG icons using canvas...');

    // Generate 192x192 icon
    const canvas192 = Canvas.createCanvas(192, 192);
    drawDiceIcon(canvas192, 192);
    const buffer192 = canvas192.toBuffer('image/png');
    fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buffer192);
    console.log('✓ Created icon-192.png');

    // Generate 512x512 icon
    const canvas512 = Canvas.createCanvas(512, 512);
    drawDiceIcon(canvas512, 512);
    const buffer512 = canvas512.toBuffer('image/png');
    fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buffer512);
    console.log('✓ Created icon-512.png');

    console.log('\nIcons generated successfully!');
  } else {
    console.log('\n⚠️  Canvas package not installed.');
    console.log('\nTo generate icons, you have several options:\n');
    console.log('1. Install canvas package:');
    console.log('   npm install canvas --save-dev\n');
    console.log('2. Open scripts/generate-icons.html in your browser');
    console.log('   and download the icons manually\n');
    console.log('3. Use ImageMagick or rsvg-convert:');
    console.log('   rsvg-convert -w 192 -h 192 public/icon-192.svg -o public/icon-192.png');
    console.log('   rsvg-convert -w 512 -h 512 public/icon-512.svg -o public/icon-512.png\n');
    console.log('See public/ICONS_README.md for more details.\n');
  }
}

generateIcons().catch(console.error);
