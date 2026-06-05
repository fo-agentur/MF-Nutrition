import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
await mkdir(publicDir, { recursive: true });

// Full-bleed white square with bold "MF" monogram (placeholder mark — not the
// official MacroFactor logo). iOS rounds the corners automatically.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ffffff"/>
  <text x="256" y="290" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="900" font-size="250" letter-spacing="-10" fill="#0b0b0b">MF</text>
</svg>`;

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['maskable-512.png', 512],
];

for (const [name, size] of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(publicDir, name));
  console.log('wrote', name, size);
}
