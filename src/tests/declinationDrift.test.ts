import { describe, it, expect } from 'vitest';
import {
  getSolarDeclination,
  getSolarEclipticLongitude,
  solarLongitudeDate,
} from '../utils/sundialMath';

// Declination Drift correction: the Sun's declination changes continuously through the
// day. These tests pin down the sign and relative magnitude of that intra-day change,
// which is what the correction renders on the date lines (fastest at the equinoxes,
// ~zero at the solstices).

// Local hour h maps to a fractional-day offset of (h - 12)/24 from noon. Use 6am / 6pm.
const MORNING = -0.25; // 6am
const EVENING = +0.25; // 6pm

describe('solarLongitudeDate anchors', () => {
  it('finds the equinoxes near declination 0 and solstices near ±23.44°', () => {
    const from = new Date(2026, 0, 1); // deterministic window
    expect(Math.abs(solarLongitudeDate(0, from).decl)).toBeLessThan(0.6);   // Vernal
    expect(Math.abs(solarLongitudeDate(180, from).decl)).toBeLessThan(0.6); // Autumnal
    expect(solarLongitudeDate(90, from).decl).toBeGreaterThan(23.0);        // Summer
    expect(solarLongitudeDate(270, from).decl).toBeLessThan(-23.0);         // Winter
  });

  it('lands within ~1° of the target longitude (0 ≡ 360 wraps)', () => {
    const from = new Date(2026, 0, 1);
    const vernal = solarLongitudeDate(0, from);
    expect(vernal.year).toBeGreaterThanOrEqual(2026);
    expect(vernal.dayOfYear).toBeGreaterThanOrEqual(1);
    const lon = getSolarEclipticLongitude(vernal.dayOfYear, vernal.year);
    expect(Math.min(lon, 360 - lon)).toBeLessThan(1);
  });
});

describe('cross-quarter pairs share a declination (crisp when drift is off)', () => {
  const from = new Date(2026, 0, 1);

  it('Imbolc (315°) and Samhain (225°) have equal declination', () => {
    const imbolc = solarLongitudeDate(315, from).decl;
    const samhain = solarLongitudeDate(225, from).decl;
    expect(Math.abs(imbolc - samhain)).toBeLessThan(0.01);
  });

  it('Beltane (45°) and Lughnasadh (135°) have equal declination', () => {
    const beltane = solarLongitudeDate(45, from).decl;
    const lughnasadh = solarLongitudeDate(135, from).decl;
    expect(Math.abs(beltane - lughnasadh)).toBeLessThan(0.01);
  });

  it('lands the equinoxes essentially on declination 0 after sub-day refinement', () => {
    expect(Math.abs(solarLongitudeDate(0, from).decl)).toBeLessThan(0.02);
    expect(Math.abs(solarLongitudeDate(180, from).decl)).toBeLessThan(0.02);
  });
});

describe('intra-day declination drift direction', () => {
  const from = new Date(2026, 0, 1);

  // The self-consistent drift anchors noon to the day's base declination, so the physically
  // guaranteed property is the DIRECTION of change through the day, not an exact sign split.
  it('rises through the vernal equinox (evening declination above morning)', () => {
    const { dayOfYear, year } = solarLongitudeDate(0, from);
    const morning = getSolarDeclination(dayOfYear + MORNING, year);
    const evening = getSolarDeclination(dayOfYear + EVENING, year);
    expect(evening - morning).toBeGreaterThan(0.1); // declination increasing, ~0.2°/half-day
  });

  it('falls through the autumnal equinox (morning declination above evening)', () => {
    const { dayOfYear, year } = solarLongitudeDate(180, from);
    const morning = getSolarDeclination(dayOfYear + MORNING, year);
    const evening = getSolarDeclination(dayOfYear + EVENING, year);
    expect(morning - evening).toBeGreaterThan(0.1); // declination decreasing
  });
});

describe('intra-day declination drift magnitude', () => {
  const from = new Date(2026, 0, 1);

  const halfDaySpread = (targetLon: number): number => {
    const { dayOfYear, year } = solarLongitudeDate(targetLon, from);
    return Math.abs(
      getSolarDeclination(dayOfYear + EVENING, year) - getSolarDeclination(dayOfYear + MORNING, year),
    );
  };

  it('is far larger at the equinox than at the solstice', () => {
    const equinoxSpread = halfDaySpread(0);
    const solsticeSpread = halfDaySpread(90);
    // Declination rate peaks at the equinox (~0.4°/day) and is ~0 at the solstice.
    expect(equinoxSpread).toBeGreaterThan(0.1);
    expect(solsticeSpread).toBeLessThan(0.01);
    expect(equinoxSpread).toBeGreaterThan(solsticeSpread * 20);
  });
});
