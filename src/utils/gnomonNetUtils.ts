// src/utils/gnomonNetUtils.ts
// Utilities for the cut-and-fold gnomon net page

import { NASS_LOGO_PATH, NASS_LOGO_HALF } from '../assets/nassLogoPath';

/**
 * Computes page-width and page-height in mm from page settings.
 */
export function computePageMM(
  pageSize: string,
  orientation: 'Landscape' | 'Portrait',
  customWidth?: number,
  customHeight?: number
): { pageWidthMm: number; pageHeightMm: number } {
  const pageSizeMap: Record<string, { width: number; height: number }> = {
    Letter:            { width: 215.9,  height: 279.4 },
    A4:                { width: 210,    height: 297 },
    '11x17':           { width: 279.4,  height: 431.8 },
    '10x15cm Postcard':{ width: 100,    height: 150 },
  };

  let w: number;
  let h: number;
  if (pageSize === 'Custom' && customWidth && customHeight) {
    w = customWidth;
    h = customHeight;
  } else {
    const ps = pageSizeMap[pageSize] || pageSizeMap.Letter;
    w = ps.width;
    h = ps.height;
  }

  if (orientation === 'Landscape') {
    [w, h] = [h, w];
  }
  return { pageWidthMm: w, pageHeightMm: h };
}

/**
 * Builds a complete gnomon net SVG as an XML string.
 *
 * Each net is a 3-triangle shape (scale = 1, physically accurate):
 *   Top triangle — isosceles right triangle, apex at top, hypotenuse at bottom.
 *     Vertical height = gnomonHeight (the physical standing gnomon height).
 *     Center vertical dashed fold line from apex to hypotenuse midpoint.
 *   Tab A (left) and Tab B (right) — fold-and-glue base tabs.
 *
 * Layout: up to three full-size copies when they fit (triad: two below, one
 * inverted above); scaled only as last resort.
 * Sundial directions are printed above the nets; gnomon directions alongside.
 *
 * @param gnomonHeight   physical standing height in mm — printed at actual size
 * @param pageWidth      page width in mm
 * @param pageHeight     page height in mm
 * @param showBackground fill page background
 * @param backgroundColor CSS color string
 * @param borderMarginMm border inset in mm (0 = none)
 */
