// src/components/GnomonAssemblyGuide.tsx
// Animated "how to cut and fold" diagram for the popup-with-brace gnomon (Basic mode, step 6).
//
// Geometry mirrors GnomonSVG's 'popup-with-brace' drawing (gnomon height H = 100 units), but
// expressed in fold-friendly coordinates:
//   d = distance along the dashed fold edge (from the gnomon foot), p = perpendicular to it
//   (p < 0 is the triangle side). In GnomonSVG's x/y: d = -(x+y)/√2, p = (y-x)/√2.
// Solid red = cut, dashed red = fold, as printed on the dial.
import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

type P2 = [number, number];
type P3 = [number, number, number];

const ARC_STEPS = 16;
// Arc of radius 20 centred on the fold edge at d = 45 (GnomonSVG's rotated semicircle).
function arc(fromDeg: number, toDeg: number): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= ARC_STEPS; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / ARC_STEPS) * Math.PI) / 180;
    pts.push([45 + 20 * Math.cos(a), 20 * Math.sin(a)]);
  }
  return pts;
}

// Gnomon triangle, with the brace's nose cut out of its base as a notch.
const GNOMON: P2[] = [[0, 0], [25, 0], [45, -20], ...arc(-90, 0).slice(1), [100, 0], [0, -100]];
// Brace tab: hinged on the dashed line (25,0)–(25,25), straddling the fold edge. It is split
// along that edge (p = 0) into an outer and inner half: once the gnomon stands, each half lies
// wholly on one side of the gnomon's plane, which gives a correct back-to-front draw order.
const BRACE: P2[] = [[25, 25], [45, 20], ...arc(90, -90).slice(1), [25, 0]];
const BRACE_OUTER: P2[] = [[25, 25], [45, 20], ...arc(90, 0).slice(1), [25, 0]];
const BRACE_INNER: P2[] = [[25, 0], ...arc(0, -90)];
// Edges actually visible on each half (the shared p = 0 seam is not an edge).
const BRACE_OUTER_EDGE: P2[] = [[25, 0], [25, 25], [45, 20], ...arc(90, 0).slice(1)];
const BRACE_INNER_EDGE: P2[] = [...arc(0, -90), [25, 0]];
// The slit runs along the tab's centre line from its tip; raised, it lies in the gnomon's
// plane and slides onto the gnomon to lock it.
const SLIT: P2[] = [[56.25, 0], [65, 0]];

// ── Dial face around the gnomon ──────────────────────────────────────────────
// Measured from the rendered dial: the triangle's long edge (d - p = 100) runs parallel to the
// dial's nearest border, 0.394 H inside it, and the paper edge is the 6 mm margin (≈0.133 H)
// beyond that. Local frame for the face: s runs along the edge (s = 0 under the gnomon foot),
// t is the distance in from the dial border.
const BORDER_DMP = 100 + 39.4 * Math.SQRT2; // d - p on the dial's border line
const MARGIN = 13.3;
const fromEdge = (s: number, t: number): P2 => {
  const dmp = BORDER_DMP - Math.SQRT2 * t;
  const dpp = Math.SQRT2 * s;
  return [(dmp + dpp) / 2, (dpp - dmp) / 2];
};
const FACE_HALF_WIDTH = 165;
const FACE_DEPTH = 250; // how far the face is shown beyond the border: past the gnomon into the hour lines
// The straight paper edge, then a wavy line around the gnomon standing for the rest of the face.
const WAVY: P2[] = Array.from({ length: 73 }, (_, i) => {
  const th = (i / 72) * Math.PI;
  const k = 1 + 0.035 * Math.sin(9 * th);
  return fromEdge(FACE_HALF_WIDTH * Math.cos(th) * k, -MARGIN + (FACE_DEPTH + MARGIN) * Math.sin(th) * k);
});
const PAGE: P2[] = [fromEdge(-FACE_HALF_WIDTH, -MARGIN), fromEdge(FACE_HALF_WIDTH, -MARGIN), ...WAVY.slice(1, -1)];
const PAPER_EDGE: P2[] = [fromEdge(-FACE_HALF_WIDTH, -MARGIN), fromEdge(FACE_HALF_WIDTH, -MARGIN)];
const DIAL_BORDER: P2[] = [fromEdge(-FACE_HALF_WIDTH * 0.985, 0), fromEdge(FACE_HALF_WIDTH * 0.985, 0)];

