import { describe, it, expect } from 'vitest';
import {
  degreesToRadians,
  radiansToDegrees,
  getCancerIncline,
  getCapricornIncline,
  isInTropics,
  computeInclineDegrees,
  getWallDeclinationForPreset,
  getCancerInclineWithDeclination,
  getCapricornInclineWithDeclination,
} from '../utils/sundialMath';

// Direct unit tests for the incline / wall-declination helpers in sundialMath.
// These functions drive the dial geometry but were previously only exercised
// indirectly through the shadow/analemma tests.

const FORT_COLLINS_LAT = 40.5853;
const SYDNEY_LAT = -33.8688;
const TROPIC = 23.4367;

describe('angle conversions', () => {
  it('round-trips degrees through radians', () => {
    for (const deg of [0, 23.4367, 45, 90, -105.0844, 180]) {
      expect(radiansToDegrees(degreesToRadians(deg))).toBeCloseTo(deg, 10);
    }
  });

  it('converts known landmarks', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 12);
  });
});

describe('tropic inclines', () => {
  it('measures distance from each tropic', () => {
    expect(getCancerIncline(FORT_COLLINS_LAT)).toBeCloseTo(FORT_COLLINS_LAT - TROPIC, 6);
    expect(getCapricornIncline(FORT_COLLINS_LAT)).toBeCloseTo(FORT_COLLINS_LAT + TROPIC, 6);
  });

  it('returns 0 for a latitude sitting exactly on the tropic', () => {
    expect(getCancerIncline(TROPIC)).toBeCloseTo(0, 6);
    expect(getCapricornIncline(-TROPIC)).toBeCloseTo(0, 6);
  });

  it('is always non-negative (magnitude)', () => {
    for (const lat of [-90, -45, 0, 45, 90]) {
      expect(getCancerIncline(lat)).toBeGreaterThanOrEqual(0);
      expect(getCapricornIncline(lat)).toBeGreaterThanOrEqual(0);
    }
  });

  it('classifies the tropics band', () => {
    expect(isInTropics(0)).toBe(true);
    expect(isInTropics(TROPIC)).toBe(true);
    expect(isInTropics(-TROPIC)).toBe(true);
    expect(isInTropics(40)).toBe(false);
    expect(isInTropics(-40)).toBe(false);
  });
});

describe('computeInclineDegrees', () => {
  it('returns null without an incline type', () => {
    expect(computeInclineDegrees({})).toBeNull();
  });

  it('maps each incline type', () => {
    expect(computeInclineDegrees({ inclineType: 'Horizontal', tiltAngle: -5 })).toBe(5);
    expect(computeInclineDegrees({ inclineType: 'Vertical' })).toBe(90);
    expect(computeInclineDegrees({ inclineType: 'Polar', latitude: FORT_COLLINS_LAT })).toBeCloseTo(FORT_COLLINS_LAT, 6);
    expect(computeInclineDegrees({ inclineType: 'Cancer', latitude: FORT_COLLINS_LAT })).toBeCloseTo(FORT_COLLINS_LAT - TROPIC, 6);
    expect(computeInclineDegrees({ inclineType: 'Capricorn', latitude: FORT_COLLINS_LAT })).toBeCloseTo(FORT_COLLINS_LAT + TROPIC, 6);
    expect(computeInclineDegrees({ inclineType: 'Manual', tiltAngle: 37 })).toBe(37);
  });

  it('returns null for Manual without a tilt angle', () => {
    expect(computeInclineDegrees({ inclineType: 'Manual' })).toBeNull();
  });
});

