import type { SundialPrint } from '../types/sundial';

export interface TourStop {
  print: SundialPrint;
  lat: number;
  lng: number;
  shortName: string;
  isUS: boolean;
}

const CONTIGUOUS_US = { latMin: 24, latMax: 50, lngMin: -125, lngMax: -66 };
const HAWAII = { latMin: 18, latMax: 23, lngMin: -161, lngMax: -154 };
const ALASKA = { latMin: 51, latMax: 72, lngMin: -180, lngMax: -129 };

/** Normalize longitude into [-180, 180]. */
export function normalizeLongitude(lng: number): number {
  let n = lng;
  while (n > 180) n -= 360;
  while (n < -180) n += 360;
  return n;
}

export function isLikelyUSLocation(print: SundialPrint, lat: number, lng: number): boolean {
  const loc = (print.location || '').toLowerCase();
  if (
    loc.includes('united states') ||
    loc.includes(', usa') ||
    loc.endsWith(' usa') ||
    /\busa\b/.test(loc)
  ) {
    return true;
  }
  if (
    lat >= CONTIGUOUS_US.latMin && lat <= CONTIGUOUS_US.latMax &&
    lng >= CONTIGUOUS_US.lngMin && lng <= CONTIGUOUS_US.lngMax
  ) {
    return true;
  }
  if (
    lat >= HAWAII.latMin && lat <= HAWAII.latMax &&
    lng >= HAWAII.lngMin && lng <= HAWAII.lngMax
  ) {
    return true;
  }
  if (
    lat >= ALASKA.latMin && lat <= ALASKA.latMax &&
    lng >= ALASKA.lngMin && lng <= ALASKA.lngMax
  ) {
    return true;
  }
  return false;
}

/**
 * Shorten reverse-geocoded / Nominatim-style location strings for overlays.
 * "The Villages, … Florida, … United States" → "The Villages, Florida"
 */
export function shortLocationName(location: string | undefined, lat: number, lng: number): string {
  if (!location || location === 'Custom Lat/Long') {
    return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
  }

  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
  }

  // Drop leading street numbers / house numbers when present
  let start = 0;
  if (/^\d/.test(parts[0]) && parts.length > 2) {
    start = 1;
  }

  const countryish = /united states|usa|deutschland|españa|spain|polska|poland|japan|france|italia|canada|australia|méxico|mexico|uk|england|scotland|ireland/i;
  const regionHints = /florida|colorado|hawaii|hawaiʻi|california|texas|new york|arizona|oregon|washington|virginia|georgia|north carolina|south carolina|massachusetts|illinois|ohio|michigan|pennsylvania|tennessee|nevada|utah|new mexico|baden-württemberg|hessen|niedersachsen|aragon|aragón|małopolskie|sumter|larimer|honolulu/i;

  const useful = parts.slice(start).filter((p) => {
    if (/^\d{4,}$/.test(p)) return false; // bare postal codes
    if (/^\d{5}(-\d{4})?$/.test(p)) return false;
    if (/county|landkreis|powiat|gmina|village of|estates/i.test(p)) return false;
    return true;
  });

  const streetish = /\b(street|st\.?|loop|avenue|ave\.?|road|rd\.?|drive|dr\.?|way|lane|ln\.?|court|ct\.?|blvd|boulevard|highway|hwy)\b/i;
  const stateIdx = useful.findIndex((p) => regionHints.test(p));
  const countryIdx = useful.findIndex((p) => countryish.test(p));
  const regionIdx = stateIdx >= 0 ? stateIdx : countryIdx;
  const region = regionIdx >= 0 ? useful[regionIdx] : useful[1];

  const beforeRegion = regionIdx > 0 ? useful.slice(0, regionIdx) : useful;
  const placeCandidates = beforeRegion.filter((p) => !streetish.test(p) && !countryish.test(p));
  // Prefer the last place-like token before the state/country (usually the city)
  const place =
    placeCandidates[placeCandidates.length - 1] ||
    beforeRegion[beforeRegion.length - 1] ||
    useful[0] ||
    parts[start] ||
    parts[0];

  if (region && region !== place) {
    return `${place}, ${region}`;
  }
  return place;
}

function toStop(print: SundialPrint): TourStop | null {
  const lat = Number(print.latitude);
  const rawLng = Number(print.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(rawLng)) return null;
  if (lat < -90 || lat > 90) return null;
  const lng = normalizeLongitude(rawLng);
  return {
    print,
    lat,
    lng,
    shortName: shortLocationName(print.location, lat, lng),
    isUS: isLikelyUSLocation(print, lat, lng),
  };
}

