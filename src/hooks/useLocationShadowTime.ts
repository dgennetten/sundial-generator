import { useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  formatLocationDateTime,
  getAnimatedLocationDateTime,
  getLocationDateTime,
  type LocationDateTime,
  type ShadowFrameUpdater,
} from '../utils/gnomonShadowUtils';

const ANIMATION_CYCLE_MS = 20_000; // full sweep per cycle — 50% faster than the original 30s
const STATIC_REFRESH_MS = 30_000;
const LABEL_THROTTLE_MS = 120;     // ~8 Hz label refresh while animating (the shadow itself is 60 fps)

function cycleProgress(elapsedMs: number): number {
  const wrapped = ((elapsedMs % ANIMATION_CYCLE_MS) + ANIMATION_CYCLE_MS) % ANIMATION_CYCLE_MS;
  return wrapped / ANIMATION_CYCLE_MS;
}

export interface LocationShadowTimeState {
  /** Time fed to SundialPreview. Stable while the animation plays (the anchor) so the dial is
      NOT re-rendered every frame; the moving shadow is driven imperatively instead. */
  dateTime: LocationDateTime;
  /** Human-readable date/time. Updates ~8×/s while animating (cheap — only label consumers). */
  dateTimeLabel: string;
}

/**
 * Drives the on-location shadow.
 *
 * Static (no animation): refreshes the current civil time every 30 s.
 *
 * Animating: a single requestAnimationFrame loop advances the sweep and, each frame, calls the
 * registered imperative shadow updaters (which rewrite the shadow path `d`s directly) rather
 * than pushing a new `dateTime` into React. `dateTime` is pinned to the anchor while playing, so
 * `SundialPreview` renders once and the per-frame cost is just geometry + a few DOM writes — the
 * full-dial reconciliation is out of the frame loop entirely. The label is throttled to ~8 Hz.
 * Pausing freezes the shadow at the current frame via one ordinary React render (full detail).
 */
export function useLocationShadowTime(
  enabled: boolean,
  animate: boolean,
  paused: boolean,
  animationMode: 'Day' | 'Hour',
  tzMeridian: number,
  useDST: boolean,
  lat: number,
  lng: number,
  startHour: number,
  stopHour: number,
  shadowUpdaters: MutableRefObject<Set<ShadowFrameUpdater>>,
  labelRef: MutableRefObject<HTMLInputElement | null>,
): LocationShadowTimeState {
  const [dateTime, setDateTime] = useState<LocationDateTime>(() =>
    getLocationDateTime(tzMeridian, useDST, lat, new Date(), lng),
  );
  const [label, setLabel] = useState<string>(() => formatLocationDateTime(dateTime));
  const progressRef = useRef(0);

  useLayoutEffect(() => {
    if (!enabled) return;

    // No animation: just track the wall clock.
    if (!animate) {
      progressRef.current = 0;
      const refresh = () => {
        const dt = getLocationDateTime(tzMeridian, useDST, lat, new Date(), lng);
        setDateTime(dt);
        setLabel(formatLocationDateTime(dt));
      };
      refresh();
      const id = window.setInterval(refresh, STATIC_REFRESH_MS);
      return () => window.clearInterval(id);
    }

    const anchor = getLocationDateTime(tzMeridian, useDST, lat, new Date(), lng);

    // Paused: render the frozen frame once through React (keeps full penumbra detail).
    if (paused) {
      const dt = getAnimatedLocationDateTime(animationMode, progressRef.current, anchor, startHour, stopHour);
      setDateTime(dt);
      setLabel(formatLocationDateTime(dt));
      return;
    }

    // Playing: pin the dial to the anchor (stable → no per-frame re-render) and drive BOTH the
    // shadow and the date/time label imperatively. Nothing calls setState per frame, so App
    // never re-renders during a steady sweep — commits/sec drops to ~0. The two one-off setState
    // calls below just align React's fallbacks (the frozen dial + the label's controlled value)
    // so a stray re-render doesn't flash a stale time; live values go straight to the DOM.
    const firstDt = getAnimatedLocationDateTime(animationMode, progressRef.current, anchor, startHour, stopHour);
    const emit = (dt: LocationDateTime) => shadowUpdaters.current.forEach((u) => u(dt));
    const writeLabel = (dt: LocationDateTime) => {
      const el = labelRef.current;
      if (el) el.value = formatLocationDateTime(dt);
    };
    setDateTime(anchor);
    setLabel(formatLocationDateTime(firstDt));
    emit(firstDt);
    writeLabel(firstDt);

    const start = performance.now() - progressRef.current * ANIMATION_CYCLE_MS;
    let frame = 0;
    let lastLabelAt = 0;
    const tick = (now: number) => {
      const progress = cycleProgress(now - start);
      progressRef.current = progress;
      const dt = getAnimatedLocationDateTime(animationMode, progress, anchor, startHour, stopHour);
      emit(dt);
      if (now - lastLabelAt >= LABEL_THROTTLE_MS) {
        lastLabelAt = now;
        writeLabel(dt);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, animate, paused, animationMode, tzMeridian, useDST, lat, lng, startHour, stopHour, shadowUpdaters, labelRef]);

  return { dateTime, dateTimeLabel: label };
}
