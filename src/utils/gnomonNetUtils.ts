// src/utils/gnomonNetUtils.ts
// Utilities for the cut-and-fold gnomon net page

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
  // Gnomon cutting/folding directions are appended to the end of this block.
  const sundialLines = [
    'Sundial face can be left flat, or, to create a popup greeting card,',
    'score and valley fold a vertical crease intersecting the gnomon',
    'point and the two tiny dots at the top and bottom border.',
    'Cut gnomons along solid lines.',
    'Valley fold dashed lines.',
    'Align A→A, B→B and glue to dial.',
  ];
  const sfs = 3.5;   // font size (mm)
  const slh = 5;     // line height (mm)

  // ── Header height: title + sundial/gnomon instructions + gap ──────────────
  //   margin+8 : title
  //   margin+14: instruction lines start
  //   margin+14 + n*slh : instruction lines end
  //   + 8 gap before nets
  //   (Gnomon-height subtitle is printed at the bottom of the page.)
  const subtitleY = pageHeight - margin;
  const sundialY0 = margin + 14;
  const headerH   = Math.ceil(14 + sundialLines.length * slh + 8);

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

  // ── Compass rose split across tabs A and B ────────────────────────────────
  // Each tab gets a rose centered at its centroid, rotated ±45° so N points toward midH.
  // Clip paths crop each rose to its tab polygon; together they read as a split rose.
  const roseR = 0.35 * gH;
  const npScale = roseR / 460.035;

  // Centers at midpoint of each tab's inner diagonal edge (t=0.5 along midH→apex).
  // Nudge each half one outline stroke-width horizontally away from the center fold.
  const splitNudge = 0.5;
  const roseCxA = gH * 3 / 4 - splitNudge;
  const roseCyA = gH * 5 / 4;
  const roseXfA = `translate(${fmt(roseCxA)},${fmt(roseCyA)}) rotate(45) scale(${npScale.toFixed(7)}) translate(-460.035,-600)`;

  const roseCxB = gH * 5 / 4 + splitNudge;
  const roseCyB = gH * 5 / 4;
  const roseXfB = `translate(${fmt(roseCxB)},${fmt(roseCyB)}) rotate(-45) scale(${npScale.toFixed(7)}) translate(-460.035,-600)`;
  // NorthPoint.svg paths (star + inner ring + quadrant arcs; N/S text omitted)
  const npPaths = [
    'M920.07,600l-365.24-59.95,88.65-123.49-123.49,88.65-59.95-365.24-59.95,365.24-123.49-88.65,88.65,123.49L0,600l365.24,59.95-88.65,123.49,123.49-88.65,59.95,365.24,59.95-365.24,123.49,88.65-88.65-123.49,365.24-59.95ZM460.04,668.63c-37.83,0-68.6-30.8-68.6-68.63s30.77-68.63,68.6-68.63,68.6,30.8,68.6,68.63-30.77,68.63-68.6,68.63ZM460.04,280.44v228.18c-13.91,0-27.08,3.1-38.88,8.67l38.88-236.86ZM140.47,600h228.21c0,13.91,3.1,27.08,8.67,38.88l-236.89-38.88ZM460.04,919.56v-228.18c13.91,0,27.08-3.1,38.88-8.67l-38.88,236.86ZM542.71,561.12l236.89,38.88h-228.21c0-13.91-3.1-27.08-8.67-38.88Z',
    'M460.04,552.22c-7.28,0-14.16,1.62-20.34,4.55-16.21,7.62-27.42,24.12-27.42,43.23,0,7.28,1.62,14.16,4.52,20.34,7.62,16.21,24.12,27.45,43.23,27.45,7.28,0,14.16-1.62,20.34-4.55,16.21-7.62,27.42-24.12,27.42-43.23,0-7.28-1.62-14.16-4.52-20.34-7.62-16.21-24.12-27.45-43.23-27.45Z',
    'M523.03,313.01c111.53,24.46,199.53,112.46,223.99,223.99l45.44,7.46c-23.55-141.43-135.46-253.34-276.89-276.89l7.46,45.44Z',
    'M173.05,537.01c24.46-111.53,112.46-199.53,223.99-223.99l7.46-45.44c-141.43,23.55-253.34,135.46-276.89,276.89l45.44-7.46Z',
    'M397.04,886.99c-111.53-24.46-199.53-112.46-223.99-223.99l-45.44-7.46c23.55,141.43,135.46,253.34,276.89,276.89l-7.46-45.44Z',
    'M747.02,662.99c-24.46,111.53-112.46,199.53-223.99,223.99l-7.46,45.44c141.43-23.55,253.34-135.46,276.89-276.89l-45.44,7.46Z',
  ];
  const npPathsSVG = npPaths.map(d => `<path d="${d}" fill="#2563eb"/>`).join('');

  const buildCopyTransform = ({ ox, oy, scale, inverted }: Copy): string => {
    const parts = [`translate(${fmt(ox)},${fmt(oy)})`];
    if (scale !== 1) parts.push(`scale(${scale})`);
    if (inverted) {
      // Rotate 180° about the net's center (scale(-1,-1)), NOT a vertical flip
      // (scale(1,-1)) — a pure vertical flip turns the net upside down but also
      // mirror-images it, reversing the split compass rose and A/B labels.
      parts.push(`translate(${fmt(gH)},${fmt(netH / 2)}) scale(-1,-1) translate(${fmt(-gH)},${fmt(-netH / 2)})`);
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
    sundialInstrSVG,
    copiesSVG,
    `  <text x="${pageWidth / 2}" y="${subtitleY}" font-size="3.5" text-anchor="middle" font-family="sans-serif" fill="#555">Gnomon height: ${fmt(gnomonHeight)} mm</text>`,
    `</svg>`,
  ].join('\n');
}