export function buildGnomonNetSVGString(
  gnomonHeight: number,
  pageWidth: number,
  pageHeight: number,
  showBackground = false,
  backgroundColor = 'white',
  borderMarginMm = 0
): string {
  const gH = Math.max(5, gnomonHeight);
  const netW = 2 * gH;      // net width:  2 × gnomon height
  const netH = 1.5 * gH;   // net height: 1.5 × gnomon height

  const margin = Math.max(8, borderMarginMm + 4);
  const hgap   = 10;   // horizontal gap between two side-by-side nets
  const vgap   = 10;   // vertical gap between two stacked nets
  const triadRowGap = 2; // gap between inverted top net and bottom pair (shape-aware)
  const fmt    = (v: number) => (Math.round(v * 10) / 10).toString();

  // ── Sundial directions (printed above the nets) ───────────────────────────
  const sundialLines = [
    'Sundial face can be left flat, or, to create a popup greeting card,',
    'score and valley fold a vertical crease intersecting the gnomon',
    'point and the two tiny dots at the top and bottom border.',
  ];
  const sfs = 3.5;   // font size (mm)
  const slh = 5;     // line height (mm)

  // ── Gnomon directions (beside or below nets) ──────────────────────────────
  const gnomonLines = [
    'Cut gnomons along solid lines.',
    'Valley fold dashed lines.',
    'Align A→A, B→B and glue to dial.',
  ];
  const gfs = 5;
  const glh = 7;

  // ── Header height: title + subtitle + sundial instructions + gap ──────────
  //   margin+8 : title
  //   margin+14: gnomon height subtitle
  //   margin+18: sundial lines start
  //   margin+18 + n*slh : sundial lines end
  //   + 8 gap before nets
  const subtitleY = margin + 14;
  const sundialY0 = margin + 18;
  const headerH   = Math.ceil(18 + sundialLines.length * slh + 8);

  const availW = pageWidth  - 2 * margin;
  const availH = pageHeight - 2 * margin - headerH;

  // ── Layout: as many full-size copies as fit; never shrink unless required ─
  // Side-by-side is preferred over stacked. Scaling below 1.0 is only used when
  // even a single net cannot fit at actual size.
  type Copy = { ox: number; oy: number; scale: number; inverted?: boolean };
  let copies: Copy[] = [];
  let groupW = 0;
  let groupH = 0;

  const fitsSideBySide = (count: number, scale: number) => {
    const gaps = (count - 1) * hgap;
    return count * netW * scale + gaps <= availW && netH * scale <= availH;
  };

  const fitsStacked = (count: number, scale: number) =>
    netW * scale <= availW
    && count * netH * scale + (count - 1) * vgap <= availH;

  const fitsTriad = (scale: number) => {
    const bottomW = 2 * netW * scale + hgap;
    const totalH = 2 * gH * scale + triadRowGap;
    return bottomW <= availW && totalH <= availH;
  };

  const sideBySideCopies = (count: number, scale: number): Copy[] =>
    Array.from({ length: count }, (_, i) => ({
      ox: i * (netW * scale + hgap),
      oy: 0,
      scale,
    }));

  const stackedCopies = (count: number, scale: number): Copy[] =>
    Array.from({ length: count }, (_, i) => ({
      ox: 0,
      oy: i * (netH * scale + vgap),
      scale,
    }));

  const triadCopies = (scale: number): Copy[] => {
    const nw = netW * scale;
    const bottomW = 2 * nw + hgap;
    // Inverted net's hypotenuse sits at y = 0.5·gH; tuck bottom apexes just below it.
    const bottomOy = scale * 0.5 * gH + triadRowGap;
    return [
      { ox: 0, oy: bottomOy, scale, inverted: false },
      { ox: nw + hgap, oy: bottomOy, scale, inverted: false },
      { ox: (bottomW - nw) / 2, oy: 0, scale, inverted: true },
    ];
  };

  let placed = false;
  let bestCount = 0;
  let bestLayout: 'side' | 'stack' | 'triad' = 'side';

  if (fitsTriad(1)) {
    bestCount = 3;
    bestLayout = 'triad';
  }

  for (let count = 3; count >= 1; count--) {
    if (fitsSideBySide(count, 1) && count > bestCount) {
      bestCount = count;
      bestLayout = 'side';
      break;
    }
  }

  for (let count = 3; count >= 2; count--) {
    if (fitsStacked(count, 1) && count > bestCount) {
      bestCount = count;
      bestLayout = 'stack';
    }
  }

  if (bestCount > 0) {
    if (bestLayout === 'triad') {
      copies = triadCopies(1);
      groupW = 2 * netW + hgap;
      groupH = 2 * gH + triadRowGap;
    } else if (bestLayout === 'side') {
      copies = sideBySideCopies(bestCount, 1);
      groupW = bestCount * netW + (bestCount - 1) * hgap;
      groupH = netH;
    } else {
      copies = stackedCopies(bestCount, 1);
      groupW = netW;
      groupH = bestCount * netH + (bestCount - 1) * vgap;
    }
    placed = true;
  }

  if (!placed) {
    // Last resort: single copy scaled to fit
    const scale = Math.min(availW / netW, availH / netH, 1);
    groupW = netW * scale;
    groupH = netH * scale;
    copies = [{ ox: 0, oy: 0, scale }];
  }

  // Center the group in the available content area
  const pageOX = margin + (availW - groupW) / 2;
  const pageOY = margin + headerH + (availH - groupH) / 2;
  copies = copies.map(c => ({ ...c, ox: c.ox + pageOX, oy: c.oy + pageOY }));

  // ── Net shape elements in natural gH coordinates ──────────────────────────
  //   Top triangle:  apex(gH,0)  left(0,gH)  right(2gH,gH)
  //   Tab A:         (0,gH) (gH,gH) (gH/2, 1.5gH)
  //   Tab B:         (gH,gH) (2gH,gH) (1.5gH, 1.5gH)
  const labelSize = Math.max(3, Math.min(gH * 0.17, 11));
  const p = {
    apex:  [gH,       0        ],
    left:  [0,        gH       ],
    right: [2 * gH,  gH       ],
    midH:  [gH,      gH       ],
    aApex: [gH * 0.5, gH * 1.5],
    bApex: [gH * 1.5, gH * 1.5],
  };
  const aCx = (p.left[0] + p.midH[0] + p.aApex[0]) / 3;
  const aCy = (p.left[1] + p.midH[1] + p.aApex[1]) / 3;
  const bCx = (p.midH[0] + p.right[0] + p.bApex[0]) / 3;
  const bCy = (p.midH[1] + p.right[1] + p.bApex[1]) / 3;

  const netOutlineAndLabels = [
    `<path d="M ${p.apex[0]},${p.apex[1]}`
      + ` L ${p.right[0]},${p.right[1]}`
      + ` L ${p.bApex[0]},${p.bApex[1]}`
      + ` L ${p.midH[0]},${p.midH[1]}`
      + ` L ${p.aApex[0]},${p.aApex[1]}`
      + ` L ${p.left[0]},${p.left[1]} Z"`
      + ` stroke="black" stroke-width="0.5" fill="none"/>`,
    `<line x1="${p.left[0]}" y1="${p.left[1]}" x2="${p.right[0]}" y2="${p.right[1]}"`,
    `      stroke="#333" stroke-width="0.35" stroke-dasharray="2,2"/>`,
    `<line x1="${p.apex[0]}" y1="${p.apex[1]}" x2="${p.midH[0]}" y2="${p.midH[1]}"`,
    `      stroke="#333" stroke-width="0.35" stroke-dasharray="2,2"/>`,
    `<text x="${aCx - gH * 0.15}" y="${aCy}" font-size="${labelSize}" text-anchor="middle" dominant-baseline="middle"`,
    `      transform="rotate(45 ${aCx - gH * 0.15} ${aCy})" font-family="sans-serif" font-weight="bold" fill="none" stroke="lightgray" stroke-width="0.5">A</text>`,
    `<text x="${bCx + gH * 0.15}" y="${bCy}" font-size="${labelSize}" text-anchor="middle" dominant-baseline="middle"`,
    `      transform="rotate(-45 ${bCx + gH * 0.15} ${bCy})" font-family="sans-serif" font-weight="bold" fill="none" stroke="lightgray" stroke-width="0.5">B</text>`,
  ].join('\n      ');

  // ── NASS logo split across tabs A and B ───────────────────────────────────
  // Each tab gets the logo centered at the same point the compass rose used,
  // rotated ±45° so the logo's top points toward midH.
  // Clip paths crop each copy to its tab polygon; together they read as a split logo.
  // The logo's local "down" points along the cut edge toward the tab apex, so
  // its bottom sits just shy of the apex. Radius 0.29·gH (down from 0.35·gH)
  // keeps the logo inside the tab's hypotenuse; shifting the center toward the
  // apex by the radius reduction leaves the bottom point unchanged.
  const roseR0 = 0.35 * gH;
  const roseR  = 0.29 * gH;
  const apexShift = (roseR0 - roseR) / Math.SQRT2;
  const npScale = roseR / NASS_LOGO_HALF;

  // Centers offset toward each apex from the midpoint of the tab's inner
  // diagonal edge (t=0.5 along midH→apex).
  const roseCxA = gH * 3 / 4 - apexShift;
  const roseCyA = gH * 5 / 4 + apexShift;
  const roseXfA = `translate(${fmt(roseCxA)},${fmt(roseCyA)}) rotate(45) scale(${npScale.toFixed(7)}) translate(-${NASS_LOGO_HALF},-${NASS_LOGO_HALF})`;

  const roseCxB = gH * 5 / 4 + apexShift;
  const roseCyB = gH * 5 / 4 + apexShift;
  const roseXfB = `translate(${fmt(roseCxB)},${fmt(roseCyB)}) rotate(-45) scale(${npScale.toFixed(7)}) translate(-${NASS_LOGO_HALF},-${NASS_LOGO_HALF})`;
  const npPathsSVG = `<path d="${NASS_LOGO_PATH}" fill="black"/>`;

  const buildCopyTransform = ({ ox, oy, scale, inverted }: Copy): string => {
    const parts = [`translate(${fmt(ox)},${fmt(oy)})`];
    if (scale !== 1) parts.push(`scale(${scale})`);
    if (inverted) {
      parts.push(`translate(${fmt(gH)},${fmt(netH / 2)}) scale(1,-1) translate(${fmt(-gH)},${fmt(-netH / 2)})`);
    }
    return parts.join(' ');
  };

  // ── Render copies (per-copy defs for unique clip IDs) ─────────────────────
  const copiesSVG = copies
    .map((copy, idx) => {
      const xf = buildCopyTransform(copy);
      const clipA = `gn-tabA-${idx}`;
      const clipB = `gn-tabB-${idx}`;
      return `  <g transform="${xf}">
      <defs>
        <clipPath id="${clipA}">
          <polygon points="${p.left[0]},${p.left[1]} ${p.midH[0]},${p.midH[1]} ${p.aApex[0]},${p.aApex[1]}"/>
        </clipPath>
        <clipPath id="${clipB}">
          <polygon points="${p.midH[0]},${p.midH[1]} ${p.right[0]},${p.right[1]} ${p.bApex[0]},${p.bApex[1]}"/>
        </clipPath>
      </defs>
      ${netOutlineAndLabels}
      <g clip-path="url(#${clipA})"><g transform="${roseXfA}">${npPathsSVG}</g></g>
      <g clip-path="url(#${clipB})"><g transform="${roseXfB}">${npPathsSVG}</g></g>
  </g>`;
    })
    .join('\n');

  // ── Gnomon directions: right of group if room, else below ─────────────────
  const groupRight  = pageOX + groupW;
  const groupBottom = pageOY + groupH;
  const groupMidY   = (pageOY + groupBottom) / 2;
  const gInstrX     = groupRight + 8;
  const gInstrY0    = groupMidY - (gnomonLines.length * glh) / 2;

  const gnomonInstrSVG = gInstrX + 55 <= pageWidth - margin
    ? gnomonLines.map((line, i) =>
        `  <text x="${gInstrX}" y="${gInstrY0 + i * glh}" font-size="${gfs}" text-anchor="start" dominant-baseline="auto" font-family="sans-serif" fill="#222">${line}</text>`
      ).join('\n')
    : gnomonLines.map((line, i) =>
        `  <text x="${margin}" y="${groupBottom + 10 + i * glh}" font-size="${gfs}" text-anchor="start" dominant-baseline="auto" font-family="sans-serif" fill="#222">${line}</text>`
      ).join('\n');

  // ── Background and border ─────────────────────────────────────────────────
  const bgRect = showBackground
    ? `  <rect x="0" y="0" width="${pageWidth}" height="${pageHeight}" fill="${backgroundColor}"/>`
    : '';
  const borderRect = borderMarginMm > 0
    ? `  <rect x="${borderMarginMm}" y="${borderMarginMm}" width="${pageWidth - 2 * borderMarginMm}" height="${pageHeight - 2 * borderMarginMm}" fill="none" stroke="black" stroke-width="0.25"/>`
    : '';

  // ── Sundial directions SVG (centered above nets) ──────────────────────────
  const sundialInstrSVG = sundialLines.map((line, i) =>
    `  <text x="${pageWidth / 2}" y="${sundialY0 + i * slh}" font-size="${sfs}" text-anchor="middle" dominant-baseline="auto" font-family="sans-serif" fill="#333" font-style="italic">${line}</text>`
  ).join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 ${pageWidth} ${pageHeight}">`,
    bgRect,
    borderRect,
    `  <text x="${pageWidth / 2}" y="${margin + 8}" font-size="7" text-anchor="middle" font-family="sans-serif" font-weight="bold">Cut-and-Fold Gnomons</text>`,
    `  <text x="${pageWidth / 2}" y="${subtitleY}" font-size="3.5" text-anchor="middle" font-family="sans-serif" fill="#555">Gnomon height: ${fmt(gnomonHeight)} mm</text>`,
    sundialInstrSVG,
    copiesSVG,
    gnomonInstrSVG,
    `</svg>`,
  ].join('\n');
}