// Sun for the last frame: on the border side of the dial (that is where the sun is when the
// shadow falls across the dial face), sweeping from morning through noon into the afternoon.
const OUT: P2 = [Math.SQRT1_2, -Math.SQRT1_2];  // horizontal, out across the border
const ALONG: P2 = [Math.SQRT1_2, Math.SQRT1_2]; // horizontal, along the border
function sunDirection(t: number): P3 {
  const hour = (-75 + 150 * t) * (Math.PI / 180);
  const alt = ((32 + 30 * Math.sin(Math.PI * t)) * Math.PI) / 180;
  const h = Math.cos(alt);
  return [
    h * (Math.cos(hour) * OUT[0] + Math.sin(hour) * ALONG[0]),
    h * (Math.cos(hour) * OUT[1] + Math.sin(hour) * ALONG[1]),
    Math.sin(alt),
  ];
}
const SUN_CENTER: P3 = [50, -50, 0];
const SUN_DISTANCE = 120;
const sunPoint = (s: P3): P3 => [SUN_CENTER[0] + s[0] * SUN_DISTANCE, SUN_CENTER[1] + s[1] * SUN_DISTANCE, s[2] * SUN_DISTANCE];

const CUTS: P2[][] = [
  [[0, 0], [0, -100], [100, 0]],                       // right edge + base
  [[56.25, 0], [66.67, 0]],                            // short slit on the fold edge
  [[25, 25], [45, 20], ...arc(90, -90), [25, 0]],      // brace outline
];
const FOLDS: P2[][] = [
  [[0, 0], [25, 0]],
  [[66.67, 0], [100, 0]],
  [[25, 0], [25, 25]],
];

// Degrees. At this angle the inner end of the slit (d = 56.25) just meets the notch's arc
// (radius 20 about d = 45), so the gnomon seats in the slit: cos θ = 976.6 / 1250.
const BRACE_ANGLE = (Math.acos(976.5625 / 1250) * 180) / Math.PI;

const FRAMES = [
  { title: 'Cut', caption: 'Cut along the solid red lines; Lightly score the dashed lines.' },
  { title: 'Fold up', caption: 'Fold the triangle straight up along its dashed edge so it stands at 90° to the page.' },
  { title: 'Brace', caption: 'Fold the rounded tab up along its dashed line until the slit in its tip slides onto the triangle’s notch, locking it upright.' },
  { title: 'Enjoy', caption: 'Lay the dial flat and level, turn its North Point arrow to true north, and read the time from the shadow.' },
];
const FRAME_MS = 3600;
// The sun's run through the day gets twice as long as the folding steps.
const frameMs = (frame: number) => (frame === 3 ? FRAME_MS * 2 : FRAME_MS);

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Viewed from the brace's side of the fold: the triangle rises behind the flat tab, so the tab
// visibly stays on the page while the triangle folds up.
const AZ = (158 * Math.PI) / 180;
const EL = (32 * Math.PI) / 180;
function project([u, w, z]: P3): P2 {
  const x = u * Math.cos(AZ) + w * Math.sin(AZ);
  const depth = -u * Math.sin(AZ) + w * Math.cos(AZ);
  return [x, -(z * Math.cos(EL) + depth * Math.sin(EL))];
}
const flat = ([d, p]: P2): P3 => [d, p, 0];
const lift = (deg: number) => ([d, p]: P2): P3 => {
  const a = (deg * Math.PI) / 180;
  return [d, p * Math.cos(a), -p * Math.sin(a)];
};
const raiseBrace = (deg: number) => ([d, p]: P2): P3 => {
  const a = (deg * Math.PI) / 180;
  return [25 + (d - 25) * Math.cos(a), p, (d - 25) * Math.sin(a)];
};
const toPath = (pts: P3[], close = true) =>
  pts.map((pt, i) => `${i ? 'L' : 'M'}${project(pt).map((n) => n.toFixed(2)).join(' ')}`).join('') + (close ? 'Z' : '');
// Shadow of a 3D point on the page for a sun in direction s (s[2] > 0).
const shadowOf = (s: P3) => ([u, w, z]: P3): P3 => [u - (z / s[2]) * s[0], w - (z / s[2]) * s[1], 0];

// Frame the face, the standing gnomon (its tall edge reaches z = 100) and the sun's path.
const VIEWBOX = (() => {
  const pts: P2[] = [
    ...PAGE.map((p) => project(flat(p))),
    project([0, 0, 100]),
    ...Array.from({ length: 21 }, (_, i) => project(sunPoint(sunDirection(i / 20)))),
  ];
  const pad = 9;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  return `${x0.toFixed(1)} ${y0.toFixed(1)} ${(Math.max(...xs) + pad - x0).toFixed(1)} ${(Math.max(...ys) + pad - y0).toFixed(1)}`;
})();

