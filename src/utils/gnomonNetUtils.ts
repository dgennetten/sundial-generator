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
 * Layout: three copies when side-by-side (two below, one inverted above center),
 * or two stacked / one scaled on very small pages.
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
  const fmt    = (v: number) => (Math.round(v * 10) / 10).toString();

  // ── Sundial directions (printed above the nets) ───────────────────────────
  const sundialLines = [
    'Sundial face can be left flat, or, to create a popup greeting card,',
    'score and valley fold a vertical crease intersecting the gnomon',
    'point and the two tiny dots at the top and bottom border.',
  ];
  const sfs = 4.5;   // font size (mm)
  const slh = 6.5;   // line height (mm)

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
  //   margin+18: subtitle
  //   margin+28: sundial lines start
  //   margin+28 + n*slh : sundial lines end
  //   + 8 gap before nets
  const sundialY0 = margin + 28;
  const headerH   = Math.ceil(28 + sundialLines.length * slh + 8);

  const availW = pageWidth  - 2 * margin;
  const availH = pageHeight - 2 * margin - headerH;

  // ── Layout: 3 copies side-by-side when space allows ───────────────────────
  // Two nets on the bottom row; a third inverted copy centered above them.
  // Side-by-side is always preferred — stacked nets dominate portrait height.
  // Scale is computed so the pair fills the page width; capped at 1.0 so we
  // never enlarge beyond the physical gnomon size.
  type Copy = { ox: number; oy: number; scale: number; rotate180?: boolean };
  let copies: Copy[];
  let groupW: number;
  let groupH: number;

  // Third net sits one gnomon height above the bottom row → 2.5× gnomon height total.
  const trioHeight = 2.5 * gH;

  // Scale that makes two nets fill the available width exactly (max 1.0)
  const sbScale = Math.min((availW - hgap) / (4 * gH), availH / trioHeight, 1);

  if (sbScale >= 0.5) {
    // Two side-by-side on the bottom row, third inverted and centered above.
    const s   = sbScale;
    const sgH = gH * s;
    const rowDown = 0.75 * sgH;
    groupW = 4 * sgH + hgap;
    groupH = 2.5 * sgH;
    copies = [
      { ox: 0,              oy: rowDown,          scale: s },
      { ox: 2 * sgH + hgap, oy: rowDown,          scale: s },
      { ox: sgH + hgap / 2, oy: -sgH + rowDown,   scale: s, rotate180: true },
    ];
  } else if (netW <= availW && 2 * netH + vgap <= availH) {
    // Fall back to two stacked at scale = 1 (very small gnomon on tiny page)
    groupW = netW;
    groupH = 2 * netH + vgap;
    copies = [
      { ox: 0, oy: 0,            scale: 1 },
      { ox: 0, oy: netH + vgap,  scale: 1 },
    ];
  } else {
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

  // ── Render copies (per-copy defs for unique clip IDs) ─────────────────────
  const netCenterY = gH * 0.75;
  const copiesSVG = copies
    .map(({ ox, oy, scale, rotate180 }, idx) => {
      const rot = rotate180
        ? ` translate(${gH},${netCenterY}) rotate(180) translate(${-gH},${-netCenterY})`
        : '';
      const xf = scale !== 1
        ? `translate(${ox},${oy}) scale(${scale})${rot}`
        : `translate(${ox},${oy})${rot}`;
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

  // ── Gnomon directions: right of group if room, else left margin ───────────
  const groupRight = pageOX + groupW;
  const pageMidY   = pageHeight / 2 - 5;
  const gInstrY0   = pageMidY - (gnomonLines.length * glh) / 2;
  const gInstrX    = groupRight + 8;

  const gnomonInstrSVG = gInstrX + 55 <= pageWidth - margin
    ? gnomonLines.map((line, i) =>
        `  <text x="${gInstrX}" y="${gInstrY0 + i * glh}" font-size="${gfs}" text-anchor="start" dominant-baseline="auto" font-family="sans-serif" fill="#222">${line}</text>`
      ).join('\n')
    : gnomonLines.map((line, i) =>
        `  <text x="${margin}" y="${gInstrY0 + i * glh}" font-size="${gfs}" text-anchor="start" dominant-baseline="auto" font-family="sans-serif" fill="#222">${line}</text>`
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
    `  <text x="${pageWidth / 2}" y="${margin + 18}" font-size="4.5" text-anchor="middle" font-family="sans-serif" fill="#555">Gnomon height: ${fmt(gnomonHeight)} mm</text>`,
    sundialInstrSVG,
    copiesSVG,
    gnomonInstrSVG,
    `</svg>`,
  ].join('\n');
}
