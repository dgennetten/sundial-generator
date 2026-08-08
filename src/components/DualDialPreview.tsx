// src/components/DualDialPreview.tsx
//
// Renders the two-page "Dual-Dial Pop-up" dial FACE: a folding greeting card
// (vertical center crease, landscape when unfolded) carrying two dials — a
// Summer dial filling the left half, a Winter dial filling the right half.
//
// Each half is a genuine horizontal dial computed for a half-sized page
// (H wide × W/2 tall) and then rotated 90° (left counter-clockwise, right
// clockwise). Because the child page IS the half (just transposed), rotating it
// fills the half exactly with NO scaling — so the projection stays valid (hour
// angles are never distorted). The gnomon is auto-sized to the half, so its
// height and the page-2 net agree. Numbers are left alone and rotate with the
// dial (each half reads upright when you turn the card that way). Gnomon
// position comes from the shared config so it moves both dials together.
//
// Both dials are emitted as <g> groups inside ONE <svg> (via SundialPreview's
// renderAsGroup mode) so the DOM-scraping export/print path reads a single SVG.

import React from 'react';
import { Sun, Minimize2, Maximize2 } from 'lucide-react';
import SundialPreview, { type Props as SundialProps } from './SundialPreview';
import { getAnalemmaPointsProjected } from '../utils/sundialMath';

interface DualDialPreviewProps {
  config: SundialProps;   // the shared previewConfig (gnomon auto-sized to the half)
  pageWidthMm: number;    // full (landscape) card width in mm
  pageHeightMm: number;   // full card height in mm
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const DualDialPreview: React.FC<DualDialPreviewProps> = ({
  config,
  pageWidthMm: W,
  pageHeightMm: H,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  // Each half is laid out on a page that, once rotated 90°, becomes the half:
  // pre-rotation width = H, height = W/2.
  const halfPreW = H;
  const halfPreH = W / 2;

  // Each dial is rendered at ~this fraction of the full-page dial's linear scale
  // (half-page auto-gnomon basis W/2 vs full-page basis H). Hour-label and
  // decoration text are scaled by it so they read equivalently smaller.
  const fontReduction = H > 0 ? W / (2 * H) : 1;

  // Auto vertical gnomon position: center the noon analemma within the half's
  // (pre-rotation) height, using the half-sized gnomon from the config. Both
  // halves share it, so the feet sit at matching, mirrored positions.
  const noonPoints = getAnalemmaPointsProjected({
    lat: config.lat,
    lng: config.lng,
    tzMeridian: config.tzMeridian,
    hour: 12,
    styleHeight: config.gnomonHeight,
    dialInclination: 0,
    dialDeclination: 0,
  });
  const ys = noonPoints.map(p => p.y);
  const centerY = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
  const autoVPos = Math.round(halfPreH / 2 - centerY);

  // Shared per-half overrides. A crosshair marks each gnomon foot for now (the
  // real dual-dial gnomon glyph is still deferred).
  const halfOverride: Partial<SundialProps> = {
    pageSize: 'Custom',
    // Force Portrait so SundialPreview uses these dimensions verbatim. Its page
    // logic swaps width/height for Landscape, which would corrupt the half page
    // (the card itself is Landscape, so the config would otherwise swap them).
    orientation: 'Portrait',
    customWidth: halfPreW,   // H  → becomes the half's height after the 90° turn
    customHeight: halfPreH,  // W/2 → becomes the half's width after the 90° turn
    dialInclination: 0,
    dialDeclination: 0,
    gnomonHorizontalPosition: undefined, // centered → feet mirror across the crease
    gnomonPosition: autoVPos,
    gnomonType: 'crosshair',
    // Scale text down to match the reduced dial size.
    fontSize: (config.fontSize ?? 20) * fontReduction,
    dialTextBlockFontSize: (config.dialTextBlockFontSize ?? 14) * fontReduction,
  };

  const leftConfig: SundialProps = { ...config, ...halfOverride, dateRange: 'SummerToFall' };
  const rightConfig: SundialProps = { ...config, ...halfOverride, dateRange: 'WinterToSpring' };

  // Parent owns the outer scaling; match SundialPreview's small-page upscaling.
  const minDim = Math.min(W, H);
  const parentSF = minDim > 0 && minDim < 200 ? 200 / minDim : 1;
  const Wv = W * parentSF;
  const Hv = H * parentSF;

  // Left rotates CCW, right CW (mirror). No scaling — the child page already has
  // the half's dimensions, so rotation alone fills the half without distortion.
  const leftPlacement = `translate(${-W / 4},0) rotate(-90)`;
  const rightPlacement = `translate(${W / 4},0) rotate(90)`;

  return (
    <div className="card" style={{ width: '100%', margin: 0 }}>
      <div className="card-header sundial-preview-header">
        <h3 className="card-title">
          <Sun color="#2563eb" size={20} style={{ marginRight: 6 }} /> Sundial Preview (Dual-Dial Pop-up)
        </h3>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="preview-fullscreen-btn"
            title={isFullscreen ? 'Exit fullscreen' : 'Expand preview'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}
      </div>
      <div
        className="sundial-preview-svg-host"
        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`-${Wv / 2} -${Hv / 2} ${Wv} ${Hv}`}
          style={{ display: 'block', border: '1px solid #ccc', background: 'transparent', width: '100%', height: '100%', objectFit: 'contain' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x={-Wv / 2}
            y={-Hv / 2}
            width={Wv}
            height={Hv}
            fill={config.showBackground ? config.backgroundColor : '#fff'}
          />
          <g transform={`scale(${parentSF})`}>
            <SundialPreview
              config={leftConfig}
              renderAsGroup
              idSuffix="L"
              placementTransform={leftPlacement}
            />
            <SundialPreview
              config={rightConfig}
              renderAsGroup
              idSuffix="R"
              placementTransform={rightPlacement}
            />
            {/* Center crease — valley fold */}
            <line x1={0} y1={-H / 2} x2={0} y2={H / 2} stroke="#999" strokeWidth={0.3} strokeDasharray="2,2" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default DualDialPreview;
