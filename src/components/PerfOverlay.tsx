import React, { useEffect, useState } from 'react';
import { getRenderStats, type RenderStats } from '../lib/animationPerf';

interface PerfOverlayProps {
  /** True while the location-shadow animation is actively sweeping. */
  animating: boolean;
}

interface Display extends RenderStats {
  fps: number;
}

/**
 * Dev-only heads-up display for diagnosing preview animation smoothness.
 *
 *   FPS       — achieved frame rate (rAF cadence); drops when a long render blocks the main thread.
 *   commits/s — preview renders committed per second (from the React.Profiler).
 *   render    — mean / worst committed-render duration (ms). At 60 fps the frame budget is 16.7 ms.
 *
 * Reading it: during the shadow animation, if FPS is well under 60 AND render-avg is near/over
 * the frame budget, the bottleneck is reconciling the dial (~2,300 elements) every frame — the
 * case for animating the shadow imperatively instead of through a full React re-render.
 */
const PerfOverlay: React.FC<PerfOverlayProps> = ({ animating }) => {
  const [d, setD] = useState<Display>({ fps: 0, avg: 0, max: 0, count: 0 });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames++;
      const dt = now - last;
      if (dt >= 500) {
        setD({ fps: Math.round((frames * 1000) / dt), ...getRenderStats(1000) });
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (dismissed) return null;

  const fpsColor = d.fps >= 50 ? '#22c55e' : d.fps >= 30 ? '#f59e0b' : '#ef4444';
  const budget = 16.7;
  const renderColor = d.avg <= budget ? '#22c55e' : d.avg <= budget * 2 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        zIndex: 12000,
        background: 'rgba(17,24,39,0.88)',
        color: '#e5e7eb',
        font: '11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
        padding: '6px 9px',
        borderRadius: 6,
        pointerEvents: 'none',
        whiteSpace: 'pre',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        minWidth: 132,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ opacity: 0.7 }}>perf</span>
        <span style={{ color: animating ? '#38bdf8' : '#6b7280' }}>
          {animating ? '● animating' : '○ idle'}
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide performance overlay"
          title="Hide (reload with ?perf=1 to show again)"
          style={{
            pointerEvents: 'auto',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            font: 'inherit',
            fontSize: 13,
            lineHeight: 1,
            padding: '0 0 0 2px',
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ opacity: 0.7 }}>fps</span>
        <span style={{ color: fpsColor, fontWeight: 700 }}>{d.fps}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ opacity: 0.7 }}>commits/s</span>
        <span>{d.count}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ opacity: 0.7 }}>render ms</span>
        <span style={{ color: renderColor }}>
          {d.avg.toFixed(1)}<span style={{ opacity: 0.6 }}>/{d.max.toFixed(0)}</span>
        </span>
      </div>
    </div>
  );
};

export default PerfOverlay;
