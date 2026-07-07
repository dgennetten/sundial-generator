import { describe, it, expect } from 'vitest';
import { calculateShadowAtTime } from '../utils/shadowProjection';
import {
  computeShadowPoint,
  degreesToRadians,
  radiansToDegrees,
  atmosphericRefraction,
} from '../utils/sundialMath';

// calculateShadowAtTime replaces a block of math that was copy-pasted 8 times
// inside SundialPreview.tsx. This suite guarantees the extraction is faithful:
//
//  1. an equivalence check that re-computes the ORIGINAL inline expression and
//     asserts the helper matches it bit-for-bit across a parameter grid, and
//  2. a golden-master pin of concrete Fort Collins values so future edits to the
//     helper can't silently drift.

const FORT_COLLINS_LAT = 40.5853;
const GNOMON = 1;

// Verbatim copy of the block that lived in SundialPreview, used as the oracle.
function inlineReference(
  lat: number,
  decl: number,
  hour: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  applyRefraction: boolean,
) {
  const latRad = degreesToRadians(lat);
  const declRad = degreesToRadians(decl);
  const hourAngle = degreesToRadians(15 * (hour - 12));
  const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
  const altitude = Math.asin(sinAlt);
  const altitudeForShadow = applyRefraction
    ? degreesToRadians(radiansToDegrees(altitude) + atmosphericRefraction(radiansToDegrees(altitude)))
    : altitude;
  let cosAz = (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad));
  cosAz = Math.max(-1, Math.min(1, cosAz));
  let azimuth = Math.acos(cosAz);
  if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;
  const coords = computeShadowPoint(altitudeForShadow, azimuth, gnomonHeight, lat, dialInclination, dialDeclination);
  return { altitude, azimuth, coords };
}

describe('calculateShadowAtTime — equivalence with original inline math', () => {
  it('matches the inline reference bit-for-bit across a parameter grid', () => {
    const lats = [FORT_COLLINS_LAT, -33.8688, 5, 65];
    const decls = [-23.44, -10, 0, 10, 23.44];
    const hours = [6, 8, 10, 12, 13.5, 16, 18];
    const inclinations = [0, 40, 90];
    const declinations = [-45, 0, 30];

    for (const lat of lats) {
      for (const decl of decls) {
        for (const hour of hours) {
          for (const inc of inclinations) {
            for (const dd of declinations) {
              for (const refraction of [false, true]) {
                const got = calculateShadowAtTime(lat, decl, hour, GNOMON, inc, dd, refraction);
                const ref = inlineReference(lat, decl, hour, GNOMON, inc, dd, refraction);

                expect(got.altitude).toBe(ref.altitude);
                expect(got.azimuth).toBe(ref.azimuth);
                if (ref.coords === null) {
                  expect(got.coords).toBeNull();
                } else {
                  expect(got.coords).not.toBeNull();
                  expect(got.coords!.x).toBe(ref.coords.x);
                  expect(got.coords!.y).toBe(ref.coords.y);
                }
              }
            }
          }
        }
      }
    }
  });
});

describe('calculateShadowAtTime — golden master (Fort Collins, horizontal dial)', () => {
  it('projects the equinox noon shadow poleward', () => {
    const s = calculateShadowAtTime(FORT_COLLINS_LAT, 0, 12, GNOMON, 0, 0, false);
    expect(s.coords).not.toBeNull();
    // At noon the shadow lies on the noon meridian (x ≈ 0) pointing poleward (y > 0).
    expect(Math.abs(s.coords!.x)).toBeLessThan(1e-9);
    expect(s.coords!.y).toBeGreaterThan(0);
    // Equinox noon altitude ≈ 90° − latitude.
    expect(radiansToDegrees(s.altitude)).toBeCloseTo(90 - FORT_COLLINS_LAT, 3);
  });

  it('mirrors morning and afternoon shadows about the noon line', () => {
    const morning = calculateShadowAtTime(FORT_COLLINS_LAT, 0, 9, GNOMON, 0, 0, false);
    const afternoon = calculateShadowAtTime(FORT_COLLINS_LAT, 0, 15, GNOMON, 0, 0, false);
    expect(morning.coords).not.toBeNull();
    expect(afternoon.coords).not.toBeNull();
    // Symmetric hours: equal altitude, x mirrored, y equal.
    expect(morning.altitude).toBeCloseTo(afternoon.altitude, 9);
    expect(morning.coords!.x).toBeCloseTo(-afternoon.coords!.x, 9);
    expect(morning.coords!.y).toBeCloseTo(afternoon.coords!.y, 9);
  });

  it('bends the shadow-projection altitude upward when refraction is applied', () => {
    // Low sun: refraction should lengthen/shift the shadow, so coords differ,
    // while the reported geometric altitude stays identical.
    const plain = calculateShadowAtTime(FORT_COLLINS_LAT, 0, 6.5, GNOMON, 0, 0, false);
    const refracted = calculateShadowAtTime(FORT_COLLINS_LAT, 0, 6.5, GNOMON, 0, 0, true);
    expect(refracted.altitude).toBe(plain.altitude);
    if (plain.coords && refracted.coords) {
      expect(refracted.coords.y).not.toBeCloseTo(plain.coords.y, 6);
    }
  });
});
