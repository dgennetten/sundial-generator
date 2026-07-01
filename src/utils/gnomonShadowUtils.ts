import {
  computeShadowPoint,
  degreesToRadians,
  getSolarPosition,
  radiansToDegrees,
} from './sundialMath';

/** Solar angular diameter ≈ 0.53° (32 arcminutes) as seen from Earth. */
export const SUN_ANGULAR_DIAMETER_DEG = 32 / 60;

/** Solar semi-diameter (angular radius): half the disc diameter (~16 arcminutes). */
export const SUN_ANGULAR_RADIUS_DEG = SUN_ANGULAR_DIAMETER_DEG / 2;

export const SHADOW_GRAY = 120;
export const SHADOW_TOTAL_ALPHA = 0.35;

/** Opacity per coverage count so 1+2+3 regions visually sum to SHADOW_TOTAL_ALPHA. */
export const SHADOW_ALPHA_BY_COVERAGE: Record<1 | 2 | 3, number> = {
  1: SHADOW_TOTAL_ALPHA / 3,
  2: (2 * SHADOW_TOTAL_ALPHA) / 3,
  3: SHADOW_TOTAL_ALPHA,
};

export function shadowFillForCoverage(coverage: 1 | 2 | 3): string {
  return `rgba(${SHADOW_GRAY}, ${SHADOW_GRAY}, ${SHADOW_GRAY}, ${SHADOW_ALPHA_BY_COVERAGE[coverage]})`;
}

/**
 * Per-layer opacity so three stacked layers (source-over on a light dial) match
 * SHADOW_TOTAL_ALPHA at full overlap.
 */
export const PENUMBRA_LAYER_OPACITY = (() => {
  const target = SHADOW_GRAY * SHADOW_TOTAL_ALPHA + 255 * (1 - SHADOW_TOTAL_ALPHA);
  const r = Math.cbrt((target - SHADOW_GRAY) / (255 - SHADOW_GRAY));
  return 1 - r;
})();

export function penumbraLayerFill(): string {
  return `rgba(${SHADOW_GRAY}, ${SHADOW_GRAY}, ${SHADOW_GRAY}, ${PENUMBRA_LAYER_OPACITY})`;
}

export interface LocationDateTime {
  year: number;
  month: number; // 0-based
  day: number;
  dayOfYear: number;
  hour: number;
}

export interface PopupTriangleVertices {
  tip: { x: number; y: number };
  left: { x: number; y: number };
  right: { x: number; y: number };
}

export function getPopupTriangleDialVertices(gnomonHeight: number): PopupTriangleVertices {
  const half = gnomonHeight / Math.SQRT2;
  return {
    tip: { x: 0, y: 0 },
    left: { x: -half, y: -half },
    right: { x: half, y: -half },
  };
}

function dayOfYearFromParts(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month, day);
  return Math.floor((current - start) / 86_400_000);
}

function monthDayFromDayOfYear(year: number, dayOfYear: number): { month: number; day: number } {
  const date = new Date(Date.UTC(year, 0, dayOfYear));
  return { month: date.getUTCMonth(), day: date.getUTCDate() };
}

function nthSundayOfMonth(year: number, month: number, n: number): number {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(year, month, d));
    if (dt.getUTCMonth() !== month) break;
    if (dt.getUTCDay() === 0) {
      count++;
      if (count === n) return d;
    }
  }
  return 1;
}

function lastSundayOfMonth(year: number, month: number): number {
  let last = 1;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(year, month, d));
    if (dt.getUTCMonth() !== month) break;
    if (dt.getUTCDay() === 0) last = d;
  }
  return last;
}

/** US/Canada: 2nd Sunday March – 1st Sunday November. */
function isNorthAmericanDST(year: number, month: number, day: number): boolean {
  const spring = nthSundayOfMonth(year, 2, 2);
  const fall = nthSundayOfMonth(year, 10, 1);
  if (month < 2 || month > 10) return false;
  if (month > 2 && month < 10) return true;
  if (month === 2) return day >= spring;
  return day < fall;
}