// Copy the live dial preview's hour lines, date lines and numbers onto the guide's face.
// Lying flat, the face is an affine image of the dial, so one SVG matrix places the copy:
// preview space → the gnomon's local frame (via its red outline) → (d, p) → projection.
interface DialSnapshot { html: string; matrix: string }
function snapshotDial(idPrefix: string): DialSnapshot | null {
  const root = document.querySelector<SVGSVGElement>('.sundial-preview-svg-host > svg');
  if (!root) return null;
  // The popup-with-brace's right edge is drawn from the gnomon foot (0,0) to (H/√2, −H/√2).
  const edge = Array.from(root.querySelectorAll<SVGLineElement>('line[stroke="red"]')).find((l) =>
    l.x1.baseVal.value === 0 && l.y1.baseVal.value === 0 && l.x2.baseVal.value > 0);
  const rootCtm = root.getScreenCTM();
  const edgeCtm = edge?.getScreenCTM();
  if (!edge || !rootCtm || !edgeCtm) return null;
  const s = edge.x2.baseVal.value; // H/√2 in the gnomon's local units
  const localToRoot = rootCtm.inverse().multiply(edgeCtm);
  // Local → (d, p): the fold-edge end (−s, −s) ↦ (100, 0), the right-edge end (s, −s) ↦ (0, −100).
  const k = 50 / s;
  const toDp = new DOMMatrix([-k, -k, -k, k, 0, 0]);
  const flatProjection = new DOMMatrix([
    Math.cos(AZ), Math.sin(AZ) * Math.sin(EL), Math.sin(AZ), -Math.cos(AZ) * Math.sin(EL), 0, 0,
  ]);
  const m = flatProjection.multiply(toDp).multiply(localToRoot.inverse());

  const copy = root.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll('[stroke="red"], .gnomon-location-shadow, .gnomon-height-guide-dots').forEach((el) => el.remove());
  const html = copy.innerHTML
    .replace(/\bid="([^"]+)"/g, `id="${idPrefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${idPrefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${idPrefix}$1"`);
  return { html, matrix: `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((n) => n.toFixed(5)).join(' ')})` };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props {
  /** Bump to restart the animation from the first frame (e.g. right after Print). */
  restartSignal?: number;
}

const GnomonAssemblyGuide: React.FC<Props> = ({ restartSignal }) => {
  const reduced = useRef(prefersReducedMotion());
  const [frame, setFrame] = useState(0);
  const [progress, setProgress] = useState(reduced.current ? 1 : 0);
  const [playing, setPlaying] = useState(!reduced.current);
  const startRef = useRef<number | null>(null);
  const uid = `ag${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [dial, setDial] = useState<DialSnapshot | null>(null);

  // Re-copy the dial at each step so it follows location / style / size changes. The short
  // delay lets the preview catch up first — on load, Basic mode's preset is still being
  // applied when this mounts, and copying immediately would show the pre-preset dial.
  useEffect(() => {
    const t = setTimeout(() => {
      setDial((prev) => {
        const next = snapshotDial(`${uid}-`);
        return next && prev && next.html === prev.html && next.matrix === prev.matrix ? prev : next;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [frame, restartSignal, uid]);

  useEffect(() => {
    if (!restartSignal) return;
    setFrame(0);
    setProgress(reduced.current ? 1 : 0);
    startRef.current = null;
    setPlaying(!reduced.current);
  }, [restartSignal]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (now: number) => {
      const ms = frameMs(frame);
      if (startRef.current === null) startRef.current = now - progress * ms;
      const t = (now - startRef.current) / ms;
      if (t >= 1 + 0.35 * FRAME_MS / ms) { // hold the finished frame briefly before moving on
        startRef.current = now;
        setProgress(0);
        setFrame((f) => (f + 1) % FRAMES.length);
      } else {
        setProgress(Math.min(1, t));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); startRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, frame]);

  const goTo = (f: number) => {
    setFrame((f + FRAMES.length) % FRAMES.length);
    setProgress(playing ? 0 : 1);
    startRef.current = null;
  };

  const e = ease(progress);
  const gnomonDeg = frame === 0 ? 0 : frame === 1 ? 90 * e : 90;
  const braceDeg = frame < 2 ? 0 : frame === 2 ? BRACE_ANGLE * e : BRACE_ANGLE;
  const cutReveal = frame === 0 ? e : 1;

  const gnomon3 = GNOMON.map(lift(gnomonDeg));
  const raise = raiseBrace(braceDeg);

  // Last frame: the sun runs morning → noon → afternoon and the triangle's shadow follows.
  // Linear in time (no easing) so the sun moves at a steady pace.
  let shadow: string | null = null;
  let sun: P2 | null = null;
  if (frame === 3) {
    const s = sunDirection(progress);
    shadow = toPath(gnomon3.map(shadowOf(s)));
    sun = project(sunPoint(s));
  }

  // Back-to-front. While the tab lies flat it is part of the page, which is always the farthest
  // surface (every view ray descends), so the rising triangle covers both halves wherever they
  // overlap — from this side of the fold it never does. Once the tab lifts, its outer half is
  // on the camera's side of the gnomon's plane and its inner half behind it.
  const outerHalf = (
    <g key="outer">
      <path d={toPath(BRACE_OUTER.map(raise))} fill="#fff3c4" />
      <path d={toPath(BRACE_OUTER_EDGE.map(raise), false)} fill="none" stroke="#8a7f5a" strokeWidth={0.6} strokeLinejoin="round" />
    </g>
  );
  const innerHalf = (
    <g key="inner">
      <path d={toPath(BRACE_INNER.map(raise))} fill="#fff3c4" />
      <path d={toPath(BRACE_INNER_EDGE.map(raise), false)} fill="none" stroke="#8a7f5a" strokeWidth={0.6} strokeLinejoin="round" />
    </g>
  );
  // The slit lies on the seam between the halves, in the gnomon's plane once the tab is up.
  // From this side it is the near half's edge, so it is drawn after everything it borders.
  const slit = gnomonDeg > 0 ? (
    <path key="slit" d={toPath(SLIT.map(raise), false)} fill="none" stroke="#5b4f2a" strokeWidth={0.9} strokeLinecap="round" />
  ) : null;
  const gnomonPiece = (
    <path key="gnomon" d={toPath(gnomon3)} fill="#fffbea" stroke="#8a7f5a" strokeWidth={0.6} strokeLinejoin="round" />
  );
  const pieces = braceDeg > 0 ? [innerHalf, gnomonPiece, outerHalf, slit] : [outerHalf, innerHalf, slit, gnomonPiece];

  const cutPaths = CUTS.map((c) => toPath(c.map(flat), false));
  const facePath = toPath(PAGE.map(flat));

  return (
    <div className="assembly-guide">
      <svg viewBox={VIEWBOX} className="assembly-guide-svg" role="img"
        aria-label={`Step ${frame + 1} of ${FRAMES.length}: ${FRAMES[frame].caption}`}>
        <defs>
          <clipPath id={`${uid}-face`}>
            <path d={facePath} />
          </clipPath>
        </defs>
        <path d={facePath} fill="#fff8dc" />
        {dial && (
          <g clipPath={`url(#${uid}-face)`} opacity={0.75}>
            <g className="assembly-guide-dial" transform={dial.matrix} dangerouslySetInnerHTML={{ __html: dial.html }} />
          </g>
        )}
        {/* The rest of the dial face continues past this wavy line */}
        <path d={toPath(WAVY.map(flat), false)} fill="none" stroke="#c9bf94" strokeWidth={0.6} strokeDasharray="2 1.6" />
        <path d={toPath(PAPER_EDGE.map(flat), false)} stroke="#8a7f5a" strokeWidth={0.8} />
        {!dial && <path d={toPath(DIAL_BORDER.map(flat), false)} stroke="#222" strokeWidth={0.5} />}
        {/* Openings left in the page once the pieces are folded up */}
        {gnomonDeg > 0 && <path d={toPath(GNOMON.map(flat))} fill="#e2d8ad" />}
        {braceDeg > 0 && <path d={toPath(BRACE.map(flat))} fill="#e2d8ad" />}
        {shadow && <path d={shadow} fill="rgba(60,50,20,0.28)" clipPath={`url(#${uid}-face)`} />}
        {pieces}
        {gnomonDeg === 0 && (
          <g fill="none" stroke="#dc2626" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
            {cutPaths.map((d, i) => (
              <path key={i} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - cutReveal} />
            ))}
            {FOLDS.map((f, i) => (
              <path key={i} d={toPath(f.map(flat), false)} strokeDasharray="2.5 2" strokeWidth={0.9} />
            ))}
          </g>
        )}
        {sun && (
          <g>
            <circle cx={sun[0]} cy={sun[1]} r={6} fill="#facc15" stroke="#eab308" strokeWidth={0.8} />
          </g>
        )}
      </svg>
      <div className="assembly-guide-caption">
        <strong>{frame + 1}. {FRAMES[frame].title}</strong> — {FRAMES[frame].caption}
      </div>
      <div className="assembly-guide-controls">
        <button type="button" className="assembly-guide-btn" onClick={() => goTo(frame - 1)} aria-label="Previous step">
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="assembly-guide-btn" onClick={() => { setPlaying((p) => !p); if (!playing && progress >= 1) goTo(frame + 1); }}
          aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button type="button" className="assembly-guide-btn" onClick={() => goTo(frame + 1)} aria-label="Next step">
          <ChevronRight size={16} />
        </button>
        <span className="assembly-guide-dots" aria-hidden="true">
          {FRAMES.map((f, i) => (
            <span key={f.title} className={`assembly-guide-dot${i === frame ? ' active' : ''}`} />
          ))}
        </span>
      </div>
    </div>
  );
};

export default GnomonAssemblyGuide;
