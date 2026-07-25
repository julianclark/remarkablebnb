#!/usr/bin/env node

/**
 * Remarkable BnB — print-ready guest manual QR code
 *
 * One stay = one token = one QR code, linking to /stay/{token}/manual.
 * Run this again with the new token any time a token is rotated; it's the
 * one step needed to get a fresh print-ready sheet.
 *
 * Usage: node scripts/generate-qr.js <token> "<Stay title>" [siteUrl]
 * Writes: qr/<token>.svg (the code alone) and qr/<token>.html (an A5
 * print-ready sheet, open in a browser and print to PDF).
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import QRCode from 'qrcode/lib/browser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../qr');

const [token, stayTitle, siteUrl = 'https://remarkablebnb.nz'] = process.argv.slice(2);

if (!token || !stayTitle) {
  console.error('Usage: node scripts/generate-qr.js <token> "<Stay title>" [siteUrl]');
  process.exit(1);
}

const manualUrl = `${siteUrl.replace(/\/$/, '')}/stay/${token}/manual`;

const svg = await QRCode.toString(manualUrl, {
  type: 'svg',
  margin: 1,
  width: 600,
  color: { dark: '#1a1714', light: '#ffffff' },
});

mkdirSync(OUT_DIR, { recursive: true });

const svgPath = path.join(OUT_DIR, `${token}.svg`);
writeFileSync(svgPath, svg);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${stayTitle}, guest manual QR</title>
<style>
  @page { size: A5; margin: 0; }
  body { margin: 0; font-family: Georgia, serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
  .sheet { text-align: center; padding: 2rem; }
  h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
  p { font-size: 1rem; color: #444; margin: 0 0 1.5rem; }
  .qr { width: 60vmin; height: 60vmin; }
  .url { margin-top: 1rem; font-size: 0.8rem; color: #666; word-break: break-all; }
</style>
</head>
<body>
  <div class="sheet">
    <h1>${stayTitle}</h1>
    <p>Scan for wifi, house basics and local tips</p>
    <div class="qr">${svg}</div>
    <div class="url">${manualUrl}</div>
  </div>
</body>
</html>
`;
const htmlPath = path.join(OUT_DIR, `${token}.html`);
writeFileSync(htmlPath, html);

console.log(`[generate-qr] Wrote ${path.relative(process.cwd(), svgPath)} and ${path.relative(process.cwd(), htmlPath)}`);
console.log(`[generate-qr] Open the .html file in a browser and print to PDF (A5) for a print-ready sheet.`);