/** EU: last Sunday March – last Sunday October. */
function isEuropeanDST(year: number, month: number, day: number): boolean {
  const spring = lastSundayOfMonth(year, 2);
  const fall = lastSundayOfMonth(year, 9);
  if (month < 2 || month > 9) return false;
  if (month > 2 && month < 9) return true;
  if (month === 2) return day >= spring;
  return day < fall;
}

/** Australia: 1st Sunday October – 1st Sunday April. */
function isAustralianDST(year: number, month: number, day: number): boolean {
  const spring = nthSundayOfMonth(year, 9, 1);
  const fall = nthSundayOfMonth(year, 3, 1);
  if (month > 9 || (month === 9 && day >= spring)) return true;
  if (month < 3 || (month === 3 && day < fall)) return true;
  return false;
}

function isArizona(lat: number, lng: number): boolean {
  return lat >= 31 && lat <= 37.5 && lng >= -115.5 && lng <= -108.5;
}

/**
 * Whether civil daylight saving time is in effect for the location on a calendar date.
 * Uses regional Sunday-transition rules when longitude is available.
 */
export function isLocationInDST(date: Date, lat: number, lng = 0): boolean {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (lat < -10 && lng >= 110 && lng <= 180) {
    return isAustralianDST(year, month, day);
  }

  if (lng >= -170 && lng <= -50 && lat >= 10) {
    if (isArizona(lat, lng)) return false;
    return isNorthAmericanDST(year, month, day);
  }

  if (lng >= -25 && lng <= 45 && lat >= 33) {
    return isEuropeanDST(year, month, day);
  }

  if (lat >= 10) return isNorthAmericanDST(year, month, day);
  if (lat < -10) return isAustralianDST(year, month, day);
  return false;
}

/**
 * Convert civil clock time to standard time for getSolarPosition / hour lines.
 * Dial math uses tzMeridian (standard meridian); civil time includes DST when active.
 */
export function civilHourToStandardHour(
  civilHour: number,
  useDST: boolean,
  lat: number,
  date: Pick<LocationDateTime, 'year' | 'month' | 'day'>,
  lng = 0,
): number {
  if (!useDST) return civilHour;
  const probe = new Date(Date.UTC(date.year, date.month, date.day, 12));
  if (isLocationInDST(probe, lat, lng)) return civilHour - 1;
  return civilHour;
}

/** Civil date/time at the dial location (zone clock time, including DST when enabled). */
export function getLocationDateTime(
  tzMeridian: number,
  useDST: boolean,
  lat: number,
  now: Date = new Date(),
  lng = 0,
): LocationDateTime {
  const utcMs = now.getTime();
  let offsetHours = tzMeridian / 15;
  const stdLocalMs = utcMs + offsetHours * 3_600_000;
  if (useDST && isLocationInDST(new Date(stdLocalMs), lat, lng)) {
    offsetHours += 1;
  }
  const localMs = utcMs + offsetHours * 3_600_000;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const hour =
    local.getUTCHours() +
    local.getUTCMinutes() / 60 +
    local.getUTCSeconds() / 3600 +
    local.getUTCMilliseconds() / 3_600_000;
  return { year, month, day, dayOfYear: dayOfYearFromParts(year, month, day), hour };
}

