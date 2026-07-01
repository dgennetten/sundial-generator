import { describe, expect, it } from 'vitest';
import {
  computeGnomonShadowGeometry,
  computeMeanShadowPolygon,
  computeOuterPenumbraPolygon,
  computePenumbraHalfWidth,
  computePenumbraSpread,
  computePopupGnomonShadowPolygons,
  computeSoftPenumbraOutline,
  convexHull,
  civilHourToStandardHour,
  getLocationDateTime,
  isLocationInDST,
  getAnimatedLocationDateTime,
  PENUMBRA_LAYER_OPACITY,
  penumbraLayerFill,
  penumbraLayerOffsets,
  rubberBandShadowPolygon,
  penumbraEnvelopeHull,
  rubberBandPenumbraPolygon,
  solarDiscLimbOffsets,
  shadowGradientFrame,
  SHADOW_ALPHA_BY_COVERAGE,
  SHADOW_TOTAL_ALPHA,
  SUN_ANGULAR_DIAMETER_DEG,
  SUN_ANGULAR_RADIUS_DEG,
} from '../utils/gnomonShadowUtils';

const FORT_COLLINS = {
  lat: 40.5853,
  lng: -105.0844,
  tz: -105,
  useDST: true,
  dialInclination: 0,
  dialDeclination: 0,
};

const SUMMER_MORNING = { year: 2026, month: 6, day: 1, dayOfYear: 183, hour: 7 };

function shadowArgs(dateTime = SUMMER_MORNING, gnomonHeight = 10) {
  return [
    dateTime,
    FORT_COLLINS.lat,
    FORT_COLLINS.lng,
    FORT_COLLINS.tz,
    gnomonHeight,
    FORT_COLLINS.dialInclination,
    FORT_COLLINS.dialDeclination,
    FORT_COLLINS.useDST,
  ] as const;
}

describe('getAnimatedLocationDateTime', () => {
  const anchor = { year: 2026, month: 5, day: 15, dayOfYear: 166, hour: 14 };

  it('sweeps hours forward only for Day mode (no reverse)', () => {
    const start = getAnimatedLocationDateTime('Day', 0, anchor, 4, 20);
    const mid = getAnimatedLocationDateTime('Day', 0.5, anchor, 4, 20);
    const end = getAnimatedLocationDateTime('Day', 1, anchor, 4, 20);
    expect(start.hour).toBeCloseTo(4, 5);
    expect(mid.hour).toBeCloseTo(12, 5);
    expect(end.hour).toBeCloseTo(20, 5);
  });

  it('sweeps days through the year for Hour mode', () => {
    const anchor = { year: 2026, month: 5, day: 15, dayOfYear: 166, hour: 12 };
    const winter = getAnimatedLocationDateTime('Hour', 0, anchor, 4, 20);
    const summer = getAnimatedLocationDateTime('Hour', 0.5, anchor, 4, 20);
    expect(winter.month).toBe(0);
    expect(winter.day).toBe(1);
    expect(summer.month).toBeGreaterThanOrEqual(5);
  });

  it('sweeps days forward only for Hour mode (no reverse)', () => {
    const start = getAnimatedLocationDateTime('Hour', 0, anchor, 4, 20);
    const end = getAnimatedLocationDateTime('Hour', 1, anchor, 4, 20);
    expect(start.dayOfYear).toBe(1);
    expect(end.dayOfYear).toBe(365);
  });
});

describe('isLocationInDST', () => {
  const fortCollinsLng = -105.0844;
  const fortCollinsLat = 40.5853;

  it('uses US Sunday transitions in 2026 (Fort Collins)', () => {
    expect(isLocationInDST(new Date(Date.UTC(2026, 2, 7, 12)), fortCollinsLat, fortCollinsLng)).toBe(false);
    expect(isLocationInDST(new Date(Date.UTC(2026, 2, 8, 12)), fortCollinsLat, fortCollinsLng)).toBe(true);
    expect(isLocationInDST(new Date(Date.UTC(2026, 9, 31, 12)), fortCollinsLat, fortCollinsLng)).toBe(true);
    expect(isLocationInDST(new Date(Date.UTC(2026, 10, 1, 12)), fortCollinsLat, fortCollinsLng)).toBe(false);
  });

  it('shifts solar hour at spring DST for Hour animation dates', () => {
    const winterStd = civilHourToStandardHour(12, true, fortCollinsLat, { year: 2026, month: 2, day: 7 }, fortCollinsLng);
    const summerStd = civilHourToStandardHour(12, true, fortCollinsLat, { year: 2026, month: 6, day: 1 }, fortCollinsLng);
    expect(winterStd).toBe(12);
    expect(summerStd).toBe(11);
  });

  it('does not apply DST in Arizona', () => {
    expect(isLocationInDST(new Date(Date.UTC(2026, 6, 1, 12)), 32.22, -110.97)).toBe(false);
  });
});

