// One-off generator for packages/core/data/cities.ts.
// Usage: node scripts/buildCities.mjs [scripts/cities-input.json] > data/cities.ts
// Input rows: { code, nameRu, nameEn, population, region? } (Rosstat estimate for 1 Jan 2025, cities >= 100k).
// Centre + bounding box come from OSM Nominatim (1 req/s policy); spb/moscow keep the
// hand-tuned bounds the geocoder tests depend on.
import { readFileSync } from 'node:fs';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'bystrobarista-dev/1.0 (city dataset build; davidaenukashvili@gmail.com)';
const PAD_DEG = 0.03;
const MAX_DLAT = 0.65;
const MAX_DLON = 1.2;

// Nominatim resolves the Crimean cities to same-named villages/rivers in mainland
// Russia, so their centres come from OSM by hand.
const MANUAL = {
  sevastopol: {
    lat: 44.6166,
    lon: 33.5254,
    bounds: { minLat: 44.38, maxLat: 44.85, minLon: 33.35, maxLon: 33.85 },
  },
  simferopol: {
    lat: 44.9521,
    lon: 34.1024,
    bounds: { minLat: 44.85, maxLat: 45.05, minLon: 33.95, maxLon: 34.25 },
  },
  kerch: {
    lat: 45.3563,
    lon: 36.4674,
    bounds: { minLat: 45.25, maxLat: 45.45, minLon: 36.3, maxLon: 36.65 },
  },
  yevpatoria: {
    lat: 45.1904,
    lon: 33.3669,
    bounds: { minLat: 45.1, maxLat: 45.3, minLon: 33.2, maxLon: 33.5 },
  },
};

// Nominatim returns the centroid of the whole municipal relation (New Moscow pulls
// it far south), so the two capitals keep their conventional city centres.
const FIXED_CENTRES = {
  spb: { lat: 59.9343, lon: 30.3351 },
  moscow: { lat: 55.7558, lon: 37.6173 },
};

const FIXED_BOUNDS = {
  spb: { minLat: 59.63, maxLat: 60.25, minLon: 29.55, maxLon: 30.8 },
  moscow: { minLat: 55.12, maxLat: 56.38, minLon: 36.5, maxLon: 38.74 },
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const round = (value, digits) => Number(value.toFixed(digits));

const fallbackBounds = (lat, lon, population) => {
  const dLat = 0.08 + 0.12 * Math.sqrt(population / 1e6);
  const dLon = dLat / Math.cos((lat * Math.PI) / 180);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
};

const clampBounds = (bounds, lat, lon) => ({
  minLat: Math.max(bounds.minLat - PAD_DEG, lat - MAX_DLAT),
  maxLat: Math.min(bounds.maxLat + PAD_DEG, lat + MAX_DLAT),
  minLon: Math.max(bounds.minLon - PAD_DEG, lon - MAX_DLON),
  maxLon: Math.min(bounds.maxLon + PAD_DEG, lon + MAX_DLON),
});

const lookup = async city => {
  const query = [city.nameRu, city.region, 'Россия'].filter(Boolean).join(', ');
  const url =
    `${NOMINATIM}?q=${encodeURIComponent(query)}` +
    '&format=jsonv2&limit=5&accept-language=ru&countrycodes=ru,ua';
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for ${city.code}`);
  const hits = await res.json();
  const isCity = h =>
    (h.class === 'place' && ['city', 'town'].includes(h.type)) ||
    (h.class === 'boundary' && h.type === 'administrative');
  return hits.find(h => isCity(h) && h.osm_type === 'relation') ?? hits.find(isCity) ?? hits[0];
};

const inputPath = process.argv[2] ?? new URL('./cities-input.json', import.meta.url);
const input = JSON.parse(readFileSync(inputPath, 'utf8'));
const rows = [];

for (const city of input) {
  const manual = MANUAL[city.code];
  if (manual) {
    rows.push({
      ...city,
      latitude: manual.lat,
      longitude: manual.lon,
      bounds: manual.bounds,
    });
    continue;
  }
  let hit;
  try {
    hit = await lookup(city);
  } catch (error) {
    process.stderr.write(`${city.code}: ${error.message}\n`);
  }
  await sleep(1100);
  if (!hit) {
    process.stderr.write(`${city.code}: no Nominatim hit, skipping\n`);
    continue;
  }
  const lat = FIXED_CENTRES[city.code]?.lat ?? parseFloat(hit.lat);
  const lon = FIXED_CENTRES[city.code]?.lon ?? parseFloat(hit.lon);
  const [minLat, maxLat, minLon, maxLon] = hit.boundingbox.map(parseFloat);
  const rawBounds =
    hit.osm_type === 'relation'
      ? { minLat, maxLat, minLon, maxLon }
      : fallbackBounds(lat, lon, city.population);
  const bounds = FIXED_BOUNDS[city.code] ?? clampBounds(rawBounds, lat, lon);
  process.stderr.write(`${city.code}: ${hit.display_name} [${hit.osm_type}/${hit.type}]\n`);
  rows.push({
    code: city.code,
    nameRu: city.nameRu,
    nameEn: city.nameEn,
    population: city.population,
    region: undefined,
    latitude: round(lat, 4),
    longitude: round(lon, 4),
    bounds: {
      minLat: round(bounds.minLat, 2),
      maxLat: round(bounds.maxLat, 2),
      minLon: round(bounds.minLon, 2),
      maxLon: round(bounds.maxLon, 2),
    },
  });
}

rows.sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru'));

const lines = rows.map(
  r =>
    `  {\n    code: '${r.code}',\n    nameRu: '${r.nameRu}',\n    nameEn: '${r.nameEn}',\n` +
    `    population: ${r.population},\n    latitude: ${r.latitude},\n    longitude: ${r.longitude},\n` +
    `    bounds: { minLat: ${r.bounds.minLat}, maxLat: ${r.bounds.maxLat}, minLon: ${r.bounds.minLon}, maxLon: ${r.bounds.maxLon} },\n  },`
);

process.stdout.write(
  `// Generated by scripts/buildCities.mjs — do not edit by hand.\n` +
    `// Russian cities with 100 000+ residents (Rosstat 2021 census); bounds from OSM Nominatim.\n` +
    `export const CITIES = [\n${lines.join('\n')}\n] as const;\n`
);