describe('getWallDeclinationForPreset', () => {
  it('passes Manual degrees straight through', () => {
    expect(getWallDeclinationForPreset('Manual', 42, FORT_COLLINS_LAT)).toBe(42);
    expect(getWallDeclinationForPreset('Manual', -17.5, SYDNEY_LAT)).toBe(-17.5);
  });

  it('maps compass presets in the northern hemisphere (poleward South = 0)', () => {
    expect(getWallDeclinationForPreset('South', 0, FORT_COLLINS_LAT)).toBeCloseTo(0, 6);
    expect(getWallDeclinationForPreset('SW', 0, FORT_COLLINS_LAT)).toBeCloseTo(45, 6);
    expect(getWallDeclinationForPreset('West', 0, FORT_COLLINS_LAT)).toBeCloseTo(90, 6);
    expect(getWallDeclinationForPreset('NW', 0, FORT_COLLINS_LAT)).toBeCloseTo(135, 6);
    expect(getWallDeclinationForPreset('NE', 0, FORT_COLLINS_LAT)).toBeCloseTo(-135, 6);
    expect(getWallDeclinationForPreset('East', 0, FORT_COLLINS_LAT)).toBeCloseTo(-90, 6);
    expect(getWallDeclinationForPreset('SE', 0, FORT_COLLINS_LAT)).toBeCloseTo(-45, 6);
    expect(Math.abs(getWallDeclinationForPreset('North', 0, FORT_COLLINS_LAT))).toBeCloseTo(180, 6);
  });

  it('maps compass presets in the southern hemisphere (poleward North = 0)', () => {
    expect(getWallDeclinationForPreset('North', 0, SYDNEY_LAT)).toBeCloseTo(0, 6);
    expect(getWallDeclinationForPreset('NW', 0, SYDNEY_LAT)).toBeCloseTo(45, 6);
    expect(getWallDeclinationForPreset('West', 0, SYDNEY_LAT)).toBeCloseTo(90, 6);
    expect(getWallDeclinationForPreset('SW', 0, SYDNEY_LAT)).toBeCloseTo(135, 6);
    expect(getWallDeclinationForPreset('SE', 0, SYDNEY_LAT)).toBeCloseTo(-135, 6);
    expect(getWallDeclinationForPreset('East', 0, SYDNEY_LAT)).toBeCloseTo(-90, 6);
    expect(getWallDeclinationForPreset('NE', 0, SYDNEY_LAT)).toBeCloseTo(-45, 6);
    expect(Math.abs(getWallDeclinationForPreset('South', 0, SYDNEY_LAT))).toBeCloseTo(180, 6);
  });

  it('keeps every preset within (-180, 180]', () => {
    const presets = ['North', 'NNE', 'NE', 'ENE', 'East', 'ESE', 'SE', 'SSE',
      'South', 'SSW', 'SW', 'WSW', 'West', 'WNW', 'NW', 'NNW'] as const;
    for (const p of presets) {
      for (const lat of [FORT_COLLINS_LAT, SYDNEY_LAT]) {
        const d = getWallDeclinationForPreset(p, 0, lat);
        expect(d).toBeGreaterThanOrEqual(-180);
        expect(d).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('solstice incline with wall declination', () => {
  it('reduces to the simple tropic incline when the wall faces due poleward (D = 0)', () => {
    expect(getCancerInclineWithDeclination(FORT_COLLINS_LAT, 0)).toBeCloseTo(getCancerIncline(FORT_COLLINS_LAT), 4);
    expect(getCapricornInclineWithDeclination(FORT_COLLINS_LAT, 0)).toBeCloseTo(getCapricornIncline(FORT_COLLINS_LAT), 4);
    expect(getCancerInclineWithDeclination(SYDNEY_LAT, 0)).toBeCloseTo(getCancerIncline(SYDNEY_LAT), 4);
  });

  it('always returns a finite angle within [0, 90] across declinations', () => {
    for (const lat of [FORT_COLLINS_LAT, SYDNEY_LAT, 10, -10, 60]) {
      for (const decl of [-135, -90, -45, 0, 45, 90, 135]) {
        for (const fn of [getCancerInclineWithDeclination, getCapricornInclineWithDeclination]) {
          const v = fn(lat, decl);
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  it('falls back to the simple incline when no in-range solution exists (near-equatorial + large declination)', () => {
    // With a very small latitude and a large wall declination the analytic solver
    // has no root in [0, 90] and must return the D=0 fallback value.
    const lat = 1;
    expect(getCancerInclineWithDeclination(lat, 90)).toBeCloseTo(getCancerIncline(lat), 6);
  });
});
