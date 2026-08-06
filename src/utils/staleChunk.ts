// src/utils/staleChunk.ts
import { log } from './logger';

/**
 * Detects the "stale chunk" error that occurs when a user has the app open
 * across a new deploy: code split into hashed chunks (export libraries, the
 * photo gallery, etc.) is lazy-loaded via dynamic import() only when needed,
 * and by then the old hashed chunk file has been replaced on the server, so
 * the fetch 404s.
 */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

// Guards against a reload loop if the fetch keeps failing for some other reason.
const RELOAD_GUARD_KEY = 'sundial-chunk-reload';

/**
 * When a stale-chunk error is detected, reload the page once so the browser
 * pulls the current index.html (and its up-to-date chunk hashes). Returns true
 * if a reload was triggered, false if we've already tried reloading this session.
 */
export function recoverFromStaleChunk(notify?: () => void): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) {
      return false; // Already reloaded once this session — don't loop.
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — fall through to reload anyway.
  }
  log.warn('Lazy chunk is stale (app updated since page load); reloading to update…');
  notify?.();
  window.location.reload();
  return true;
}
