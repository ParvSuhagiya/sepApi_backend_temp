#!/usr/bin/env node
/**
 * Route-bundle budgets for CI. Fails when the landing or app routes exceed
 * their gzip budgets, or when heavy libraries leak into the shared entry
 * chunk (Leaflet and Recharts must stay lazy on result pages).
 *
 * Budgets: landing JS < 150 kB gzip, app route < 350 kB gzip excluding the
 * map chunks (JobsMap / LeadsMap / TileLayer).
 *
 * Run after `npm run build`: `npm run size-check`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(rootDir, 'dist', 'assets');
const LANDING_BUDGET = 150 * 1024;
const APP_BUDGET = 350 * 1024;
// Chunks that belong to the lazily-loaded map layers, never to a route total.
const MAP_CHUNK = /JobsMap|LeadsMap|TileLayer|markercluster/i;

const gzipBytes = (file) => zlib.gzipSync(readFileSync(file)).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

function chunk(prefix) {
  const files = readdirSync(assetsDir).filter(
    (name) => name.startsWith(prefix) && name.endsWith('.js'),
  );
  if (files.length === 0) {
    console.error(`FAIL: chunk not found: ${prefix}*.js (run npm run build first)`);
    process.exit(1);
  }
  const [file] = files;
  return { file, gzip: gzipBytes(join(assetsDir, file)) };
}

function entryChunk() {
  const html = readFileSync(join(rootDir, 'dist', 'index.html'), 'utf8');
  const match = html.match(/\/assets\/(index-[^"]+\.js)/);
  if (!match?.[1]) {
    console.error('FAIL: shared entry chunk not referenced by dist/index.html');
    process.exit(1);
  }
  return { file: match[1], gzip: gzipBytes(join(assetsDir, match[1])) };
}

const entry = entryChunk();
const landing = chunk('LandingPage-');
const income = chunk('HomePage-');
const customers = chunk('CustomersPage-');

// Heavy libraries must stay out of the shared entry chunk.
const entryText = readFileSync(join(assetsDir, entry.file), 'utf8').toLowerCase();
for (const marker of ['leaflet', 'recharts']) {
  if (entryText.includes(marker)) {
    console.error(`FAIL: shared entry chunk contains ${marker}; keep it lazy on result pages`);
    process.exit(1);
  }
}

// Map chunks must exist as separate lazy layers.
const mapChunks = readdirSync(assetsDir).filter(
  (name) => MAP_CHUNK.test(name) && name.endsWith('.js'),
);
if (mapChunks.length === 0) {
  console.error('FAIL: no lazy map chunks found in dist/assets');
  process.exit(1);
}

const landingTotal = entry.gzip + landing.gzip;
const appTotal = entry.gzip + income.gzip + customers.gzip;

console.log(
  `landing: entry ${entry.file} ${kb(entry.gzip)} + ${landing.file} ${kb(landing.gzip)} = ${kb(landingTotal)} (budget ${kb(LANDING_BUDGET)})`,
);
console.log(
  `app route: entry ${kb(entry.gzip)} + ${income.file} ${kb(income.gzip)} + ${customers.file} ${kb(customers.gzip)} = ${kb(appTotal)} (budget ${kb(APP_BUDGET)}, map chunks excluded)`,
);
console.log(`map chunks: ${mapChunks.join(', ')}`);

let failed = false;
if (landingTotal > LANDING_BUDGET) {
  console.error(`FAIL: landing JS ${kb(landingTotal)} exceeds ${kb(LANDING_BUDGET)} gzip`);
  failed = true;
}
if (appTotal > APP_BUDGET) {
  console.error(`FAIL: app route JS ${kb(appTotal)} exceeds ${kb(APP_BUDGET)} gzip`);
  failed = true;
}
if (failed) process.exit(1);
console.log('size-check passed');
