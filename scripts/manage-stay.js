#!/usr/bin/env node

/**
 * Remarkable BnB Stay Management CLI
 * 
 * Usage:
 *   node scripts/manage-stay.js --room <room> --source <source> --check-in <YYYY-MM-DD> --check-out <YYYY-MM-DD> [--hot-tub] [--production]
 * 
 * Examples:
 *   node scripts/manage-stay.js --room two-bedroom-unit --source airbnb --check-in 2026-07-20 --check-out 2026-07-25 --hot-tub
 */

import { execSync } from 'child_process';
import crypto from 'crypto';

// Parse arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const nextVal = args[i + 1];
    if (nextVal && !nextVal.startsWith('--')) {
      params[key] = nextVal;
      i++;
    } else {
      params[key] = true; // Boolean flag
    }
  }
}

const { room, source, 'check-in': checkIn, 'check-out': checkOut, 'hot-tub': hotTub, production } = params;

// Validations
if (!room || !source || !checkIn || !checkOut) {
  console.error('\x1b[31mError: Missing required parameters.\x1b[0m');
  console.log(`
Usage:
  node scripts/manage-stay.js --room <room> --source <source> --check-in <YYYY-MM-DD> --check-out <YYYY-MM-DD> [--hot-tub] [--production]

Options:
  --room       two-bedroom-unit | guest-room
  --source     airbnb | direct | repeat
  --check-in   YYYY-MM-DD
  --check-out  YYYY-MM-DD
  --hot-tub    (Optional flag) Enable hot tub offer
  --production (Optional flag) Run against production D1 and KV (requires remote auth)
`);
  process.exit(1);
}

const validRooms = ['two-bedroom-unit', 'guest-room'];
const validSources = ['airbnb', 'direct', 'repeat'];

if (!validRooms.includes(room)) {
  console.error(`\x1b[31mError: Invalid room "${room}". Must be one of: ${validRooms.join(', ')}\x1b[0m`);
  process.exit(1);
}

if (!validSources.includes(source)) {
  console.error(`\x1b[31mError: Invalid source "${source}". Must be one of: ${validSources.join(', ')}\x1b[0m`);
  process.exit(1);
}

// Generate token (short alphanumeric string)
const token = crypto.randomBytes(3).toString('hex'); // 6 character random hex string
const hotTubValue = hotTub ? 1 : 0;
const targetEnvFlag = production ? '--remote' : '--local';

console.log(`\n\x1b[36mGenerating stay for ${room} (${source})...\x1b[0m`);
console.log(`Token:     \x1b[32m${token}\x1b[0m`);
console.log(`Dates:     ${checkIn} to ${checkOut}`);
console.log(`Hot Tub:   ${hotTub ? 'Yes' : 'No'}`);
console.log(`Database:  ${production ? 'Production (Remote)' : 'Development (Local)'}`);

// Prepare D1 query
const d1Query = `INSERT INTO stays (token, room, source, check_in, check_out, hot_tub_offered) VALUES ('${token}', '${room}', '${source}', '${checkIn}', '${checkOut}', ${hotTubValue});`;

try {
  // 1. Run D1 transaction
  console.log(`\n\x1b[33m1. Writing stay to D1 Database...\x1b[0m`);
  const d1Cmd = `npx wrangler d1 execute remarkablebnb ${targetEnvFlag} --command="${d1Query}"`;
  console.log(`Running: ${d1Cmd}`);
  execSync(d1Cmd, { stdio: 'inherit' });

  // 2. Update KV Active Redirection Pointer
  console.log(`\n\x1b[33m2. Updating KV Active Pointer for /go/${room}...\x1b[0m`);
  const kvCmd = `npx wrangler kv key put --binding=GO_REDIRECTS ${production ? '' : '--local'} "${room}" "${token}"`;
  console.log(`Running: ${kvCmd}`);
  execSync(kvCmd, { stdio: 'inherit' });

  console.log(`\n\x1b[32m✔ Stay successfully created and activated!\x1b[0m`);
  console.log(`Guest URL: \x1b[34mhttps://${production ? 'remarkablebnb.nz' : 'localhost:4321'}/stay/${token}/check-in\x1b[0m`);
  console.log(`QR Code URL: \x1b[34mhttps://${production ? 'remarkablebnb.nz' : 'localhost:4321'}/go/${room}\x1b[0m\n`);

} catch (err) {
  console.error(`\n\x1b[31m❌ Error executing stay creation:\x1b[0m`);
  console.error(err.message);
  process.exit(1);
}
