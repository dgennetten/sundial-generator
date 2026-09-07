/** Admin prefs: server is source of truth; localStorage caches last fetch. Session unlock stays local. */

export const ADMIN_PASSWORD = '752192';

const UNLOCK_KEY = 'sundial-admin-unlocked';
const CACHE_KEY = 'sundial-admin-settings-cache';

export const DEFAULT_PIN_LIMIT = 200;
export const MIN_PIN_LIMIT = 1;
export const MAX_PIN_LIMIT = 1000;

export const DEFAULT_TOUR_LENGTH = 50;
export const MIN_TOUR_LENGTH = 5;
export const MAX_TOUR_LENGTH = 200;

export type TourStartMode = 'latest' | 'earliest';
export type TourOrderMode = 'linear' | 'random';
export type TourSpeedMode = 'slow' | 'normal' | 'fast';
export type TourDuplicatesMode = 'skip' | 'include';

/** Multiplier applied to tour camera/hold durations (higher = slower). */
export const TOUR_SPEED_SCALE: Record<TourSpeedMode, number> = {
  slow: 1.55,
  normal: 1,
  fast: 0.55,
};

export interface GlobalAdminSettings {
  pinLimit: number;
  /** null = client default (DEV / ?perf); boolean forces on/off for everyone */
  showPerf: boolean | null;
  tourStart: TourStartMode;
  tourOrder: TourOrderMode;
  tourShadow: boolean;
  tourLength: number;
  tourSpeed: TourSpeedMode;
  tourDuplicates: TourDuplicatesMode;
}

const SETTINGS_API_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'https://precisionsundial.com/sundial-settings-api.php'
    : '/sundial-settings-api.php';

export function defaultGlobalAdminSettings(): GlobalAdminSettings {
  return {
    pinLimit: DEFAULT_PIN_LIMIT,
    showPerf: null,
    tourStart: 'latest',
    tourOrder: 'linear',
    tourShadow: true,
    tourLength: DEFAULT_TOUR_LENGTH,
    tourSpeed: 'normal',
    tourDuplicates: 'skip',
  };
}

let memoryCache: GlobalAdminSettings | null = null;
let persistChain: Promise<void> = Promise.resolve();

function clampPinLimit(n: number): number {
  return Math.min(MAX_PIN_LIMIT, Math.max(MIN_PIN_LIMIT, Math.round(n)));
}

function clampTourLength(n: number): number {
  return Math.min(MAX_TOUR_LENGTH, Math.max(MIN_TOUR_LENGTH, Math.round(n)));
}

export function normalizeGlobalAdminSettings(raw: Partial<GlobalAdminSettings> | null | undefined): GlobalAdminSettings {
  const d = defaultGlobalAdminSettings();
  if (!raw || typeof raw !== 'object') return d;

  const pin = typeof raw.pinLimit === 'number' ? raw.pinLimit : d.pinLimit;
  const len = typeof raw.tourLength === 'number' ? raw.tourLength : d.tourLength;

  let showPerf: boolean | null = d.showPerf;
  if (raw.showPerf === true || raw.showPerf === false) showPerf = raw.showPerf;
  else if (raw.showPerf === null) showPerf = null;

  return {
    pinLimit: clampPinLimit(Number.isFinite(pin) ? pin : d.pinLimit),
    showPerf,
    tourStart: raw.tourStart === 'earliest' ? 'earliest' : 'latest',
    tourOrder: raw.tourOrder === 'random' ? 'random' : 'linear',
    tourShadow: raw.tourShadow === false ? false : true,
    tourLength: clampTourLength(Number.isFinite(len) ? len : d.tourLength),
    tourSpeed: raw.tourSpeed === 'slow' || raw.tourSpeed === 'fast' ? raw.tourSpeed : 'normal',
    tourDuplicates: raw.tourDuplicates === 'include' ? 'include' : 'skip',
  };
}

function readLegacyLocalStorage(): Partial<GlobalAdminSettings> | null {
  try {
    if (localStorage.getItem(CACHE_KEY)) return null;
    const partial: Partial<GlobalAdminSettings> = {};
    let any = false;
    const pin = localStorage.getItem('sundial-admin-pin-limit');
    if (pin != null) {
      const n = parseInt(pin, 10);
      if (Number.isFinite(n)) {
        partial.pinLimit = n;
        any = true;
      }
    }
    const perf = localStorage.getItem('sundial-admin-show-perf');
    if (perf === '1' || perf === '0') {
      partial.showPerf = perf === '1';
      any = true;
    }
    const start = localStorage.getItem('sundial-admin-tour-start');
    if (start === 'earliest' || start === 'latest') {
      partial.tourStart = start;
      any = true;
    }
    const order = localStorage.getItem('sundial-admin-tour-order');
    if (order === 'random' || order === 'linear') {
      partial.tourOrder = order;
      any = true;
    }
    const shadow = localStorage.getItem('sundial-admin-tour-shadow');
    if (shadow === '0' || shadow === '1') {
      partial.tourShadow = shadow !== '0';
      any = true;
    }
    const length = localStorage.getItem('sundial-admin-tour-length');
    if (length != null) {
      const n = parseInt(length, 10);
      if (Number.isFinite(n)) {
        partial.tourLength = n;
        any = true;
      }
    }
    const speed = localStorage.getItem('sundial-admin-tour-speed');
    if (speed === 'slow' || speed === 'normal' || speed === 'fast') {
      partial.tourSpeed = speed;
      any = true;
    }
    const dup = localStorage.getItem('sundial-admin-tour-duplicates');
    if (dup === 'include' || dup === 'skip') {
      partial.tourDuplicates = dup;
      any = true;
    }
    return any ? partial : null;
  } catch {
    return null;
  }
}

