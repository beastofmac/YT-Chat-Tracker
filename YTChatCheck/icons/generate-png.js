const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a73e8';
  ctx.fill();

  // Chat bubble (white rounded rect)
  ctx.beginPath();
  const radius = size / 8;
  const padding = size * 0.12;
  const w = size - padding * 2;
  const h = size - padding * 2;
  ctx.roundRect(padding, padding, w, h, radius);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Checkmark
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.5);
  ctx.lineTo(size * 0.43, size * 0.62);
  ctx.lineTo(size * 0.7, size * 0.35);
  ctx.strokeStyle = '#1a73e8';
  ctx.lineWidth = size / 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon${size}.png`, buffer);
  console.log(`Created icon${size}.png (${buffer.length} bytes)`);
}