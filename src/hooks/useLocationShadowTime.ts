import { useLayoutEffect, useRef, useState } from 'react';
import {
  formatLocationDateTime,
  getAnimatedLocationDateTime,
  getLocationDateTime,
  type LocationDateTime,
} from '../utils/gnomonShadowUtils';

const ANIMATION_CYCLE_MS = 30_000;
const STATIC_REFRESH_MS = 30_000;

function cycleProgress(elapsedMs: number): number {
  const wrapped = ((elapsedMs % ANIMATION_CYCLE_MS) + ANIMATION_CYCLE_MS) % ANIMATION_CYCLE_MS;
  return wrapped / ANIMATION_CYCLE_MS;
}

export interface LocationShadowTimeState {
  dateTime: LocationDateTime;
  dateTimeLabel: string;
}

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
): LocationShadowTimeState {
  const [dateTime, setDateTime] = useState<LocationDateTime>(() =>
    getLocationDateTime(tzMeridian, useDST, lat, new Date(), lng),
  );
  const progressRef = useRef(0);

  useLayoutEffect(() => {
    if (!enabled) return;

    if (!animate) {
      progressRef.current = 0;
      const refresh = () => setDateTime(getLocationDateTime(tzMeridian, useDST, lat, new Date(), lng));
      refresh();
      const id = window.setInterval(refresh, STATIC_REFRESH_MS);
      return () => window.clearInterval(id);
    }

    const anchor = getLocationDateTime(tzMeridian, useDST, lat, new Date(), lng);

    const applyProgress = (progress: number) => {
      progressRef.current = progress;
      setDateTime(getAnimatedLocationDateTime(animationMode, progress, anchor, startHour, stopHour));
    };

    if (paused) {
      applyProgress(progressRef.current);
      return;
    }

    const start = performance.now() - progressRef.current * ANIMATION_CYCLE_MS;
    applyProgress(cycleProgress(performance.now() - start));

    let frame = 0;

    const tick = (now: number) => {
      applyProgress(cycleProgress(now - start));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, animate, paused, animationMode, tzMeridian, useDST, lat, lng, startHour, stopHour]);

  return {
    dateTime,
    dateTimeLabel: formatLocationDateTime(dateTime),
  };
}
