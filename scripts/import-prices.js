#!/usr/bin/env node

/**
 * Remarkable BnB — Airbnb price importer
 *
 * Reads one or more screenshots of your Airbnb host calendar, extracts the
 * per-night prices with Claude vision, and writes them to the D1 `prices`
 * table. Run occasionally (e.g. after Airbnb pricing changes).
 *
 * Requirements:
 *   - ANTHROPIC_API_KEY in the environment
 *   - Node 22+ (uses built-in fetch)
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/import-prices.js \
 *     --room guest-room --image ~/Desktop/aug.png --image ~/Desktop/sep.png [--production] [--dry-run]
 *
 * Options:
 *   --room        two-bedroom-unit | guest-room   (required)
 *   --image       path to a calendar screenshot   (repeatable, required)
 *   --production  write to the remote D1 database (default: local)
 *   --dry-run     print extracted prices without writing to D1
 *   --model       override the vision model (default: claude-sonnet-5)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

// --- Parse args ---
const args = process.argv.slice(2);
const params = { image: [] };
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = args[i + 1];
  if (key === 'image') {
    if (next && !next.startsWith('--')) { params.image.push(next); i++; }
  } else if (next && !next.startsWith('--')) {
    params[key] = next; i++;
  } else {
    params[key] = true;
  }
}

const { room, production, 'dry-run': dryRun } = params;
const images = params.image;
const model = params.model || 'claude-sonnet-5';

const validRooms = ['two-bedroom-unit', 'guest-room'];
if (!room || !validRooms.includes(room)) {
  console.error(`\x1b[31mError: --room must be one of: ${validRooms.join(', ')}\x1b[0m`);
  process.exit(1);
}
if (images.length === 0) {
  console.error('\x1b[31mError: provide at least one --image <path>\x1b[0m');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\x1b[31mError: ANTHROPIC_API_KEY is not set.\x1b[0m');
  process.exit(1);
}

const MEDIA_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const TOOL = {
  name: 'record_prices',
  description: 'Record the nightly prices read from the Airbnb host calendar screenshot.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      prices: {
        type: 'array',
        description: 'One entry per date cell that shows a price.',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'The night, as an ISO date YYYY-MM-DD. Read the month and year from the calendar header.' },
            price_nzd: { type: 'integer', description: 'The nightly price shown in that cell, as a whole number of NZ dollars (no currency symbol, no decimals).' },
          },
          required: ['date', 'price_nzd'],
          additionalProperties: false,
        },
      },
    },
    required: ['prices'],
    additionalProperties: false,
  },
};

const PROMPT =
  'This is a screenshot of an Airbnb host calendar for a single listing. ' +
  'Read the month and year from the header, then extract the nightly price shown in every date cell that has one. ' +
  'Output an ISO date (YYYY-MM-DD) and the whole-dollar NZD price for each. ' +
  'Skip days with no visible price (blocked/unavailable days). Call the record_prices tool with the results.';

async function extractFromImage(imgPath) {
  const ext = path.extname(imgPath).toLowerCase();
  const mediaType = MEDIA_TYPES[ext];
  if (!mediaType) throw new Error(`Unsupported image type "${ext}" (use png, jpg, or webp)`);

  const data = readFileSync(imgPath).toString('base64');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'record_prices' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const json = await res.json();
  const toolUse = (json.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('Model did not return a tool_use block');
  return toolUse.input.prices || [];
}

function isValid(p) {
  return /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isInteger(p.price_nzd) && p.price_nzd > 0;
}

async function main() {
  console.log(`\n\x1b[36mExtracting prices for ${room} from ${images.length} image(s) using ${model}...\x1b[0m`);

  const byDate = new Map();
  for (const img of images) {
    process.stdout.write(`  ${path.basename(img)} ... `);
    const prices = await extractFromImage(img);
    let kept = 0;
    for (const p of prices) {
      if (isValid(p)) { byDate.set(p.date, p.price_nzd); kept++; }
    }
    console.log(`\x1b[32m${kept} prices\x1b[0m`);
  }

  const rows = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0) {
    console.error('\x1b[31mNo valid prices extracted. Check the screenshots and try again.\x1b[0m');
    process.exit(1);
  }

  console.log(`\n\x1b[36m${rows.length} unique nights extracted:\x1b[0m`);
  for (const [date, price] of rows) console.log(`  ${date}  $${price}`);

  if (dryRun) {
    console.log('\n\x1b[33m--dry-run: nothing written to D1.\x1b[0m');
    return;
  }

  const targetFlag = production ? '--remote' : '--local';
  console.log(`\n\x1b[33mWriting to D1 (${production ? 'production' : 'local'})...\x1b[0m`);

  // Chunk INSERTs so no single --command gets too long.
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const values = rows
      .slice(i, i + CHUNK)
      .map(([date, price]) => `('${room}', '${date}', ${price})`)
      .join(',');
    const sql = `INSERT OR REPLACE INTO prices (room, date, price_nzd) VALUES ${values};`;
    execSync(`npx wrangler d1 execute remarkablebnb ${targetFlag} --command="${sql}"`, { stdio: 'inherit' });
  }

  console.log(`\n\x1b[32m✔ Wrote ${rows.length} nightly prices for ${room}.\x1b[0m`);
  console.log('\x1b[36mSpot-check the calendar on the stay page — vision extraction can occasionally misread a digit.\x1b[0m\n');
}

main().catch((err) => {
  console.error(`\n\x1b[31m❌ ${err.message}\x1b[0m`);
  process.exit(1);
});