function readLocalCache(): GlobalAdminSettings {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GlobalAdminSettings>;
      memoryCache = normalizeGlobalAdminSettings(parsed);
      return memoryCache;
    }
  } catch {
    /* ignore */
  }
  const legacy = readLegacyLocalStorage();
  memoryCache = normalizeGlobalAdminSettings(legacy ?? undefined);
  return memoryCache;
}

function writeLocalCache(settings: GlobalAdminSettings): void {
  memoryCache = settings;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/** Apply a partial update to the in-memory + localStorage cache (no network). */
export function applyLocalAdminSettings(partial: Partial<GlobalAdminSettings>): GlobalAdminSettings {
  const next = normalizeGlobalAdminSettings({ ...readLocalCache(), ...partial });
  writeLocalCache(next);
  return next;
}

export function getGlobalAdminSettings(): GlobalAdminSettings {
  return readLocalCache();
}

/** Fetch settings from the server and refresh the local cache. */
export async function loadGlobalAdminSettings(): Promise<GlobalAdminSettings> {
  try {
    const res = await fetch(SETTINGS_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`settings GET ${res.status}`);
    const json = await res.json();
    if (!json?.success || !json.settings) throw new Error(json?.error || 'Bad settings response');
    const next = normalizeGlobalAdminSettings(json.settings as Partial<GlobalAdminSettings>);
    writeLocalCache(next);
    return next;
  } catch {
    return readLocalCache();
  }
}

/**
 * Persist settings to the server (admin password required).
 * Updates local cache immediately; POSTs merge with current server state.
 */
export async function saveGlobalAdminSettings(
  partial: Partial<GlobalAdminSettings>,
  password: string = ADMIN_PASSWORD,
): Promise<GlobalAdminSettings> {
  const next = applyLocalAdminSettings(partial);

  const run = async () => {
    const res = await fetch(SETTINGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, settings: next }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`settings POST ${res.status}: ${text}`);
    }
    const json = await res.json();
    if (!json?.success) throw new Error(json?.error || 'Save failed');
    if (json.settings) {
      writeLocalCache(normalizeGlobalAdminSettings(json.settings as Partial<GlobalAdminSettings>));
    }
  };

  persistChain = persistChain.then(run, run);
  await persistChain;
  return readLocalCache();
}

/** Fire-and-forget save; errors are swallowed after local cache update. */
export function saveGlobalAdminSettingsBackground(partial: Partial<GlobalAdminSettings>): void {
  void saveGlobalAdminSettings(partial).catch(() => {
    /* local cache already updated */
  });
}

// --- Session unlock (never global) ---

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlockAdmin(password: string): boolean {
  if (password !== ADMIN_PASSWORD) return false;
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* ignore */
  }
  return true;
}

export function lockAdmin(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}

// --- Getters (from cache) ---

/** Admin override for the perf overlay: true | false | null (no override / client default). */
export function getAdminPerfOverride(): boolean | null {
  return readLocalCache().showPerf;
}

export function getAdminPinLimit(): number {
  return readLocalCache().pinLimit;
}

export function getTourStartMode(): TourStartMode {
  return readLocalCache().tourStart;
}

export function getTourOrderMode(): TourOrderMode {
  return readLocalCache().tourOrder;
}

/** Whether the location shadow should show while the World Tour loads dials. Default: show. */
export function getTourShadowVisible(): boolean {
  return readLocalCache().tourShadow;
}

export function getTourLength(): number {
  return readLocalCache().tourLength;
}

export function getTourSpeedMode(): TourSpeedMode {
  return readLocalCache().tourSpeed;
}

/** Skip = collapse contiguous same lat/lng runs only. Include = every print. Default: skip. */
export function getTourDuplicatesMode(): TourDuplicatesMode {
  return readLocalCache().tourDuplicates;
}

// --- Setters (cache + background POST for all users) ---

export function setAdminPerfOverride(on: boolean): void {
  saveGlobalAdminSettingsBackground({ showPerf: on });
}

export function setAdminPinLimit(limit: number): number {
  const n = clampPinLimit(limit);
  saveGlobalAdminSettingsBackground({ pinLimit: n });
  return n;
}

export function setTourStartMode(mode: TourStartMode): void {
  saveGlobalAdminSettingsBackground({ tourStart: mode });
}

export function setTourOrderMode(mode: TourOrderMode): void {
  saveGlobalAdminSettingsBackground({ tourOrder: mode });
}

export function setTourShadowVisible(show: boolean): void {
  saveGlobalAdminSettingsBackground({ tourShadow: show });
}

export function setTourLength(length: number): number {
  const n = clampTourLength(length);
  saveGlobalAdminSettingsBackground({ tourLength: n });
  return n;
}

export function setTourSpeedMode(mode: TourSpeedMode): void {
  saveGlobalAdminSettingsBackground({ tourSpeed: mode });
}

export function setTourDuplicatesMode(mode: TourDuplicatesMode): void {
  saveGlobalAdminSettingsBackground({ tourDuplicates: mode });
}
