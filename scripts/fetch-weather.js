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
 * Two different strategies, deliberately:
 *  - Remarkables temperature + 3-day forecast come from Open-Meteo
 *    (open-meteo.com), a free no-auth JSON weather API keyed to the
 *    Remarkables base coordinates. This is genuinely live, not scraped off
 *    a page built for humans, so it's the most reliable point here.
 *  - Snow base / last-24h snowfall and road/chain status are scraped from
 *    https://www.theremarkables.co.nz/weather-report/, which does render
 *    these server-side (verified against the live page on 2026-07-24).
 *    MetService's town/mountain pages and Mountainwatch's snow-report pages
 *    are client-rendered SPAs with nothing to scrape, so those stay as
 *    plain outbound links.
 *
 * Usage: node scripts/fetch-weather.js
 * Writes: src/data/winter-conditions.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../src/data/winter-conditions.json');

// The Remarkables ski area base building, roughly.
const REMARKABLES_LAT = -45.075;
const REMARKABLES_LON = 168.831;
const REMARKABLES_ELEVATION_M = 1610;

const SOURCES = {
  remarkablesReport: 'https://www.theremarkables.co.nz/weather-report/',
  mountainwatchRemarkables: 'https://www.mountainwatch.com/new-zealand/the-remarkables/weather/',
  openMeteo: 'https://open-meteo.com/',
};

async function fetchText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; RemarkableBnB-WeatherFetch/1.0)' },
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
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

async function getRemarkablesReportConditions() {
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

// Minimal WMO weather_code -> short description map, covering the codes
// that actually turn up for an alpine NZ winter forecast.
const WMO_DESCRIPTIONS = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm, hail',
  99: 'Thunderstorm, heavy hail',
};

async function getRemarkablesWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${REMARKABLES_LAT}&longitude=${REMARKABLES_LON}` +
    `&elevation=${REMARKABLES_ELEVATION_M}&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Pacific%2FAuckland&forecast_days=3`;
  const json = await fetchJson(url);

  const currentTemp = json?.current?.temperature_2m;
  const currentCode = json?.current?.weather_code;
  const temp =
    typeof currentTemp === 'number'
      ? { ok: true, value: `${Math.round(currentTemp)}°C${currentCode in WMO_DESCRIPTIONS ? ` · ${WMO_DESCRIPTIONS[currentCode]}` : ''}` }
      : { ok: false, value: null };

  const days = json?.daily?.time ?? [];
  const maxes = json?.daily?.temperature_2m_max ?? [];
  const mins = json?.daily?.temperature_2m_min ?? [];
  const codes = json?.daily?.weather_code ?? [];
  const dayLabels = ['Today', 'Tomorrow', 'Day after'];
  const forecastLines = days.slice(0, 3).map((_, i) => {
    const desc = WMO_DESCRIPTIONS[codes[i]] || '';
    return `${dayLabels[i]}: ${Math.round(mins[i])}° to ${Math.round(maxes[i])}°${desc ? `, ${desc.toLowerCase()}` : ''}`;
  });
  const forecast = forecastLines.length ? { ok: true, value: forecastLines.join(' · ') } : { ok: false, value: null };

  return { temp, forecast };
}

async function main() {
  const generatedAt = new Date().toISOString();

  let chainRoad = { ok: false, value: null };
  let snowfall = { ok: false, value: null };
  try {
    const result = await getRemarkablesReportConditions();
    chainRoad = result.chainRoad;
    snowfall = result.snowfall;
  } catch (err) {
    console.error(`[fetch-weather] Remarkables snow report fetch failed: ${err.message}`);
  }

  let temp = { ok: false, value: null };
  let forecast = { ok: false, value: null };
  try {
    const result = await getRemarkablesWeather();
    temp = result.temp;
    forecast = result.forecast;
  } catch (err) {
    console.error(`[fetch-weather] Open-Meteo fetch failed: ${err.message}`);
  }

  // Ordered snow-report facts first (what skiers check first thing), then
  // live temp/forecast, then the one source we can only link out to.
  const items = [
    {
      id: 'snowfall-depth',
      label: 'The Remarkables: last snowfall & current base',
      sourceUrl: SOURCES.remarkablesReport,
      linkLabel: 'The Remarkables snow report',
      ...snowfall,
    },
    {
      id: 'chain-road',
      label: 'The Remarkables: chain / road status',
      sourceUrl: SOURCES.remarkablesReport,
      linkLabel: 'The Remarkables snow report',
      ...chainRoad,
    },
    {
      id: 'remarkables-temp',
      label: 'The Remarkables: current temperature',
      sourceUrl: SOURCES.openMeteo,
      linkLabel: 'Weather data by Open-Meteo.com',
      ...temp,
    },
    {
      id: 'forecast-3day',
      label: 'The Remarkables: 3-day forecast',
      sourceUrl: SOURCES.openMeteo,
      linkLabel: 'Weather data by Open-Meteo.com',
      ...forecast,
    },
  ];

  const links = [{ id: 'mountainwatch', label: 'Mountainwatch snow forecast', sourceUrl: SOURCES.mountainwatchRemarkables }];

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt, items, links }, null, 2) + '\n');

  const ok = items.filter((i) => i.ok).length;
  console.log(`[fetch-weather] Wrote ${items.length} items (${ok} live, ${items.length - ok} fallback-link) + ${links.length} link-only to ${path.relative(process.cwd(), OUT_PATH)}`);
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
        links: [{ id: 'mountainwatch', label: 'Mountainwatch snow forecast', sourceUrl: 'https://www.mountainwatch.com/new-zealand/the-remarkables/weather/' }],
      },
      null,
      2
    ) + '\n'
  );
});
