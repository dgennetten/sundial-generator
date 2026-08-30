// Lightweight, dev-only performance sampling for the preview.
//
// The React.Profiler wrapping the preview reports how long each committed render
// (reconciliation + commit) took as `actualDuration`. During the location-shadow
// animation the preview re-renders every frame, so that number tells us whether the
// per-frame cost is dominated by reconciling the ~2,300 dial elements. We buffer the
// recent samples here and let PerfOverlay read a rolling summary; a separate rAF loop
// in the overlay measures the achieved frame rate (which drops when the main thread
// is blocked by a long render).

interface Sample { t: number; ms: number }

const samples: Sample[] = [];
const RETAIN_MS = 2000;

/** Record one committed preview-render duration (ms). Called from the Profiler onRender. */
export function recordRenderDuration(ms: number): void {
  const now = performance.now();
  samples.push({ t: now, ms });
  const cutoff = now - RETAIN_MS;
  while (samples.length && samples[0].t < cutoff) samples.shift();
}

export interface RenderStats {
  /** Mean committed-render duration over the window (ms). */
  avg: number;
  /** Worst committed-render duration over the window (ms). */
  max: number;
  /** Number of committed preview renders in the window (≈ commits/sec for a 1s window). */
  count: number;
}

export function getRenderStats(windowMs = 1000): RenderStats {
  const cutoff = performance.now() - windowMs;
  let sum = 0, max = 0, count = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].t < cutoff) break;
    sum += samples[i].ms;
    if (samples[i].ms > max) max = samples[i].ms;
    count++;
  }
  return { avg: count ? sum / count : 0, max, count };
}

/** Overlay is enabled in dev builds, or on any build when the URL carries ?perf=1. */
export function perfOverlayEnabled(): boolean {
  try {
    if (import.meta.env.DEV) return true;
    return new URLSearchParams(window.location.search).has('perf');
  } catch {
    return false;
  }
}