describe('getLocationDateTime', () => {
  it('returns Fort Collins Mountain Daylight civil time', () => {
    const now = new Date(Date.UTC(2026, 6, 1, 13, 0, 0));
    const dt = getLocationDateTime(-105, true, 40.5853, now, -105.0844);
    expect(dt.hour).toBeCloseTo(7, 5);
    expect(dt.month).toBe(6);
    expect(dt.day).toBe(1);
  });

  it('returns Fort Collins Mountain Standard civil time in winter', () => {
    const now = new Date(Date.UTC(2026, 0, 15, 20, 0, 0));
    const dt = getLocationDateTime(-105, true, 40.5853, now, -105.0844);
    expect(dt.hour).toBeCloseTo(13, 5);
  });

  it('does not depend on browser timezone', () => {
    const now = new Date(Date.UTC(2026, 6, 1, 13, 0, 0));
    const dt = getLocationDateTime(-105, true, 40.5853, now, -105.0844);
    expect(dt.hour).toBeCloseTo(7, 5);
  });

  it('converts MDT civil hour to standard hour for solar math', () => {
    const std = civilHourToStandardHour(7, true, 40.5853, { year: 2026, month: 6, day: 1 }, -105.0844);
    expect(std).toBe(6);
  });
});

describe('rubberBandShadowPolygon', () => {
  const triangle = {
    tip: { x: 0, y: 0 },
    left: { x: -5, y: -5 },
    right: { x: 5, y: -5 },
  };

  it('at noon hulls shadow with the base corners (tip inside)', () => {
    const shadow = { x: 0, y: 30 };
    const poly = rubberBandShadowPolygon(triangle, shadow);
    expect(poly).toHaveLength(3);
    expect(poly).toContainEqual(triangle.left);
    expect(poly).toContainEqual(triangle.right);
    expect(poly).toContainEqual(shadow);
    expect(pointInOrOnPolygon(triangle.tip, poly)).toBe(true);
  });

  it('in the morning hulls all four points', () => {
    const shadow = { x: 30, y: 5 };
    const poly = rubberBandShadowPolygon(triangle, shadow);
    expect(poly).toHaveLength(4);
    expect(poly).toContainEqual(shadow);
    expect(poly).toContainEqual(triangle.tip);
    expect(poly).toContainEqual(triangle.left);
    expect(poly).toContainEqual(triangle.right);
  });

  it('always contains every gnomon vertex for morning, noon, and afternoon', () => {
    const shadows = [{ x: 30, y: 5 }, { x: 0, y: 30 }, { x: -30, y: 5 }];
    for (const shadow of shadows) {
      const poly = rubberBandShadowPolygon(triangle, shadow);
      expect(pointInOrOnPolygon(triangle.tip, poly)).toBe(true);
      expect(pointInOrOnPolygon(triangle.left, poly)).toBe(true);
      expect(pointInOrOnPolygon(triangle.right, poly)).toBe(true);
    }
  });
});

describe('penumbraLayerOpacity', () => {
  it('defines reference alphas for 1, 2, and 3 coverage counts', () => {
    expect(SHADOW_ALPHA_BY_COVERAGE[1]).toBeCloseTo(SHADOW_TOTAL_ALPHA / 3, 5);
    expect(SHADOW_ALPHA_BY_COVERAGE[2]).toBeCloseTo((2 * SHADOW_TOTAL_ALPHA) / 3, 5);
    expect(SHADOW_ALPHA_BY_COVERAGE[3]).toBeCloseTo(SHADOW_TOTAL_ALPHA, 5);
  });

  it('stacks three penumbra layers to the previous full-opacity gray', () => {
    const target = 120 * SHADOW_TOTAL_ALPHA + 255 * (1 - SHADOW_TOTAL_ALPHA);
    const p = PENUMBRA_LAYER_OPACITY;
    let color = 255;
    for (let i = 0; i < 3; i++) {
      color = 120 * p + color * (1 - p);
    }
    expect(color).toBeCloseTo(target, 4);
    expect(penumbraLayerFill()).toContain(String(p));
  });
});