export function formatLocationDateTime(dt: LocationDateTime): string {
  const date = new Date(Date.UTC(dt.year, dt.month, dt.day));
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const h24 = dt.hour;
  const h = Math.floor(h24);
  const m = Math.floor((h24 - h) * 60);
  const s = Math.floor(((h24 - h) * 60 - m) * 60);
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${dateStr} ${timeStr}`;
}

export function getPopupOrientation(
  lat: number,
  dialInclination: number,
): 'up' | 'down' {
  const isNorthern = lat >= 0;
  const polarAngle = Math.abs(lat);
  const pastPolar = dialInclination > polarAngle;
  const base: 'up' | 'down' = isNorthern ? 'down' : 'up';
  if (pastPolar) return base === 'down' ? 'up' : 'down';
  return base;
}

function flipY<T extends { x: number; y: number }>(p: T): T {
  return { ...p, y: -p.y };
}

function applyPopupOrientation(
  vertices: PopupTriangleVertices,
  orientation: 'up' | 'down',
): PopupTriangleVertices {
  if (orientation === 'down') return vertices;
  return {
    tip: flipY(vertices.tip),
    left: flipY(vertices.left),
    right: flipY(vertices.right),
  };
}

function apexShadowPoint(
  day: number,
  hour: number,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  altOffsetDeg: number,
  azOffsetDeg: number,
  useDST: boolean,
  date: Pick<LocationDateTime, 'year' | 'month' | 'day'>,
): { x: number; y: number } | null {
  const solarHour = civilHourToStandardHour(hour, useDST, lat, date, lng);
  const { altitude, azimuth } = getSolarPosition(day, lat, lng, tzMeridian, solarHour, undefined);
  const altDeg = radiansToDegrees(altitude) + altOffsetDeg;
  if (altDeg <= 0) return null;
  const azRad = azimuth + degreesToRadians(azOffsetDeg);
  return computeShadowPoint(
    degreesToRadians(altDeg),
    azRad,
    gnomonHeight,
    lat,
    dialInclination,
    dialDeclination,
  );
}

export interface ShadowPolygon {
  points: Array<{ x: number; y: number }>;
}

type Point2 = { x: number; y: number };

function cross2d(o: Point2, a: Point2, b: Point2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Convex hull (CCW) — used when only the outer envelope is needed. */
export function convexHull(points: Point2[]): Point2[] {
  if (points.length <= 1) return [...points];
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const lower: Point2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross2d(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross2d(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Rubber-band polygon around the popup triangle and shadow point.
 * Convex hull of all four points so every gnomon vertex lies on or inside the fill.
 */
export function rubberBandShadowPolygon(triangle: PopupTriangleVertices, shadow: Point2): Point2[] {
  const { tip, left, right } = triangle;
  return convexHull([shadow, tip, left, right]);
}

/** Fraction of solar-limb displacement for each stacked penumbra band (outer → inner). */
export const PENUMBRA_BAND_SCALES = [1, 2 / 3, 1 / 3] as const;

/**
 * Rubber-band hull expanded toward solar limb shadow points.
 * limbFraction interpolates each limb apex from the mean sun (0 = umbra, 1 = full limb envelope).
 */
export function penumbraEnvelopeHull(
  triangle: PopupTriangleVertices,
  meanApex: Point2,
  limbApexes: Point2[],
  limbFraction: number,
): Point2[] {
  const { tip, left, right } = triangle;
  const t = Math.max(0, Math.min(1, limbFraction));
  if (t <= 0 || limbApexes.length === 0) {
    return rubberBandShadowPolygon(triangle, meanApex);
  }
  const limbPoints = limbApexes.map((limb) => ({
    x: meanApex.x + t * (limb.x - meanApex.x),
    y: meanApex.y + t * (limb.y - meanApex.y),
  }));
  return convexHull([tip, left, right, meanApex, ...limbPoints]);
}

/** @deprecated Alias for penumbraEnvelopeHull. */
export function rubberBandPenumbraPolygon(
  triangle: PopupTriangleVertices,
  apex: Point2,
  limbApexes: Point2[],
  spreadScale: number,
): Point2[] {
  return penumbraEnvelopeHull(triangle, apex, limbApexes, spreadScale);
}

/**
 * Three penumbra layers: mean sun (true shadow) plus ±½ of the solar angular
 * diameter in altitude — i.e. each outer layer reaches one limb of the disc.
 */
export function penumbraLayerOffsets(): Array<{ altOffsetDeg: number; azOffsetDeg: number }> {
  const halfDiameter = SUN_ANGULAR_DIAMETER_DEG / 2;
  return [
    { altOffsetDeg: 0, azOffsetDeg: 0 },
    { altOffsetDeg: halfDiameter, azOffsetDeg: 0 },
    { altOffsetDeg: -halfDiameter, azOffsetDeg: 0 },
  ];
}

/** Eight samples around the solar disc (altitude/azimuth offsets). */
export function solarDiscLimbOffsets(): Array<{ altOffsetDeg: number; azOffsetDeg: number }> {
  const r = SUN_ANGULAR_RADIUS_DEG;
  const offsets: Array<{ altOffsetDeg: number; azOffsetDeg: number }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (2 * Math.PI * i) / 8;
    offsets.push({
      altOffsetDeg: r * Math.sin(angle),
      azOffsetDeg: r * Math.cos(angle),
    });
  }
  return offsets;
}

export interface ShadowGradientFrame {
  baseMid: Point2;
  apex: Point2;
  unitDir: Point2;
}

export interface GnomonShadowGeometry {
  softOutline: Point2[];
  penumbraBands: Point2[][];
  meanHull: Point2[];
  outerHull: Point2[];
  gradientFrame: ShadowGradientFrame;
  blurRadius: number;
}

const SOFT_OUTLINE_SAMPLES = 24;
const TIP_CAP_SUBDIVISIONS = 8;

function lerp2(a: Point2, b: Point2, t: number): Point2 {
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

function add2(a: Point2, b: Point2): Point2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale2(p: Point2, s: number): Point2 {
  return { x: p.x * s, y: p.y * s };
}

function normalize2(p: Point2): Point2 {
  const len = Math.hypot(p.x, p.y);
  if (len < 1e-9) return { x: 0, y: 1 };
  return { x: p.x / len, y: p.y / len };
}

interface ShadowContext {
  triangle: PopupTriangleVertices;
  date: Pick<LocationDateTime, 'year' | 'month' | 'day'>;
  dateTime: LocationDateTime;
  lat: number;
  lng: number;
  tzMeridian: number;
  gnomonHeight: number;
  dialInclination: number;
  dialDeclination: number;
  useDST: boolean;
}

function buildShadowContext(
  dateTime: LocationDateTime,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  useDST: boolean,
  originalLatitude?: number,
): ShadowContext {
  const orientation = getPopupOrientation(originalLatitude ?? lat, dialInclination);
  const triangle = applyPopupOrientation(getPopupTriangleDialVertices(gnomonHeight), orientation);
  return {
    triangle,
    date: { year: dateTime.year, month: dateTime.month, day: dateTime.day },
    dateTime,
    lat,
    lng,
    tzMeridian,
    gnomonHeight,
    dialInclination,
    dialDeclination,
    useDST,
  };
}

function meanApexForContext(ctx: ShadowContext): Point2 | null {
  return apexShadowPoint(
    ctx.dateTime.dayOfYear,
    ctx.dateTime.hour,
    ctx.lat,
    ctx.lng,
    ctx.tzMeridian,
    ctx.gnomonHeight,
    ctx.dialInclination,
    ctx.dialDeclination,
    0,
    0,
    ctx.useDST,
    ctx.date,
  );
}

function limbApexesForContext(ctx: ShadowContext): Point2[] {
  const apexes: Point2[] = [];
  for (const { altOffsetDeg, azOffsetDeg } of solarDiscLimbOffsets()) {
    const apex = apexShadowPoint(
      ctx.dateTime.dayOfYear,
      ctx.dateTime.hour,
      ctx.lat,
      ctx.lng,
      ctx.tzMeridian,
      ctx.gnomonHeight,
      ctx.dialInclination,
      ctx.dialDeclination,
      altOffsetDeg,
      azOffsetDeg,
      ctx.useDST,
      ctx.date,
    );
    if (apex) apexes.push(apex);
  }
  return apexes;
}

/** Base midpoint and unit vector from base toward mean shadow apex (for gradient masks). */
export function shadowGradientFrame(triangle: PopupTriangleVertices, meanApex: Point2): ShadowGradientFrame {
  const baseMid = {
    x: (triangle.left.x + triangle.right.x) / 2,
    y: (triangle.left.y + triangle.right.y) / 2,
  };
  const unitDir = normalize2({ x: meanApex.x - baseMid.x, y: meanApex.y - baseMid.y });
  return { baseMid, apex: meanApex, unitDir };
}

/** Gaussian blur radius (dial mm) scaled from shadow length and solar angular radius. */
export function computePenumbraBlurRadius(meanApex: Point2, spread?: PenumbraSpread): number {
  const shadowLen = Math.hypot(meanApex.x, meanApex.y);
  const minSpread = shadowLen * SUN_ANGULAR_RADIUS_DEG * (Math.PI / 180);
  const extent = spread?.total ?? minSpread;
  const blurMm = Math.max(extent * 2, minSpread * 1.4);
  return Math.min(Math.max(blurMm, 1.2), 14);
}

/** Penumbra spread at full gnomon height from solar limb apex positions. */
export interface PenumbraSpread {
  perpendicular: number;
  alongShadow: number;
  total: number;
}

/** Perpendicular and along-shadow penumbra extent at the tip from limb apexes. */
export function computePenumbraSpread(meanApex: Point2, limbApexes: Point2[]): PenumbraSpread {
  const shadowDir = normalize2(meanApex);
  const perp = { x: -shadowDir.y, y: shadowDir.x };
  let perpendicular = 0;
  let alongShadow = 0;
  let total = 0;
  for (const limb of limbApexes) {
    const dx = limb.x - meanApex.x;
    const dy = limb.y - meanApex.y;
    alongShadow = Math.max(alongShadow, Math.abs(dx * shadowDir.x + dy * shadowDir.y));
    perpendicular = Math.max(perpendicular, Math.abs(dx * perp.x + dy * perp.y));
    total = Math.max(total, Math.hypot(dx, dy));
  }
  const shadowLen = Math.hypot(meanApex.x, meanApex.y);
  const minSemiSpread = shadowLen * SUN_ANGULAR_RADIUS_DEG * (Math.PI / 180);
  return {
    perpendicular: Math.max(perpendicular, minSemiSpread),
    alongShadow: Math.max(alongShadow, minSemiSpread),
    total: Math.max(total, minSemiSpread * 2),
  };
}

/** @deprecated Use computePenumbraSpread */
export function computePenumbraHalfWidth(meanApex: Point2, limbApexes: Point2[]): number {
  return computePenumbraSpread(meanApex, limbApexes).perpendicular;
}

/** Mean-sun rubber-band hull (sharp umbra). */
export function computeMeanShadowPolygon(
  dateTime: LocationDateTime,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  useDST: boolean,
  originalLatitude?: number,
): Point2[] | null {
  const ctx = buildShadowContext(
    dateTime, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude,
  );
  const meanApex = meanApexForContext(ctx);
  if (!meanApex) return null;
  return rubberBandShadowPolygon(ctx.triangle, meanApex);
}

/** Convex hull of triangle, mean apex, and limb apexes (outer penumbra envelope). */
export function computeOuterPenumbraPolygon(
  dateTime: LocationDateTime,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  useDST: boolean,
  originalLatitude?: number,
): Point2[] | null {
  const ctx = buildShadowContext(
    dateTime, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude,
  );
  const meanApex = meanApexForContext(ctx);
  if (!meanApex) return null;
  const points: Point2[] = [
    ctx.triangle.tip,
    ctx.triangle.left,
    ctx.triangle.right,
    meanApex,
    ...limbApexesForContext(ctx),
  ];
  return convexHull(points);
}

/** Hull arc from start to end through intermediate tip-cap vertices (outer arc away from base). */
function hullArc(start: Point2, end: Point2, capPts: Point2[], baseMid: Point2): Point2[] {
  if (capPts.length === 0) return [end];
  const hull = convexHull([start, end, ...capPts]);
  const tol = 1e-6;
  const eq = (a: Point2, b: Point2) => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol;
  const startIdx = hull.findIndex((p) => eq(p, start));
  const endIdx = hull.findIndex((p) => eq(p, end));
  if (startIdx < 0 || endIdx < 0) return [end, ...capPts.filter((p) => !eq(p, start))];

  const n = hull.length;
  const extractArc = (from: number, to: number, step: number): Point2[] => {
    const arc: Point2[] = [];
    for (let i = from; ; i = (i + step + n) % n) {
      if (i === to) break;
      arc.push(hull[(i + step + n) % n]);
    }
    return arc;
  };

  const forward = extractArc(startIdx, endIdx, 1);
  const backward = extractArc(startIdx, endIdx, -1);

  const arcDist = (arc: Point2[]) => {
    if (arc.length === 0) return 0;
    const mid = arc[Math.floor(arc.length / 2)];
    return Math.hypot(mid.x - baseMid.x, mid.y - baseMid.y);
  };

  return arcDist(forward) >= arcDist(backward) ? forward : backward;
}

/** Densify a polyline chain for a smoother tip cap. */
function densifyChain(points: Point2[], subdivisions: number): Point2[] {
  if (points.length <= 1) return points;
  const dense: Point2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      dense.push(lerp2(a, b, t));
    }
  }
  dense.push(points[points.length - 1]);
  return dense;
}

/**
 * Soft penumbra outline: zero width at gnomon base, growing linearly toward the tip.
 * spreadScale multiplies the solar limb extent (0 = mean-sun rubber-band hull).
 */
export function computeSoftPenumbraOutline(
  dateTime: LocationDateTime,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  useDST: boolean,
  originalLatitude?: number,
  spreadScale = 1,
): Point2[] | null {
  const ctx = buildShadowContext(
    dateTime, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude,
  );
  return buildSoftPenumbraOutline(ctx, spreadScale);
}

export function computePenumbraBandOutlines(
  dateTime: LocationDateTime,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  useDST: boolean,
  originalLatitude?: number,
): Point2[][] | null {
  const ctx = buildShadowContext(
    dateTime, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude,
  );
  if (!meanApexForContext(ctx)) return null;
  return PENUMBRA_BAND_SCALES.map((scale) => buildSoftPenumbraOutline(ctx, scale));
}

function buildSoftPenumbraOutline(ctx: ShadowContext, spreadScale: number): Point2[] {
  const { triangle } = ctx;
  const meanApex = meanApexForContext(ctx)!;
  if (spreadScale <= 0) return rubberBandShadowPolygon(triangle, meanApex);

  const limbApexes = limbApexesForContext(ctx);
  const spread = computePenumbraSpread(meanApex, limbApexes);
  const scaledPerp = spread.perpendicular * spreadScale;
  const scaledAlong = spread.alongShadow * spreadScale;
  const shadowDir = normalize2({ x: meanApex.x - triangle.tip.x, y: meanApex.y - triangle.tip.y });
  const perp = { x: -shadowDir.y, y: shadowDir.x };

  const leftOuter: Point2[] = [];
  const rightOuter: Point2[] = [];
  for (let i = 0; i <= SOFT_OUTLINE_SAMPLES; i++) {
    const u = i / SOFT_OUTLINE_SAMPLES;
    const w = u * scaledPerp;
    const cLeft = add2(lerp2(triangle.left, triangle.tip, u), scale2(meanApex, u));
    const cRight = add2(lerp2(triangle.right, triangle.tip, u), scale2(meanApex, u));
    leftOuter.push(add2(cLeft, scale2(perp, w)));
    rightOuter.push(add2(cRight, scale2(perp, -w)));
  }

  const signedPerp = (p: Point2) => (p.x - meanApex.x) * perp.x + (p.y - meanApex.y) * perp.y;
  const signedAlong = (p: Point2) => (p.x - meanApex.x) * shadowDir.x + (p.y - meanApex.y) * shadowDir.y;

  let leftTip = add2(
    add2(lerp2(triangle.left, triangle.tip, 1), meanApex),
    add2(scale2(perp, scaledPerp), scale2(shadowDir, -scaledAlong)),
  );
  let rightTip = add2(
    add2(lerp2(triangle.right, triangle.tip, 1), meanApex),
    add2(scale2(perp, -scaledPerp), scale2(shadowDir, scaledAlong)),
  );
  for (const limb of limbApexes) {
    if (signedPerp(limb) > signedPerp(leftTip) || (signedPerp(limb) === signedPerp(leftTip) && signedAlong(limb) > signedAlong(leftTip))) {
      leftTip = limb;
    }
    if (signedPerp(limb) < signedPerp(rightTip) || (signedPerp(limb) === signedPerp(rightTip) && signedAlong(limb) > signedAlong(rightTip))) {
      rightTip = limb;
    }
  }
  leftOuter[leftOuter.length - 1] = leftTip;
  rightOuter[rightOuter.length - 1] = rightTip;

  const baseMid = {
    x: (triangle.left.x + triangle.right.x) / 2,
    y: (triangle.left.y + triangle.right.y) / 2,
  };
  const capHull = convexHull([leftTip, rightTip, meanApex, ...limbApexes]);
  const eqPt = (a: Point2, b: Point2) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
  const cap = densifyChain(
    hullArc(leftTip, rightTip, capHull.filter((p) => !eqPt(p, leftTip) && !eqPt(p, rightTip)), baseMid),
    TIP_CAP_SUBDIVISIONS,
  );

  const meanHull = rubberBandShadowPolygon(triangle, meanApex);
  const tipOnHull = meanHull.some(
    (p) => Math.abs(p.x - triangle.tip.x) < 1e-6 && Math.abs(p.y - triangle.tip.y) < 1e-6,
  );

  if (tipOnHull) {
    return [
      triangle.left,
      ...leftOuter.slice(1),
      ...cap,
      ...rightOuter.slice(0, -1).reverse(),
      triangle.tip,
    ];
  }

  return [
    triangle.left,
    ...leftOuter.slice(1),
    ...cap,
    ...rightOuter.slice(0, -1).reverse(),
    triangle.right,
  ];
}

/** Full shadow geometry for preview rendering. */
export function computeGnomonShadowGeometry(
  dateTime: LocationDateTime,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  useDST: boolean,
  originalLatitude?: number,
): GnomonShadowGeometry | null {
  const ctx = buildShadowContext(
    dateTime, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude,
  );
  const meanApex = meanApexForContext(ctx);
  if (!meanApex) return null;

  const limbApexes = limbApexesForContext(ctx);
  const spread = computePenumbraSpread(meanApex, limbApexes);
  const meanHull = rubberBandShadowPolygon(ctx.triangle, meanApex);
  const penumbraBands = PENUMBRA_BAND_SCALES.map((frac) =>
    penumbraEnvelopeHull(ctx.triangle, meanApex, limbApexes, frac),
  );
  const softOutline = penumbraBands[0];
  const outerHull = computeOuterPenumbraPolygon(
    dateTime, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude,
  );
  if (!softOutline || !outerHull) return null;

  return {
    softOutline,
    penumbraBands,
    meanHull,
    outerHull,
    gradientFrame: shadowGradientFrame(ctx.triangle, meanApex),
    blurRadius: computePenumbraBlurRadius(meanApex, spread),
  };
}

/**
 * @deprecated Use computeGnomonShadowGeometry or computeSoftPenumbraOutline.
 */
export function computePopupGnomonShadowPolygons(
  dateTime: LocationDateTime,
  lat: number,
  lng: number,
  tzMeridian: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  useDST: boolean,
  originalLatitude?: number,
): ShadowPolygon[] {
  const orientation = getPopupOrientation(originalLatitude ?? lat, dialInclination);
  const base = applyPopupOrientation(getPopupTriangleDialVertices(gnomonHeight), orientation);
  const limbOffsets = penumbraLayerOffsets();
  const polygons: ShadowPolygon[] = [];
  const date = { year: dateTime.year, month: dateTime.month, day: dateTime.day };

  for (const { altOffsetDeg, azOffsetDeg } of limbOffsets) {
    const apex = apexShadowPoint(
      dateTime.dayOfYear,
      dateTime.hour,
      lat,
      lng,
      tzMeridian,
      gnomonHeight,
      dialInclination,
      dialDeclination,
      altOffsetDeg,
      azOffsetDeg,
      useDST,
      date,
    );
    if (!apex) continue;
    polygons.push({ points: rubberBandShadowPolygon(base, apex) });
  }

  return polygons;
}

export function shadowPolygonsToSvgPoints(poly: ShadowPolygon | Point2[]): string {
  const points = Array.isArray(poly) ? poly : poly.points;
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

export function shadowPointsToSvgPath(points: Point2[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')} Z`;
}

/** Interpolate animation state: Day = hour sweep at current date; Hour = day sweep at current hour. */
export function getAnimatedLocationDateTime(
  mode: 'Day' | 'Hour',
  progress: number, // 0..1
  anchor: LocationDateTime,
  startHour: number,
  stopHour: number,
): LocationDateTime {
  // Forward-only sweep: play through the range and loop back to the start (no reverse).
  const t = Math.max(0, Math.min(1, progress));
  if (mode === 'Day') {
    const hour = startHour + t * (stopHour - startHour);
    return { ...anchor, hour };
  }
  const dayOfYear = 1 + Math.floor(t * 364.999);
  const { month, day } = monthDayFromDayOfYear(anchor.year, dayOfYear);
  return { ...anchor, dayOfYear, month, day };
}
