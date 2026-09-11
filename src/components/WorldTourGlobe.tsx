import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { ChevronLeft, ChevronRight, Pause, Play, SkipForward, Square, X } from 'lucide-react';
import type { SundialPrint } from '../types/sundial';
import {
  getTourDuplicatesMode,
  getTourLength,
  getTourOrderMode,
  getTourSpeedMode,
  getTourStartMode,
  TOUR_SPEED_SCALE,
} from '../lib/adminPrefs';
import { buildWorldTourRoute, type TourStop } from '../utils/worldTourRoute';

const EARTH_IMG = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg';
const BUMP_IMG = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';
const SKY_IMG = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png';

const ALT_ORBIT = 2.15;
const ALT_CITY = 0.42;
const BASE_ROTATE_MS = 2800;
const BASE_ZOOM_IN_MS = 1600;
const BASE_HOLD_MS = 3200;
const BASE_ZOOM_OUT_MS = 1100;
const BASE_OPEN_MS = 900;
const BASE_QUICK_STEP_MS = 600;

export interface WorldTourGlobeProps {
  prints: SundialPrint[];
  onStopArrive: (print: SundialPrint) => void;
  onClose: () => void;
  maxStops?: number;
}

function sleep(ms: number, signal: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (signal.cancelled) {
        resolve();
        return;
      }
      if (performance.now() - start >= ms) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const WorldTourGlobe: React.FC<WorldTourGlobeProps> = ({
  prints,
  onStopArrive,
  onClose,
  maxStops: maxStopsProp,
}) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const signalRef = useRef({ cancelled: false });
  const pausedRef = useRef(false);
  const skipRef = useRef(false);
  const seekRef = useRef<number | null>(null);
  const quickLandRef = useRef(false);
  const runIdRef = useRef(0);

  const [size, setSize] = useState({ width: 640, height: 480 });
  const [ready, setReady] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [stopIndex, setStopIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'travel' | 'zoom' | 'hold' | 'zoomout' | 'done'>('idle');

  const tourStart = getTourStartMode();
  const tourOrder = getTourOrderMode();
  const tourDuplicates = getTourDuplicatesMode();
  const maxStops = maxStopsProp ?? getTourLength();
  const speedScale = TOUR_SPEED_SCALE[getTourSpeedMode()];
  const rotateMs = Math.round(BASE_ROTATE_MS * speedScale);
  const zoomInMs = Math.round(BASE_ZOOM_IN_MS * speedScale);
  const holdMs = Math.round(BASE_HOLD_MS * speedScale);
  const zoomOutMs = Math.round(BASE_ZOOM_OUT_MS * speedScale);
  const openMs = Math.round(BASE_OPEN_MS * speedScale);
  const quickStepMs = Math.round(BASE_QUICK_STEP_MS * speedScale);

  const route = useMemo(
    () => buildWorldTourRoute(prints, maxStops, {
      start: tourStart,
      order: tourOrder,
      duplicates: tourDuplicates,
    }),
    [prints, maxStops, tourStart, tourOrder, tourDuplicates],
  );
  const current = route[stopIndex] ?? null;

  const pointsData = useMemo(
    () =>
      route.map((stop, i) => ({
        ...stop,
        size: i === stopIndex ? 0.55 : 0.22,
        color: i === stopIndex ? '#ff6b35' : stop.isUS ? '#86efac' : '#38bdf8',
      })),
    [route, stopIndex],
  );

  // Arc only while flying in (travel/zoom); clear before hold so dial preview is unobstructed
  const arcsData = useMemo(() => {
    if (phase !== 'travel' && phase !== 'zoom') return [];
    if (stopIndex <= 0) return [];
    const from = route[stopIndex - 1];
    const to = route[stopIndex];
    if (!from || !to) return [];
    return [{
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
    }];
  }, [route, stopIndex, phase]);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(200, Math.floor(rect.width)),
        height: Math.max(200, Math.floor(rect.height)),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Disable user orbit while touring; slight atmosphere
  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;
  }, [ready]);

  const waitWhilePaused = useCallback(async (signal: { cancelled: boolean }) => {
    // A pending seek (single-step) must break the pause so the sequencer can act on it.
    while (pausedRef.current && !signal.cancelled && seekRef.current === null) {
      await sleep(100, signal);
    }
  }, []);

  const waitOrSkip = useCallback(async (ms: number, signal: { cancelled: boolean }) => {
    const chunk = 80;
    let elapsed = 0;
    while (elapsed < ms && !signal.cancelled && !skipRef.current && seekRef.current === null) {
      await waitWhilePaused(signal);
      if (signal.cancelled || skipRef.current || seekRef.current !== null) break;
      await sleep(Math.min(chunk, ms - elapsed), signal);
      elapsed += chunk;
    }
  }, [waitWhilePaused]);

  const flyTo = useCallback((stop: TourStop, altitude: number, ms: number) => {
    globeRef.current?.pointOfView(
      { lat: stop.lat, lng: stop.lng, altitude },
      ms,
    );
  }, []);

  // Keep latest arrive callback without restarting the tour
  const onStopArriveRef = useRef(onStopArrive);
  onStopArriveRef.current = onStopArrive;

  // Tour sequencer
  useEffect(() => {
    if (!ready || route.length === 0) return;

    const runId = ++runIdRef.current;
    const signal = { cancelled: false };
    signalRef.current = signal;
    skipRef.current = false;
    seekRef.current = null;
    quickLandRef.current = false;
    setPlaying(true);
    pausedRef.current = false;
    setStopIndex(0);
    setPhase('idle');

    const run = async () => {
      const first = route[0];
      flyTo(first, ALT_ORBIT, 0);
      await waitOrSkip(400, signal);

      let i = 0;
      while (i < route.length) {
        if (signal.cancelled || runId !== runIdRef.current) return;
        skipRef.current = false;
        seekRef.current = null;
        setStopIndex(i);
        const stop = route[i];
        // A single-step (while paused) requests a quick landing straight into hold,
        // skipping the travel/zoom animation and their pause-spins.
        const quick = quickLandRef.current;
        quickLandRef.current = false;

        if (!quick) {
          setPhase('travel');
          flyTo(stop, ALT_ORBIT, i === 0 ? openMs : rotateMs);
          await waitOrSkip(i === 0 ? openMs : rotateMs, signal);
          if (signal.cancelled || runId !== runIdRef.current) return;
          if (seekRef.current !== null) { i = seekRef.current; continue; }

          setPhase('zoom');
          flyTo(stop, ALT_CITY, zoomInMs);
          await waitOrSkip(zoomInMs, signal);
          if (signal.cancelled || runId !== runIdRef.current) return;
          if (seekRef.current !== null) { i = seekRef.current; continue; }
        } else {
          flyTo(stop, ALT_CITY, quickStepMs);
        }

        setPhase('hold');
        onStopArriveRef.current(stop.print);
        await waitOrSkip(holdMs, signal);
        if (signal.cancelled || runId !== runIdRef.current) return;
        if (seekRef.current !== null) { i = seekRef.current; continue; }

        if (i < route.length - 1) {
          setPhase('zoomout');
          flyTo(stop, ALT_ORBIT, zoomOutMs);
          await waitOrSkip(zoomOutMs, signal);
          if (signal.cancelled || runId !== runIdRef.current) return;
          if (seekRef.current !== null) { i = seekRef.current; continue; }
        }
        i++;
      }

      if (!signal.cancelled && runId === runIdRef.current) {
        setPhase('done');
        setPlaying(false);
      }
    };

    void run();

    return () => {
      signal.cancelled = true;
    };
  }, [ready, route, tourKey, flyTo, waitOrSkip, openMs, rotateMs, zoomInMs, holdMs, zoomOutMs, quickStepMs]);

  const handlePauseToggle = () => {
    if (phase === 'done') {
      setTourKey((k) => k + 1);
      return;
    }
    pausedRef.current = !pausedRef.current;
    setPlaying(!pausedRef.current);
  };

  const handleSkip = () => {
    skipRef.current = true;
  };

  // Single-step to an adjacent stop while paused: jump straight there and stay paused.
  const stepTo = (target: number) => {
    if (target < 0 || target >= route.length) return;
    quickLandRef.current = true;
    seekRef.current = target;
  };

  const paused = !playing && phase !== 'done';

  const handleStop = () => {
    signalRef.current.cancelled = true;
    onClose();
  };

  const nonUsCount = route.filter((s) => !s.isUS).length;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '520px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        background: '#020617',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl={EARTH_IMG}
          bumpImageUrl={BUMP_IMG}
          backgroundImageUrl={SKY_IMG}
          atmosphereColor="#93c5fd"
          atmosphereAltitude={0.18}
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.01}
          pointRadius="size"
          pointColor="color"
          pointsMerge={false}
          arcsData={arcsData}
          arcColor={() => ['#fdba74', '#fb923c']}
          arcStroke={0.6}
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={1500}
          arcAltitudeAutoScale={0.35}
          onGlobeReady={() => setReady(true)}
          animateIn={false}
        />
      </div>

      {/* Caption */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.82)',
            color: '#f8fafc',
            padding: '10px 14px',
            borderRadius: 8,
            maxWidth: '70%',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.04em', opacity: 0.75, marginBottom: 2 }}>
            {phase === 'done'
              ? 'Tour complete'
              : `Stop ${Math.min(stopIndex + 1, route.length)} / ${route.length}`}
            {phase === 'hold' ? ' · dial loaded in preview' : ''}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
            {current?.shortName ?? 'Preparing…'}
          </div>
        </div>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            color: '#cbd5e1',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          {nonUsCount} non-US · {route.length - nonUsCount} US
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: 6,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handlePauseToggle}
          title={phase === 'done' ? 'Replay' : playing ? 'Pause' : 'Resume'}
          style={{ padding: '6px 10px', background: 'rgba(248,250,252,0.92)' }}
        >
          {phase === 'done' ? <Play size={16} /> : playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        {phase !== 'done' && paused && (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => stepTo(stopIndex - 1)}
              disabled={stopIndex <= 0}
              title="Previous stop"
              style={{ padding: '6px 10px', background: 'rgba(248,250,252,0.92)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => stepTo(stopIndex + 1)}
              disabled={stopIndex >= route.length - 1}
              title="Next stop"
              style={{ padding: '6px 10px', background: 'rgba(248,250,252,0.92)' }}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
        {phase !== 'done' && !paused && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSkip}
            title="Skip to next"
            style={{ padding: '6px 10px', background: 'rgba(248,250,252,0.92)' }}
          >
            <SkipForward size={16} />
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleStop}
          title="End tour"
          style={{ padding: '6px 10px', background: 'rgba(248,250,252,0.92)' }}
        >
          {phase === 'done' ? <X size={16} /> : <Square size={16} />}
        </button>
      </div>
    </div>
  );
};

export default WorldTourGlobe;
