#!/usr/bin/env node

/**
 * Remarkable BnB — winter conditions data fetch
 *
 * Runs before `astro build` (never client-side) to produce a small JSON
 * snapshot for the homepage "Winter conditions" panel. Each data point is
 * fetched and parsed independently; a point that fails to fetch or parse is
 * written with ok:false and no value, so the panel falls back to a plain
 * link for that point instead of showing something wrong. The whole
 * snapshot also carries a generatedAt timestamp so the panel can fall back
 * entirely if a build hasn't run in >48h (e.g. the daily Action stopped
 * firing).
 *
 * Scrapers break silently. Two of these six data points (Queenstown temp,
 * Remarkables temp, 3-day forecast) come from pages that render via
 * client-side JS with no server-rendered numbers to scrape, and Mountainwatch
 * has no stable public data endpoint we could confirm — those three are
 * intentionally always ok:false today and just link out. Only the two
 * Remarkables snow-report values (road/chain status, snow base + last 24h)
 * are actually parsed, from https://www.theremarkables.co.nz/weather-report/.
 * Revisit if/when a reliable source is confirmed for the rest.
 *
 * Usage: node scripts/fetch-weather.js
 * Writes: src/data/winter-conditions.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../src/data/winter-conditions.json');

const SOURCES = {
  remarkablesReport: 'https://www.theremarkables.co.nz/weather-report/',
  metserviceQueenstown: 'https://www.metservice.com/towns-cities/regions/southern-lakes/locations/queenstown',
  metserviceRemarkables: 'https://www.metservice.com/mountains-and-parks/ski-fields/remarkables',
  mountainwatchRemarkables: 'https://www.mountainwatch.com/new-zealand/the-remarkables/weather/',
};

async function fetchText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; RemarkableBnB-WeatherFetch/1.0)' },
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

// Parses the Remarkables weather-report page's repeated
// <p class="w_weather-status__description">Label</p><p class="w_weather-status__data">Value</p>
// pairs into a { "Label": "Value" } map. Verified against the live page on
// 2026-07-24; if the site markup changes this returns {} and every
// dependent field below falls back gracefully.
function parseRemarkablesStatusPairs(html) {
  const re = /w_weather-status__description">\s*([^<]+?)\s*<\/p>\s*<p class="w_weather-status__data">\s*([^<]+?)\s*<\/p>/g;
  const map = {};
  let m;
  while ((m = re.exec(html))) {
    const key = m[1].trim();
    const value = m[2].trim();
    if (key && value && !(key in map)) map[key] = value;
  }
  return map;
}

async function getRemarkablesConditions() {
  const html = await fetchText(SOURCES.remarkablesReport);
  const data = parseRemarkablesStatusPairs(html);

  const roadStatus = data['Road Status'];
  const chains = data['Chains Status'] || data['Chains'];
  const snowBase = data['Snow Base'];
  const last24h = data['Last 24 Hours'];

  const chainRoad =
    roadStatus || chains
      ? {
          ok: true,
          value: [roadStatus && `Road ${roadStatus.toLowerCase()}`, chains && `Chains: ${chains}`].filter(Boolean).join(' · '),
        }
      : { ok: false, value: null };

  const snowfall =
    snowBase || last24h
      ? {
          ok: true,
          value: [snowBase && `Base ${snowBase}`, last24h && `${last24h} in the last 24 hours`].filter(Boolean).join(' · '),
        }
      : { ok: false, value: null };

  return { chainRoad, snowfall };
}

async function main() {
  const generatedAt = new Date().toISOString();

  let chainRoad = { ok: false, value: null };
  let snowfall = { ok: false, value: null };
  try {
    const result = await getRemarkablesConditions();
    chainRoad = result.chainRoad;
    snowfall = result.snowfall;
  } catch (err) {
    console.error(`[fetch-weather] Remarkables snow report fetch failed: ${err.message}`);
  }

  const items = [
    {
      id: 'queenstown-temp',
      label: 'Queenstown temperature',
      sourceUrl: SOURCES.metserviceQueenstown,
      linkLabel: 'MetService Queenstown',
      ok: false,
      value: null,
    },
    {
      id: 'remarkables-temp',
      label: 'The Remarkables temperature',
      sourceUrl: SOURCES.metserviceRemarkables,
      linkLabel: 'MetService, The Remarkables',
      ok: false,
      value: null,
    },
    {
      id: 'snowfall-depth',
      label: 'Last snowfall & current base',
      sourceUrl: SOURCES.remarkablesReport,
      linkLabel: 'The Remarkables snow report',
      ...snowfall,
    },
    {
      id: 'forecast-3day',
      label: '3-day forecast',
      sourceUrl: SOURCES.metserviceRemarkables,
      linkLabel: 'MetService, The Remarkables',
      ok: false,
      value: null,
    },
    {
      id: 'mountainwatch',
      label: 'Mountainwatch snow forecast',
      sourceUrl: SOURCES.mountainwatchRemarkables,
      linkLabel: 'Mountainwatch, The Remarkables',
      ok: false,
      value: null,
    },
    {
      id: 'chain-road',
      label: 'Chain / road status',
      sourceUrl: SOURCES.remarkablesReport,
      linkLabel: 'The Remarkables snow report',
      ...chainRoad,
    },
  ];

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt, items }, null, 2) + '\n');

  const ok = items.filter((i) => i.ok).length;
  console.log(`[fetch-weather] Wrote ${items.length} items (${ok} live, ${items.length - ok} fallback-link) to ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((err) => {
  // Never fail the build over weather data — write an all-fallback snapshot instead.
  console.error(`[fetch-weather] Unexpected failure, writing fallback-only snapshot: ${err.message}`);
  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        items: [],
      },
      null,
      2
    ) + '\n'
  );
});