/**
 * Build a tour from prints. Prefers non-US stops when filling the pool, but caps
 * that preference so a fair share of US stops still appear. Caps at `maxStops`.
 *
 * - start: 'latest' begins at newest pin; 'earliest' at oldest
 * - order: 'linear' keeps chronological order from the start; 'random' shuffles the rest
 * - duplicates: 'skip' collapses only contiguous same-lat/lng runs in the input list
 *   (keep the latest print in each run by created_at; never by country; does NOT
 *   globally unique locations — A,A,B,A → A,B,A); 'include' keeps every print
 */
export interface WorldTourRouteOptions {
  start?: 'latest' | 'earliest';
  order?: 'linear' | 'random';
  duplicates?: 'skip' | 'include';
}

/** Prefer non-US in the pool, but leave ~35% of slots for US when available. */
const NON_US_PREF_FRACTION = 0.65;

function createdAtMs(stop: TourStop): number {
  const t = stop.print.created_at ? Date.parse(stop.print.created_at) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function locationKey(stop: TourStop): string {
  return `${stop.lat.toFixed(2)},${stop.lng.toFixed(2)}`;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/** True if `a` is strictly newer than `b` by created_at. */
function isNewerStop(a: TourStop, b: TourStop): boolean {
  return createdAtMs(a) > createdAtMs(b);
}

/**
 * Collapse adjacent same-location runs only. Within each run, keep the latest print
 * by created_at (ties keep the earlier list item — typically API newest-first).
 * Does not remove a location that reappears later after a different stop.
 */
function collapseContiguousDuplicates(stops: TourStop[]): TourStop[] {
  if (stops.length === 0) return [];
  const out: TourStop[] = [];
  let runBest = stops[0];
  let runKey = locationKey(stops[0]);
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i];
    const key = locationKey(s);
    if (key === runKey) {
      if (isNewerStop(s, runBest)) runBest = s;
      continue;
    }
    out.push(runBest);
    runBest = s;
    runKey = key;
  }
  out.push(runBest);
  return out;
}

export function buildWorldTourRoute(
  prints: SundialPrint[],
  maxStops = 50,
  options: WorldTourRouteOptions = {},
): TourStop[] {
  const startMode = options.start ?? 'latest';
  const orderMode = options.order ?? 'linear';
  const duplicatesMode = options.duplicates ?? 'skip';

  if (prints.length === 0) return [];

  // Preserve API order (newest → oldest)
  const allStops: TourStop[] = [];
  for (const print of prints) {
    if (print.exclude_from_world_tour === true) continue;
    const stop = toStop(print);
    if (stop) allStops.push(stop);
  }
  if (allStops.length === 0) return [];

  // Contiguous collapse is independent of Start At (input / API list order).
  const candidates =
    duplicatesMode === 'include' ? allStops : collapseContiguousDuplicates(allStops);

  const ordered = [...candidates].sort((a, b) => {
    const da = createdAtMs(a);
    const db = createdAtMs(b);
    if (da !== db) {
      return startMode === 'latest' ? db - da : da - db;
    }
    const ia = candidates.indexOf(a);
    const ib = candidates.indexOf(b);
    return startMode === 'latest' ? ia - ib : ib - ia;
  });

  const start = ordered[0];
  const remaining = ordered.slice(1);

  const nonUS = remaining.filter((s) => !s.isUS);
  const us = remaining.filter((s) => s.isUS);

  // Randomize the complete candidate groups before applying the tour-length cap.
  // This gives every fetched record a chance to be selected instead of shuffling
  // only the first chronological `maxStops` records.
  if (orderMode === 'random') {
    shuffleInPlace(nonUS);
    shuffleInPlace(us);
  }

  const targetCount = Math.min(maxStops, ordered.length);
  const slots = targetCount - 1;
  // Prefer non-US up to a fraction of pool slots, then fill with US, then leftover non-US.
  // Without the cap, when nonUS.length >= slots the tour would show only the start US pin.
  const preferredNonUs = Math.min(nonUS.length, Math.ceil(slots * NON_US_PREF_FRACTION));
  const pool: TourStop[] = [];
  for (let i = 0; i < preferredNonUs; i++) {
    pool.push(nonUS[i]);
  }
  for (const s of us) {
    if (pool.length >= slots) break;
    pool.push(s);
  }
  for (let i = preferredNonUs; i < nonUS.length; i++) {
    if (pool.length >= slots) break;
    pool.push(nonUS[i]);
  }

  if (orderMode === 'random') {
    shuffleInPlace(pool);
  } else {
    pool.sort((a, b) => {
      const da = createdAtMs(a);
      const db = createdAtMs(b);
      return startMode === 'latest' ? db - da : da - db;
    });
  }

  return [start, ...pool];
}
