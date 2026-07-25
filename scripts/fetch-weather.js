#!/usr/bin/env node

/**
 * Remarkable BnB — winter conditions data fetch
 *
 * Runs before `astro build` (never client-side) to produce a small JSON
 * snapshot for the homepage "Winter conditions" panel, grouped by field
 * (The Remarkables, Coronet Peak, Cardrona). Each fact is fetched and
 * parsed independently; a fact that fails is written with ok:false and no
 * value, so the panel falls back to a plain link for that fact instead of
 * showing something wrong. The whole snapshot also carries a generatedAt
 * timestamp so the panel can fall back entirely if a build hasn't run in
 * >48h (e.g. the Action stopped firing).
 *
 * All three fields are genuinely live, official sources, found by
 * inspecting each field's own website network requests on 2026-07-25
 * (not screen-scraped HTML built for humans):
 *  - The Remarkables & Coronet Peak (both NZSki) share one JSON API:
 *    https://webcams-awb2e0ceg7cccsba.a02.azurefd.net/{slug}-data.json
 *    This is the exact endpoint their own site's weather widget calls, and
 *    covers temperature, forecast, snow base, and road/chain status in one
 *    response.
 *  - Cardrona's site (a Contentful-backed Next.js app) calls
 *    https://cardrona-treblecone.com/api/snowreport/get-snow-report with a
 *    fixed Contentful contentId for the combined Cardrona/Treble Cone
 *    report. Temperature + 3-day forecast for Cardrona still come from
 *    Open-Meteo (Cardrona's own temperature API returns Fahrenheit via a
 *    separate OpenSnow integration that isn't worth the parsing risk here).
 *
 * Usage: node scripts/fetch-weather.js
 * Writes: src/data/winter-conditions.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../src/data/winter-conditions.json');

const NZSKI_DATA_URL = (slug) => `https://webcams-awb2e0ceg7cccsba.a02.azurefd.net/${slug}-data.json`;
const CARDRONA_SNOW_REPORT_URL = 'https://cardrona-treblecone.com/api/snowreport/get-snow-report';
// Contentful contentId for the combined Cardrona/Treble Cone snow report
// section; mountainInformation[0] is Cardrona. If Cardrona's CMS content
// gets rebuilt this id may need updating (found via their site's own
// network requests, not documented anywhere public).
const CARDRONA_CONTENT_ID = '4E93afTKIKb69sHrooX8AM';

const SOURCES = {
  remarkablesReport: 'https://www.theremarkables.co.nz/weather-report/',
  coronetReport: 'https://www.coronetpeak.co.nz/weather-report/',
  cardronaReport: 'https://cardrona-treblecone.com/snow-report',
  openMeteo: 'https://open-meteo.com/',
};

async function fetchJson(url, init) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), ...init });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
}

// Minimal WMO weather_code -> short description map, for Open-Meteo
// (Cardrona's temperature/forecast source).
const WMO_DESCRIPTIONS = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Thunderstorm, heavy hail',
};

const ok = (value) => ({ ok: true, value });
const fail = () => ({ ok: false, value: null });

// The Remarkables / Coronet Peak: NZSki's own JSON data feed. Covers
// temperature, 3-day forecast, snow base, and road/chain status together.
async function getNzskiField(slug) {
  const d = await fetchJson(NZSKI_DATA_URL(slug));

  const sensorTemp = d?.temperature?.sensor;
  const temp = typeof sensorTemp === 'number' ? ok(`${Math.round(sensorTemp)}°C${d.weatherIcon ? ` · ${d.weatherIcon}` : ''}`) : fail();

  const dayLabels = ['Today', 'Tomorrow', 'Day after'];
  const forecastLines = (d?.forecast ?? []).slice(0, 3).map((f, i) => {
    const label = dayLabels[i] ?? f.day;
    return `${label}: ${Math.round(f.low)}° to ${Math.round(f.high)}°${f.weatherIcon ? `, ${f.weatherIcon.toLowerCase()}` : ''}`;
  });
  const forecast = forecastLines.length ? ok(forecastLines.join(' · ')) : fail();

  // NZSki's own base.min/base.max aren't reliably ordered (seen min > max
  // on live data), so sort numerically rather than trust field names.
  const base = d?.snow?.base;
  const baseRange =
    base && typeof base.min === 'number' && typeof base.max === 'number'
      ? `${Math.min(base.min, base.max)}-${Math.max(base.min, base.max)}cm`
      : null;
  const snowBase =
    baseRange || typeof d?.snow?.last7Days === 'number'
      ? ok([baseRange, typeof d?.snow?.last7Days === 'number' ? `${d.snow.last7Days}cm in the last 7 days` : null].filter(Boolean).join(' · '))
      : fail();

  const chainRoad =
    d?.RoadStatus || d?.ChainStatus
      ? ok([d.RoadStatus && `Road ${String(d.RoadStatus).toLowerCase()}`, d.ChainStatus && `Chains: ${d.ChainStatus}`].filter(Boolean).join(' · '))
      : fail();

  const status = typeof d?.MountainStatus === 'string' ? d.MountainStatus : null;

  return { temp, forecast, snowBase, chainRoad, status };
}

// Cardrona: live snow-report facts from their own Contentful-backed API.
async function getCardronaSnowReport() {
  const d = await fetchJson(CARDRONA_SNOW_REPORT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentId: CARDRONA_CONTENT_ID }),
  });
  const mi = (d?.mountainInformation ?? []).find((m) => m.mountainId === 'cardrona') ?? d?.mountainInformation?.[0];
  if (!mi) throw new Error('Cardrona mountainInformation not found in response');

  const snowBase =
    mi.snowBaseStr || typeof mi.snowCondition7Days === 'number'
      ? ok([mi.snowBaseStr, typeof mi.snowCondition7Days === 'number' ? `${mi.snowCondition7Days}cm in the last 7 days` : null].filter(Boolean).join(' · '))
      : fail();

  const chainRoad =
    mi.roadConditions || mi.chains2wdLocation
      ? ok([mi.roadConditions && `Road: ${mi.roadConditions}`, mi.chains2wdLocation && `Chains from ${mi.chains2wdLocation}`].filter(Boolean).join(' · '))
      : fail();

  const status = typeof mi.resortStatus === 'string' && mi.resortStatus ? mi.resortStatus[0].toUpperCase() + mi.resortStatus.slice(1) : null;

  return { snowBase, chainRoad, status };
}

// Cardrona temperature + 3-day forecast: Open-Meteo, keyed to Cardrona's
// base coordinates.
async function getCardronaWeather() {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=-44.8567&longitude=168.9436' +
    '&elevation=1670&current=temperature_2m,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Pacific%2FAuckland&forecast_days=3';
  const json = await fetchJson(url);

  const currentTemp = json?.current?.temperature_2m;
  const currentCode = json?.current?.weather_code;
  const temp =
    typeof currentTemp === 'number'
      ? ok(`${Math.round(currentTemp)}°C${currentCode in WMO_DESCRIPTIONS ? ` · ${WMO_DESCRIPTIONS[currentCode]}` : ''}`)
      : fail();

  const days = json?.daily?.time ?? [];
  const maxes = json?.daily?.temperature_2m_max ?? [];
  const mins = json?.daily?.temperature_2m_min ?? [];
  const codes = json?.daily?.weather_code ?? [];
  const dayLabels = ['Today', 'Tomorrow', 'Day after'];
  const forecastLines = days.slice(0, 3).map((_, i) => {
    const desc = WMO_DESCRIPTIONS[codes[i]] || '';
    return `${dayLabels[i]}: ${Math.round(mins[i])}° to ${Math.round(maxes[i])}°${desc ? `, ${desc.toLowerCase()}` : ''}`;
  });
  const forecast = forecastLines.length ? ok(forecastLines.join(' · ')) : fail();

  return { temp, forecast };
}

// Turns a field's facts into the panel's flat fact-list shape, falling
// back each individual fact to a plain link when it wasn't fetched ok.
function buildFacts(sourceUrl, sourceLabel, facts) {
  return facts.map(({ id, label, result }) => ({ id, label, sourceUrl, linkLabel: sourceLabel, ...result }));
}

async function main() {
  const generatedAt = new Date().toISOString();
  const fields = [];

  // The Remarkables
  try {
    const r = await getNzskiField('the-remarkables');
    fields.push({
      id: 'remarkables',
      name: 'The Remarkables',
      status: r.status,
      facts: buildFacts(SOURCES.remarkablesReport, 'The Remarkables snow report', [
        { id: 'snow-base', label: 'Snow base', result: r.snowBase },
        { id: 'chain-road', label: 'Chains / road', result: r.chainRoad },
        { id: 'temp', label: 'Temperature', result: r.temp },
        { id: 'forecast', label: '3-day forecast', result: r.forecast },
      ]),
    });
  } catch (err) {
    console.error(`[fetch-weather] The Remarkables fetch failed: ${err.message}`);
    fields.push(emptyField('remarkables', 'The Remarkables', SOURCES.remarkablesReport, 'The Remarkables snow report'));
  }

  // Coronet Peak
  try {
    const r = await getNzskiField('coronet-peak-winter');
    fields.push({
      id: 'coronet',
      name: 'Coronet Peak',
      status: r.status,
      facts: buildFacts(SOURCES.coronetReport, 'Coronet Peak snow report', [
        { id: 'snow-base', label: 'Snow base', result: r.snowBase },
        { id: 'chain-road', label: 'Chains / road', result: r.chainRoad },
        { id: 'temp', label: 'Temperature', result: r.temp },
        { id: 'forecast', label: '3-day forecast', result: r.forecast },
      ]),
    });
  } catch (err) {
    console.error(`[fetch-weather] Coronet Peak fetch failed: ${err.message}`);
    fields.push(emptyField('coronet', 'Coronet Peak', SOURCES.coronetReport, 'Coronet Peak snow report'));
  }

  // Cardrona: two independent sources, so fetch (and fail) separately.
  let cardronaReport = { snowBase: fail(), chainRoad: fail(), status: null };
  try {
    cardronaReport = await getCardronaSnowReport();
  } catch (err) {
    console.error(`[fetch-weather] Cardrona snow report fetch failed: ${err.message}`);
  }
  let cardronaWeather = { temp: fail(), forecast: fail() };
  try {
    cardronaWeather = await getCardronaWeather();
  } catch (err) {
    console.error(`[fetch-weather] Cardrona Open-Meteo fetch failed: ${err.message}`);
  }
  fields.push({
    id: 'cardrona',
    name: 'Cardrona',
    status: cardronaReport.status,
    facts: buildFacts(SOURCES.cardronaReport, 'Cardrona snow report', [
      { id: 'snow-base', label: 'Snow base', result: cardronaReport.snowBase },
      { id: 'chain-road', label: 'Chains / road', result: cardronaReport.chainRoad },
      { id: 'temp', label: 'Temperature', result: cardronaWeather.temp },
      { id: 'forecast', label: '3-day forecast', result: cardronaWeather.forecast },
    ]),
  });

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt, fields }, null, 2) + '\n');

  const totalFacts = fields.reduce((sum, f) => sum + f.facts.length, 0);
  const okFacts = fields.reduce((sum, f) => sum + f.facts.filter((x) => x.ok).length, 0);
  console.log(`[fetch-weather] Wrote ${fields.length} fields, ${totalFacts} facts (${okFacts} live) to ${path.relative(process.cwd(), OUT_PATH)}`);
}

function emptyField(id, name, sourceUrl, sourceLabel) {
  return {
    id,
    name,
    status: null,
    facts: buildFacts(sourceUrl, sourceLabel, [
      { id: 'snow-base', label: 'Snow base', result: fail() },
      { id: 'chain-road', label: 'Chains / road', result: fail() },
      { id: 'temp', label: 'Temperature', result: fail() },
      { id: 'forecast', label: '3-day forecast', result: fail() },
    ]),
  };
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
        fields: [
          emptyField('remarkables', 'The Remarkables', 'https://www.theremarkables.co.nz/weather-report/', 'The Remarkables snow report'),
          emptyField('coronet', 'Coronet Peak', 'https://www.coronetpeak.co.nz/weather-report/', 'Coronet Peak snow report'),
          emptyField('cardrona', 'Cardrona', 'https://cardrona-treblecone.com/snow-report', 'Cardrona snow report'),
        ],
      },
      null,
      2
    ) + '\n'
  );
});
