/**
 * Generate PNG icons from SVG
 * Run with: node icons/generate-icons.js
 * Requires: npm install canvas
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { DOMParser } = require('xmldom');

// SVG source
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="60" fill="#1a73e8"/>
  <path d="M32 48 C32 38.7 39.7 31 50 31 L78 31 C88.3 31 96 38.7 96 48 L96 84 C96 93.3 88.3 101 78 101 L58 101 L44 115 L32 101 L32 48 Z" fill="white"/>
  <path d="M42 62 L54 74 L78 50" fill="none" stroke="#1a73e8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname);

async function generateIcons() {
  console.log('Generating icons...');

  // Parse SVG to get dimensions
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = doc.documentElement;

  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Enable high quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Create a data URL from SVG
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const img = await loadImage(svgUrl);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(svgUrl);

      const buffer = canvas.toBuffer('image/png');
      const outputPath = path.join(outputDir, `icon${size}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Generated: icon${size}.png (${buffer.length} bytes)`);
    } catch (error) {
      console.error(`Failed to generate icon${size}.png:`, error);
      URL.revokeObjectURL(svgUrl);
    }
  }

  console.log('Done!');
}

generateIcons().catch(console.error);