/**
 * Builds the Dual-Dial gnomon net SVG as an XML string.
 *
 * Each dual-dial gnomon is a square post (an uncapped cube). Its net is a
 * rectangular strip:
 *   height = cube side.
 *   width  = 4 × cube side (the four faces) + a glue tab.
 * Dashed valley-fold lines divide the four faces; the trailing glue tab closes
 * the tube. Card-attachment tabs are intentionally not part of this net yet.
 *
 * Two identical nets are printed one above the other — one gnomon per dial.
 *
 * The cube side equals `gnomonHeight`, which is already the half-sized dial's
 * gnomon (the dials are drawn natively for the half, so no further reduction is
 * needed — the physical cube matches the printed dial directly).
 *
 * @param gnomonHeight   dial gnomon height in mm (the half-sized cube side)
 * @param pageWidth      page width in mm
 * @param pageHeight     page height in mm
 * @param showBackground fill page background
 * @param backgroundColor CSS color string
 * @param borderMarginMm border inset in mm (0 = none)
 */
export function buildDualDialNetSVGString(
  gnomonHeight: number,
  pageWidth: number,
  pageHeight: number,
  showBackground = false,
  backgroundColor = 'white',
  borderMarginMm = 0
): string {
  const gH = Math.max(5, gnomonHeight);
  const tabW = Math.min(10, 0.5 * gH);   // glue tab: ~10 mm, capped for tiny gnomons
  const netW = 4 * gH + tabW;            // four cube faces + glue tab
  const netH = gH;                       // strip height = cube side

  const margin = Math.max(8, borderMarginMm + 4);
  const fmt    = (v: number) => (Math.round(v * 10) / 10).toString();

  // ── Instructions (printed above the nets) ─────────────────────────────────
  const sundialLines = [
    'One gnomon per dial. Cut around each solid outline.',
    'Valley fold the dashed lines into a square tube (open top and bottom).',
    'Overlap and glue the GLUE tab inside the opposite edge to close the tube.',
  ];
  const sfs = 3.5;   // font size (mm)
  const slh = 5;     // line height (mm)

  const subtitleY = pageHeight - margin;
  const sundialY0 = margin + 14;
  const headerH   = Math.ceil(14 + sundialLines.length * slh + 8);

  const availW = pageWidth  - 2 * margin;
  const availH = pageHeight - 2 * margin - headerH;

  // Two identical strips, stacked one above the other.
  const copies = 2;
  const vgap   = Math.max(12, gH);       // gap between the stacked strips
  const groupW = netW;
  const groupH = copies * netH + (copies - 1) * vgap;
  const scale  = Math.min(availW / groupW, availH / groupH, 1);
  const sW = groupW * scale;
  const sH = groupH * scale;
  const pageOX = margin + (availW - sW) / 2;
  const pageOY = margin + headerH + (availH - sH) / 2;

  const labelSize = Math.max(3, Math.min(gH * 0.17, 11));

  // ── Net elements in natural gH coordinates (origin = strip top-left) ───────
  const foldXs = [gH, 2 * gH, 3 * gH, 4 * gH];
  const foldLines = foldXs.map(x =>
    `<line x1="${fmt(x)}" y1="0" x2="${fmt(x)}" y2="${fmt(netH)}" stroke="#333" stroke-width="0.35" stroke-dasharray="2,2"/>`
  ).join('\n        ');

  // Faint face labels (1–4) centered in each panel; meaning of each face is
  // deferred, so these are neutral placeholders in the same outline style as
  // the triangular net's A/B labels.
  const faceLabels = [0, 1, 2, 3].map(i => {
    const cx = (i + 0.5) * gH;
    return `<text x="${fmt(cx)}" y="${fmt(netH / 2)}" font-size="${labelSize}" text-anchor="middle" dominant-baseline="middle"`
      + ` font-family="sans-serif" font-weight="bold" fill="none" stroke="lightgray" stroke-width="0.5">${i + 1}</text>`;
  }).join('\n        ');

  // GLUE tab label — rotated 90° so it reads within the narrow tab.
  const tabCx = 4 * gH + tabW / 2;
  const tabLabel =
    `<text x="${fmt(tabCx)}" y="${fmt(netH / 2)}" font-size="${fmt(Math.min(labelSize, tabW * 0.5))}" text-anchor="middle" dominant-baseline="middle"`
    + ` transform="rotate(-90 ${fmt(tabCx)} ${fmt(netH / 2)})" font-family="sans-serif" fill="none" stroke="lightgray" stroke-width="0.4">GLUE</text>`;

  const stripElements = [
    `<path d="M 0,0 L ${fmt(netW)},0 L ${fmt(netW)},${fmt(netH)} L 0,${fmt(netH)} Z"`
      + ` stroke="black" stroke-width="0.5" fill="none"/>`,
    foldLines,
    faceLabels,
    tabLabel,
  ].join('\n        ');

  const copiesSVG = Array.from({ length: copies }, (_, i) =>
    `    <g transform="translate(0,${fmt(i * (netH + vgap))})">
        ${stripElements}
    </g>`
  ).join('\n');

  const stripSVG =
    `  <g transform="translate(${fmt(pageOX)},${fmt(pageOY)})${scale !== 1 ? ` scale(${scale})` : ''}">
${copiesSVG}
  </g>`;

  // ── Background and border ─────────────────────────────────────────────────
  const bgRect = showBackground
    ? `  <rect x="0" y="0" width="${pageWidth}" height="${pageHeight}" fill="${backgroundColor}"/>`
    : '';
  const borderRect = borderMarginMm > 0
    ? `  <rect x="${borderMarginMm}" y="${borderMarginMm}" width="${pageWidth - 2 * borderMarginMm}" height="${pageHeight - 2 * borderMarginMm}" fill="none" stroke="black" stroke-width="0.25"/>`
    : '';

  const sundialInstrSVG = sundialLines.map((line, i) =>
    `  <text x="${pageWidth / 2}" y="${sundialY0 + i * slh}" font-size="${sfs}" text-anchor="middle" dominant-baseline="auto" font-family="sans-serif" fill="#333" font-style="italic">${line}</text>`
  ).join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 ${pageWidth} ${pageHeight}">`,
    bgRect,
    borderRect,
    `  <text x="${pageWidth / 2}" y="${margin + 8}" font-size="7" text-anchor="middle" font-family="sans-serif" font-weight="bold">Cut-and-Fold Gnomons (Dual Dial)</text>`,
    sundialInstrSVG,
    stripSVG,
    `  <text x="${pageWidth / 2}" y="${subtitleY}" font-size="3.5" text-anchor="middle" font-family="sans-serif" fill="#555">Gnomon height: ${fmt(gH)} mm</text>`,
    `</svg>`,
  ].join('\n');
}