describe('penumbraLayerOffsets', () => {
  it('uses mean sun plus ±½ solar angular diameter in altitude', () => {
    const halfDiameter = SUN_ANGULAR_DIAMETER_DEG / 2;
    expect(halfDiameter).toBeCloseTo(SUN_ANGULAR_RADIUS_DEG, 10);
    expect(penumbraLayerOffsets()).toEqual([
      { altOffsetDeg: 0, azOffsetDeg: 0 },
      { altOffsetDeg: halfDiameter, azOffsetDeg: 0 },
      { altOffsetDeg: -halfDiameter, azOffsetDeg: 0 },
    ]);
  });

  it('samples solar disc limbs in altitude and azimuth for spread', () => {
    expect(solarDiscLimbOffsets()).toHaveLength(8);
    const r = SUN_ANGULAR_RADIUS_DEG;
    for (const o of solarDiscLimbOffsets()) {
      expect(Math.hypot(o.altOffsetDeg, o.azOffsetDeg)).toBeCloseTo(r, 5);
    }
  });
});

describe('mean and outer penumbra hulls', () => {
  it('computes mean hull inside outer hull', () => {
    const meanHull = computeMeanShadowPolygon(...shadowArgs());
    const outerHull = computeOuterPenumbraPolygon(...shadowArgs());
    expect(meanHull).not.toBeNull();
    expect(outerHull).not.toBeNull();
    for (const p of meanHull!) {
      expect(pointInOrOnPolygon(p, outerHull!)).toBe(true);
    }
  });

  it('provides a gradient frame from base midpoint to apex', () => {
    const meanHull = computeMeanShadowPolygon(...shadowArgs())!;
    const gnomonHeight = 10;
    const triangle = {
      tip: { x: 0, y: 0 },
      left: { x: -gnomonHeight / Math.SQRT2, y: -gnomonHeight / Math.SQRT2 },
      right: { x: gnomonHeight / Math.SQRT2, y: -gnomonHeight / Math.SQRT2 },
    };
    const distal = meanHull.find((p) => Math.hypot(p.x, p.y) > 1) ?? meanHull[0];
    const frame = shadowGradientFrame(triangle, distal);
    expect(frame.baseMid.y).toBeCloseTo(triangle.left.y, 5);
    expect(Math.hypot(frame.unitDir.x, frame.unitDir.y)).toBeCloseTo(1, 5);
    expect(frame.apex).toEqual(distal);
  });

  it('returns full geometry bundle', () => {
    const geometry = computeGnomonShadowGeometry(...shadowArgs());
    expect(geometry).not.toBeNull();
    expect(geometry!.softOutline.length).toBeGreaterThanOrEqual(4);
    expect(geometry!.penumbraBands).toHaveLength(3);
    expect(geometry!.penumbraBands[2].length).toBeLessThanOrEqual(geometry!.penumbraBands[0].length);
    expect(geometry!.blurRadius).toBeGreaterThan(0);
  });
});

describe('computeSoftPenumbraOutline', () => {
  const gnomonHeight = 10;
  const triangle = {
    tip: { x: 0, y: 0 },
    left: { x: -gnomonHeight / Math.SQRT2, y: -gnomonHeight / Math.SQRT2 },
    right: { x: gnomonHeight / Math.SQRT2, y: -gnomonHeight / Math.SQRT2 },
  };

  it('starts at base corners with zero penumbra width', () => {
    const outline = computeSoftPenumbraOutline(...shadowArgs())!;
    expect(pointInOrOnPolygon(triangle.left, outline)).toBe(true);
    expect(pointInOrOnPolygon(triangle.right, outline)).toBe(true);
  });

  it('has more vertices than the mean umbra hull (smooth tip cap)', () => {
    const outline = computeSoftPenumbraOutline(...shadowArgs())!;
    const meanHull = computeMeanShadowPolygon(...shadowArgs())!;
    expect(outline.length).toBeGreaterThan(meanHull!.length);
  });

  it('wraps the umbra with extra extent at the tip', () => {
    const outline = computeSoftPenumbraOutline(...shadowArgs())!;
    const meanHull = computeMeanShadowPolygon(...shadowArgs())!;
    const outerHull = computeOuterPenumbraPolygon(...shadowArgs())!;
    const distal = meanHull.reduce((best, p) => (Math.hypot(p.x, p.y) > Math.hypot(best.x, best.y) ? p : best));
    const maxOutlineDist = Math.max(...outline.map((p) => Math.hypot(p.x, p.y)));
    const maxOuterDist = Math.max(...outerHull!.map((p) => Math.hypot(p.x, p.y)));
    expect(maxOutlineDist).toBeGreaterThan(Math.hypot(distal.x, distal.y));
    expect(maxOutlineDist).toBeGreaterThanOrEqual(maxOuterDist * 0.95);
    expect(pointInOrOnPolygon(triangle.left, outline)).toBe(true);
    expect(pointInOrOnPolygon(triangle.right, outline)).toBe(true);
  });
});

describe('penumbra rubber-band bands', () => {
  const gnomonHeight = 10;
  const triangle = {
    tip: { x: 0, y: 0 },
    left: { x: -gnomonHeight / Math.SQRT2, y: -gnomonHeight / Math.SQRT2 },
    right: { x: gnomonHeight / Math.SQRT2, y: -gnomonHeight / Math.SQRT2 },
  };

  it('keeps gnomon vertices inside every penumbra band', () => {
    const geometry = computeGnomonShadowGeometry(...shadowArgs())!;
    const { tip, left, right } = triangle;
    for (const band of geometry.penumbraBands) {
      expect(pointInOrOnPolygon(tip, band)).toBe(true);
      expect(pointInOrOnPolygon(left, band)).toBe(true);
      expect(pointInOrOnPolygon(right, band)).toBe(true);
    }
    for (const p of geometry.meanHull) {
      expect(pointInOrOnPolygon(p, geometry.penumbraBands[2])).toBe(true);
    }
  });

  it('nests outer bands around inner umbra', () => {
    const geometry = computeGnomonShadowGeometry(...shadowArgs())!;
    const [outer, middle, inner] = geometry.penumbraBands;
    for (const p of inner) {
      expect(pointInOrOnPolygon(p, middle)).toBe(true);
      expect(pointInOrOnPolygon(p, outer)).toBe(true);
    }
    for (const p of geometry.meanHull) {
      expect(pointInOrOnPolygon(p, inner)).toBe(true);
    }
  });

  it('outer band matches the solar limb envelope hull', () => {
    const geometry = computeGnomonShadowGeometry(...shadowArgs())!;
    const outerHull = computeOuterPenumbraPolygon(...shadowArgs())!;
    const outerBand = geometry.penumbraBands[0];
    for (const p of outerHull) {
      expect(pointInOrOnPolygon(p, outerBand)).toBe(true);
    }
    const maxHull = Math.max(...outerHull.map((p) => Math.hypot(p.x, p.y)));
    const maxBand = Math.max(...outerBand.map((p) => Math.hypot(p.x, p.y)));
    expect(maxBand).toBeGreaterThanOrEqual(maxHull * 0.98);
  });

  it('extends the outer band beyond the mean umbra at the tip', () => {
    const geometry = computeGnomonShadowGeometry(...shadowArgs())!;
    const meanHull = geometry.meanHull;
    const distal = meanHull.reduce((best, p) => (Math.hypot(p.x, p.y) > Math.hypot(best.x, best.y) ? p : best));
    const maxBandDist = Math.max(...geometry.penumbraBands[0].map((p) => Math.hypot(p.x, p.y)));
    expect(maxBandDist).toBeGreaterThan(Math.hypot(distal.x, distal.y));
  });

  it('matches physical solar semi-diameter at the shadow tip', () => {
    const geometry = computeGnomonShadowGeometry(...shadowArgs())!;
    const meanApex = geometry.meanHull.reduce((best, p) =>
      (Math.hypot(p.x, p.y) > Math.hypot(best.x, best.y) ? p : best));
    const spread = computePenumbraSpread(meanApex, []);
    const shadowLen = Math.hypot(meanApex.x, meanApex.y);
    const expectedSemi = shadowLen * SUN_ANGULAR_RADIUS_DEG * (Math.PI / 180);
    expect(spread.perpendicular).toBeGreaterThanOrEqual(expectedSemi * 0.95);
    expect(spread.total).toBeGreaterThanOrEqual(expectedSemi * 2 * 0.95);
    const outerBand = geometry.penumbraBands[0];
    const maxBand = Math.max(...outerBand.map((p) => Math.hypot(p.x - meanApex.x, p.y - meanApex.y)));
    expect(maxBand).toBeGreaterThanOrEqual(expectedSemi * 0.9);
  });
});

describe('computePopupGnomonShadowPolygons (legacy)', () => {
  it('still returns three polygons for compatibility', () => {
    const polygons = computePopupGnomonShadowPolygons(...shadowArgs());
    expect(polygons).toHaveLength(3);
  });
});

function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInOrOnPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  if (polygon.some((v) => v.x === point.x && v.y === point.y)) return true;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (Math.abs(cross) > 1e-9) continue;
    const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
    if (dot < -1e-9) continue;
    const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (dot - lenSq > 1e-9) continue;
    return true;
  }
  return pointInPolygon(point, polygon);
}

describe('convexHull', () => {
  it('returns triangle when an interior point is omitted', () => {
    const tip = { x: 0, y: 0 };
    const left = { x: -10, y: -10 };
    const right = { x: 10, y: -10 };
    const inside = { x: 0, y: -3 };
    const hull = convexHull([tip, left, right, inside]);
    expect(hull).toHaveLength(3);
    expect(hull).toContainEqual(tip);
    expect(hull).toContainEqual(left);
    expect(hull).toContainEqual(right);
  });
});
