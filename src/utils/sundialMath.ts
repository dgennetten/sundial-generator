// src/utils/sundialMath.ts
// Consolidated math utilities for sundial calculations
// Replaces duplicate functions from: analemmaGenerator.ts, dialTextBlockInterpreter.ts, sundialPrintUtils.ts, App.tsx, PageSettings.tsx, SundialPreview.tsx

import type { InclineType, DeclinationType } from '../types';

// ============================================================================
// Constants
// ============================================================================

const TROPIC_OF_CANCER = 23.4367; // degrees
const TROPIC_OF_CAPRICORN = -23.4367; // degrees
const J2000_EPOCH_YEAR = 2000;

// ============================================================================
// Basic Angle Conversions
// ============================================================================

/**
 * Convert degrees to radians
 */
export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

// ============================================================================
// Tropics and Inclination Calculations
// ============================================================================

/**
 * Calculate tilt toward Tropic of Cancer (summer solstice orientation)
 * Returns tilt magnitude in degrees (always positive, 0-90)
 */
export function getCancerIncline(lat: number): number {
  return Math.abs(lat - TROPIC_OF_CANCER);
}

/**
 * Calculate tilt toward Tropic of Capricorn (winter solstice orientation)
 * Returns tilt magnitude in degrees (always positive, 0-90)
 */
export function getCapricornIncline(lat: number): number {
  return Math.abs(lat - TROPIC_OF_CAPRICORN);
}

/**
 * Private helper: find inclination (degrees) placing the gnomon on a given solstice line,
 * accounting for wall declination.
 *
 * Derivation: the gnomon root (0,0) lies on the solstice date curve when the sun is exactly
 * perpendicular to the dial face at some moment during that solstice day. That perpendicularity
 * condition requires altitude = 90°−t at azimuth 180°+D (NH) / 360°−D (SH), and inserting
 * those values into the solar azimuth formula yields:
 *   sin(δ) = sin(φ)·cos(t) − hemi·cos(φ)·sin(t)·cos(D)
 * which is solved analytically for t. Falls back to the D=0 formula when no solution in [0°,90°].
 */
function solveSolsticeInclination(
  lat: number,
  wallDeclinationDeg: number,
  tropicDeg: number,
  fallback: number
): number {
  const hemi = lat >= 0 ? 1 : -1;
  const latRad = degreesToRadians(lat);
  const D = degreesToRadians(wallDeclinationDeg);
  const sinTarget = Math.sin(degreesToRadians(tropicDeg));

  // A·cos(t) + B·sin(t) = sinTarget
  const A = Math.sin(latRad);
  const B = -hemi * Math.cos(latRad) * Math.cos(D);
  const R = Math.sqrt(A * A + B * B);

  if (R < 1e-9 || Math.abs(sinTarget / R) > 1) return fallback;

  const alpha = Math.atan2(B, A);
  const phi = Math.acos(sinTarget / R);

  const t1 = radiansToDegrees(alpha + phi);
  const t2 = radiansToDegrees(alpha - phi);

  const inRange = (v: number) => v >= -0.5 && v <= 90.5;
  const clamp  = (v: number) => Math.max(0, Math.min(90, v));

  if (inRange(t1) && !inRange(t2)) return clamp(t1);
  if (inRange(t2) && !inRange(t1)) return clamp(t2);
  if (inRange(t1) && inRange(t2)) return clamp(Math.min(t1, t2));
  return fallback;
}

/**
 * Inclination (degrees) that places the gnomon on the Cancer (summer solstice) date line,
 * accounting for wall declination. Generalises getCancerIncline() to D ≠ 0.
 */
export function getCancerInclineWithDeclination(lat: number, wallDeclinationDeg: number): number {
  return solveSolsticeInclination(lat, wallDeclinationDeg, TROPIC_OF_CANCER, getCancerIncline(lat));
}

/**
 * Inclination (degrees) that places the gnomon on the Capricorn (winter solstice) date line,
 * accounting for wall declination. Generalises getCapricornIncline() to D ≠ 0.
 */
export function getCapricornInclineWithDeclination(lat: number, wallDeclinationDeg: number): number {
  return solveSolsticeInclination(lat, wallDeclinationDeg, TROPIC_OF_CAPRICORN, getCapricornIncline(lat));
}

/**
 * Check if latitude is within the tropics
 */
export function isInTropics(lat: number): boolean {
  return Math.abs(lat) <= TROPIC_OF_CANCER;
}

/**
 * Compute effective tilt angle for UI display
 * Returns tilt magnitude (always positive, 0-90 degrees)
 */
export function getDisplayTiltAngle(
  inclineType: InclineType,
  latitude: number,
  tiltAngle: number
): number {
  switch (inclineType) {
    case 'Horizontal':
      return Math.abs(tiltAngle);
    case 'Cancer':
      return getCancerIncline(latitude);
    case 'Polar':
      return Math.abs(latitude);
    case 'Capricorn':
      return getCapricornIncline(latitude);
    case 'Vertical':
      return 90;
    case 'Manual':
      return Math.abs(tiltAngle);
    default:
      return 0;
  }
}

/**
 * Compute effective tilt angle for rendering
 * Returns tilt value for effectiveLatitude = latitude - tilt
 * For Southern hemisphere, returns negative values (as expected by rendering code)
 */
export function getRenderTiltAngle(
  inclineType: InclineType,
  latitude: number,
  tiltAngle: number
): number {
  const isSouthern = latitude < 0;
  switch (inclineType) {
    case 'Horizontal':
      return isSouthern ? -Math.abs(tiltAngle) : Math.abs(tiltAngle);
    case 'Cancer':
      // Negative for Southern hemisphere
      return isSouthern ? -getCancerIncline(latitude) : getCancerIncline(latitude);
    case 'Polar':
      return latitude; // Raw latitude (negative for Southern)
    case 'Capricorn':
      // Negative for Southern hemisphere
      return isSouthern ? -getCapricornIncline(latitude) : getCapricornIncline(latitude);
    case 'Vertical':
      // 90 for Northern, -90 for Southern
      return isSouthern ? -90 : 90;
    case 'Manual':
      // For Manual, negate if Southern hemisphere
      return isSouthern ? -Math.abs(tiltAngle) : Math.abs(tiltAngle);
    default:
      return 0;
  }
}

/**
 * @deprecated Use getDisplayTiltAngle for UI or getRenderTiltAngle for rendering
 */
export function getEffectiveTiltAngle(
  inclineType: InclineType,
  latitude: number,
  tiltAngle: number
): number {
  // For backward compatibility, use display version (always positive)
  return getDisplayTiltAngle(inclineType, latitude, tiltAngle);
}

/**
 * Compute inclination degrees from inclineType and optional parameters
 */
export function computeInclineDegrees(args: {
  inclineType?: InclineType;
  latitude?: number;
  tiltAngle?: number;
}): number | null {
  const { inclineType, latitude, tiltAngle } = args;
  if (!inclineType) return null;
  const lat = typeof latitude === 'number' ? latitude : 0;

  if (inclineType === 'Horizontal')
    return typeof tiltAngle === 'number' ? Math.abs(tiltAngle) : 0;
  if (inclineType === 'Vertical') return 90;
  if (inclineType === 'Polar') return lat;
  if (inclineType === 'Cancer') return getCancerIncline(lat);
  if (inclineType === 'Capricorn') return getCapricornIncline(lat);
  if (inclineType === 'Manual') return typeof tiltAngle === 'number' ? tiltAngle : null;
  return null;
}

// ============================================================================
// Astronomical Calculations (from analemmaGenerator.ts)
// ============================================================================

/**
 * Calculate common astronomical parameters for solar position calculations
 * Based on the Hughes, Yallop & Hohenkerk algorithm (1989)
 */
function getAstronomicalParameters(dayOfYear: number, year: number) {
  const jan1Year = new Date(year, 0, 1);
  const jan1_2000 = new Date(J2000_EPOCH_YEAR, 0, 1);
  const daysSinceJ2000_Jan1 = (jan1Year.getTime() - jan1_2000.getTime()) / (1000 * 60 * 60 * 24);
  const daysSinceEpoch = daysSinceJ2000_Jan1 + (dayOfYear - 1);

  // Mean longitude of the Sun (degrees)
  let meanLongSun = (280.46 + 0.9856474 * daysSinceEpoch) % 360;
  if (meanLongSun < 0) meanLongSun += 360;

  // Mean anomaly of the Sun (degrees)
  let meanAnomaly = (357.528 + 0.9856003 * daysSinceEpoch) % 360;
  if (meanAnomaly < 0) meanAnomaly += 360;
  const meanAnomalyRad = degreesToRadians(meanAnomaly);

  // Ecliptic longitude of the Sun (degrees)
  const eclipticLong = meanLongSun + 1.915 * Math.sin(meanAnomalyRad) + 0.02 * Math.sin(2 * meanAnomalyRad);
  const eclipticLongRad = degreesToRadians(eclipticLong);

  // Obliquity of the ecliptic (degrees)
  const obliquity = 23.439 - 4e-7 * daysSinceEpoch;
  const obliquityRad = degreesToRadians(obliquity);

  return {
    daysSinceEpoch,
    meanLongSun,
    meanAnomaly,
    meanAnomalyRad,
    eclipticLong,
    eclipticLongRad,
    obliquity,
    obliquityRad
  };
}

/**
 * Calculate the Equation of Time using the Hughes, Yallop & Hohenkerk algorithm (1989)
 * Based on the Astronomical Almanac method, accurate to ±3.5 seconds
 */
export function getEquationOfTime(dayOfYear: number, year: number = new Date().getFullYear()): number {
  const params = getAstronomicalParameters(dayOfYear, year);

  // Right ascension of the Sun (radians, then degrees)
  const rightAscensionRad = Math.atan2(
    Math.cos(params.obliquityRad) * Math.sin(params.eclipticLongRad),
    Math.cos(params.eclipticLongRad)
  );
  let rightAscensionDeg = (rightAscensionRad * 180) / Math.PI;
  if (rightAscensionDeg < 0) rightAscensionDeg += 360;

  // Equation of Time calculation
  let eotDeg = params.meanLongSun - rightAscensionDeg;

  // Handle the discontinuity around the year boundaries
  if (eotDeg > 180) eotDeg -= 360;
  if (eotDeg < -180) eotDeg += 360;

  // Convert to minutes (4 minutes per degree)
  const eotMinutes = eotDeg * 4;

  return eotMinutes;
}

/**
 * Calculate the Solar Declination using the same astronomical method as the Equation of Time
 */
export function getSolarDeclination(dayOfYear: number, year: number = new Date().getFullYear()): number {
  const params = getAstronomicalParameters(dayOfYear, year);

  // Solar declination (degrees)
  const declinationRad = Math.asin(Math.sin(params.obliquityRad) * Math.sin(params.eclipticLongRad));
  return radiansToDegrees(declinationRad);
}

/**
 * Solar ecliptic (apparent) longitude in degrees, normalized to [0, 360).
 * 0° = Vernal Equinox, 90° = Summer Solstice, 180° = Autumnal Equinox,
 * 270° = Winter Solstice. The cross-quarter days fall at 45°, 135°, 225°, 315°.
 */
export function getSolarEclipticLongitude(dayOfYear: number, year: number = new Date().getFullYear()): number {
  const params = getAstronomicalParameters(dayOfYear, year);
  let lon = params.eclipticLong % 360;
  if (lon < 0) lon += 360;
  return lon;
}

export interface SolarLongitudeDate {
  /** Day of year (1-based) the Sun reaches the target ecliptic longitude. */
  dayOfYear: number;
  /** Calendar year that day falls in. */
  year: number;
  /** Solar declination (degrees) on that day. */
  decl: number;
}

/**
 * Find the calendar date in the upcoming ~12 months when the Sun's apparent
 * ecliptic longitude reaches `targetLonDeg`. Anchors:
 *   0° Vernal Equinox · 90° Summer Solstice · 180° Autumnal Equinox · 270° Winter Solstice
 *   45°/135°/225°/315° the four cross-quarter days.
 * Scans just over one year (each longitude occurs exactly once) to bracket the day, then
 * refines to the sub-day crossing. Returning the exact (fractional) crossing day matters:
 * pairs that share a longitude magnitude — e.g. Imbolc (315°) & Samhain (225°), whose
 * sin(λ) and therefore declination are identical — then get the SAME declination and
 * coincide into one crisp line when Declination Drift is off (integer-day rounding would
 * leave them ~0.1–0.3° apart, showing as a doubled line).
 * @param targetLonDeg target ecliptic longitude in degrees
 * @param from         start of the search window (defaults to today)
 */
export function solarLongitudeDate(targetLonDeg: number, from: Date = new Date()): SolarLongitudeDate {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let bestDay = 1;
  let bestYear = start.getFullYear();
  let bestAbs = Infinity;
  for (let i = 0; i <= 366; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const year = d.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const lon = getSolarEclipticLongitude(dayOfYear, year);
    // Smallest wrapped angular distance to the target longitude, in [0, 180].
    const delta = Math.abs(((targetLonDeg - lon + 540) % 360) - 180);
    if (delta < bestAbs) {
      bestAbs = delta;
      bestDay = dayOfYear;
      bestYear = year;
    }
  }

  // Refine to the exact sub-day crossing by bisection. The signed wrapped longitude
  // difference decreases through zero as the day advances (longitude rises ~1°/day), so
  // the crossing is bracketed by [bestDay − 1, bestDay + 1].
  const signedDiff = (day: number): number =>
    ((targetLonDeg - getSolarEclipticLongitude(day, bestYear) + 540) % 360) - 180;
  let lo = bestDay - 1;
  let hi = bestDay + 1;
  if (signedDiff(lo) > 0 && signedDiff(hi) < 0) {
    for (let iter = 0; iter < 40; iter++) {
      const mid = (lo + hi) / 2;
      if (signedDiff(mid) > 0) lo = mid; else hi = mid;
    }
    bestDay = (lo + hi) / 2;
  }

  return { dayOfYear: bestDay, year: bestYear, decl: getSolarDeclination(bestDay, bestYear) };
}

// ============================================================================
// Solar Position and Shadow Projection
// ============================================================================

/**
 * @deprecated Use dialInclination / dialDeclination parameters instead.
 * Retained for backward compatibility with tests and legacy callers.
 */
export type Orientation = 'Horizontal' | 'Vertical' | 'Polar';

export interface SolarPositionResult {
  /** Solar altitude in radians (refracted when applyRefraction is true) */
  altitude: number;
  /** Solar azimuth in radians, measured from North clockwise */
  azimuth: number;
  /** True (pre-refraction) altitude in radians; only present when refraction was applied */
  trueAltitude?: number;
}

export interface ShadowProjectionResult {
  /** X coordinate in millimeters (positive = West on dial face) */
  x: number;
  /** Y coordinate in millimeters (positive = poleward / up on dial face) */
  y: number;
}

// ============================================================================
// Correction Flags
// ============================================================================

/** Controls which astronomical corrections are applied to the sundial rendering. */
export interface CorrectionFlags {
  latitude: boolean;       // tilt dial from polar to horizontal per geographic latitude
  longitude: boolean;      // shift hour lines per longitude offset from time-zone meridian
  equationOfTime: boolean; // apply equation of time (creates analemma figure-8 shape)
  solarDeclination: boolean; // show date/declination lines on dial face
  declinationDrift: boolean; // model the intra-day change in solar declination on date lines
  refraction: boolean;       // atmospheric refraction (not yet implemented)
  mysteryError: boolean;     // mystery error (not yet implemented)
}

export const DEFAULT_CORRECTION_FLAGS: CorrectionFlags = {
  latitude: true,
  longitude: true,
  equationOfTime: true,
  solarDeclination: true,
  declinationDrift: false,
  refraction: false,
  mysteryError: false,
};

/**
 * Atmospheric refraction correction using Bennett's formula.
 * Returns the refraction angle in degrees to ADD to the true altitude to get apparent altitude.
 * Accurate to ~0.07 arcminutes for altitudes above −5°.
 * @param altitudeDeg  True solar altitude in degrees.
 */
export function atmosphericRefraction(altitudeDeg: number): number {
  if (altitudeDeg < -5) return 0;
  // Bennett's formula: R in arcminutes, evaluated at true altitude (adequate for sundial use)
  const R = 1.02 / Math.tan(degreesToRadians(altitudeDeg + 10.3 / (altitudeDeg + 5.11)));
  return Math.max(0, R) / 60; // convert arcminutes → degrees
}

/**
 * Calculate solar position for a given day, location, and time
 */
export function getSolarPosition(
  day: number,
  lat: number,
  lng: number,
  tzMeridian: number,
  hour: number,
  options?: { eotMinutes?: number; applyRefraction?: boolean }
): SolarPositionResult {
  const latRad = degreesToRadians(lat);
  const decl = getSolarDeclination(day);
  const declRad = degreesToRadians(decl);
  const eot = options?.eotMinutes !== undefined ? options.eotMinutes : getEquationOfTime(day);
  const timeCorrection = 4 * (lng - tzMeridian); // minutes: positive = location east of meridian (solar noon earlier)
  const correctedMinutes = timeCorrection + eot;
  const solarTime = hour + correctedMinutes / 60;
  const hourAngle = degreesToRadians(15 * (solarTime - 12));

  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
  const trueAltitude = Math.asin(sinAlt);

  // Azimuth is computed from TRUE altitude — refraction only changes altitude, not azimuth.
  let cosAz =
    (Math.sin(declRad) - Math.sin(trueAltitude) * Math.sin(latRad)) /
    (Math.cos(trueAltitude) * Math.cos(latRad));

  cosAz = Math.max(-1, Math.min(1, cosAz)); // clamp
  let azimuth = Math.acos(cosAz);
  if (hourAngle > 0) {
    azimuth = 2 * Math.PI - azimuth;
  }

  // Apply atmospheric refraction: the sun appears higher than it truly is.
  // Refraction only affects altitude (lifts sun straight up), not azimuth.
  if (options?.applyRefraction) {
    const refDeg = atmosphericRefraction(radiansToDegrees(trueAltitude));
    const altitude = degreesToRadians(radiansToDegrees(trueAltitude) + refDeg);
    return { altitude, azimuth, trueAltitude };
  }

  return { altitude: trueAltitude, azimuth };
}

/**
 * Project a shadow onto the dial surface using proper 3D ENU geometry.
 *
 * The dial surface is defined by its outward normal derived from dialInclination
 * and dialDeclination. The style tip sits perpendicular to the dial surface at
 * height styleHeight. The shadow is the intersection of the anti-solar ray from
 * the style tip with the dial plane.
 *
 * Coordinate axes on the returned dial face (positive directions):
 *   x — West  (morning hours are positive x, afternoon negative x)
 *   y — poleward / up  (noon shadow is positive y for horizontal dials)
 *
 * Sign convention (Shadows Pro standard):
 *   dialDeclination = 0   → poleward-facing (South in NH, North in SH)
 *   dialDeclination > 0   → declined toward West
 *   dialDeclination < 0   → declined toward East
 *
 * @returns {x, y} in dial surface coordinates (mm), or null when the sun is
 *   behind or parallel to the dial face.
 */
export function computeShadowPoint(
  solarAltitude: number,    // radians
  solarAzimuth: number,     // radians, from North clockwise
  styleHeight: number,      // perpendicular height of style tip above dial surface (mm)
  latitude: number,         // geographic latitude, degrees (+N / −S)
  dialInclination: number,  // dial tilt from horizontal, degrees (0 = flat, 90 = vertical)
  dialDeclination: number   // dial rotation from poleward, degrees (+West / −East)
): { x: number; y: number } | null {
  const t = degreesToRadians(dialInclination);
  const D = degreesToRadians(dialDeclination);
  const hemisphereSign = latitude >= 0 ? 1 : -1;

  // Dial surface outward normal in East-North-Up (ENU) frame
  const nX = -Math.sin(t) * Math.sin(D);
  const nY = -hemisphereSign * Math.sin(t) * Math.cos(D);
  const nZ = Math.cos(t);

  // Sun unit vector toward the sun in ENU frame
  const sX = Math.cos(solarAltitude) * Math.sin(solarAzimuth); // East
  const sY = Math.cos(solarAltitude) * Math.cos(solarAzimuth); // North
  const sZ = Math.sin(solarAltitude);                           // Up

  // n · sunHat must be positive for sun to illuminate the dial face
  const dotNS = nX * sX + nY * sY + nZ * sZ;
  if (dotNS <= 0) return null;

  // Style tip: gnomonTip = styleHeight * dialNormal
  // Shadow point: styleHeight * (dialNormal − sunHat / dotNS)
  const factor = styleHeight / dotNS;
  const shadowEast  = styleHeight * nX - factor * sX;
  const shadowNorth = styleHeight * nY - factor * sY;
  const shadowUp    = styleHeight * nZ - factor * sZ;

  // --- Dial 2D basis vectors ---
  // xDialAxis: West direction (−1, 0, 0) projected onto the dial plane.
  // Positive x = West on the dial face as seen by the viewer.
  const dotWN = -nX; // dot(dialNormal, West) = dot((nX,nY,nZ),(−1,0,0)) = −nX
  let xX = -1.0 - dotWN * nX;
  let xY =      - dotWN * nY;
  let xZ =      - dotWN * nZ;
  let xLen = Math.sqrt(xX * xX + xY * xY + xZ * xZ);

  if (xLen < 1e-6) {
    // Fallback for East/West-facing dials (n ≈ ±East): use n × Up = (nY, −nX, 0)
    xX = nY; xY = -nX; xZ = 0;
    xLen = Math.sqrt(xX * xX + xY * xY);
    if (xLen < 1e-6) { xX = 1; xY = 0; xZ = 0; xLen = 1; }
  }
  xX /= xLen; xY /= xLen; xZ /= xLen;

  // yDialAxis = xDialAxis × dialNormal  (positive y = poleward / up on dial face)
  const yX = xY * nZ - xZ * nY;
  const yY = xZ * nX - xX * nZ;
  const yZ = xX * nY - xY * nX;

  return {
    x: shadowEast * xX + shadowNorth * xY + shadowUp * xZ,
    y: shadowEast * yX + shadowNorth * yY + shadowUp * yZ,
  };
}

/**
 * @deprecated Use computeShadowPoint() instead.
 * Retained for backward compatibility with existing tests and legacy callers.
 * All existing callers used orientation='Horizontal', which maps to
 * dialInclination=0, dialDeclination=wallDeclination.
 */
export function projectShadowToSurface(
  altitude: number,
  azimuth: number,
  styleHeight: number,
  orientation: Orientation,
  latitude: number,
  wallDeclination: number = 0
): ShadowProjectionResult {
  if (altitude <= 0) return { x: 0, y: 0 };
  // Map legacy orientation to inclination degrees
  const inclinationDeg =
    orientation === 'Vertical' ? 90 :
    orientation === 'Polar'    ? Math.abs(latitude) :
    0; // Horizontal
  const result = computeShadowPoint(altitude, azimuth, styleHeight, latitude, inclinationDeg, wallDeclination);
  return result ?? { x: 0, y: 0 };
}

export interface AnalemmaParams {
  lat: number;
  lng: number;
  tzMeridian: number;
  hour: number;
  styleHeight: number;       // perpendicular height of style tip above dial surface (mm)
  dialInclination: number;   // dial tilt from horizontal, degrees (0 = flat, 90 = vertical)
  dialDeclination?: number;  // dial rotation from poleward, degrees (+West / −East); default 0
  showBelowHorizon?: boolean; // include days where sun is below horizon but dial still illuminated
  eotMinutes?: number;       // when provided, overrides getEquationOfTime (e.g. pass 0 to bypass EoT)
  applyRefraction?: boolean; // when true, applies atmospheric refraction correction to solar altitude
}

export interface AnalemmaPoint {
  day: number;
  x: number;
  y: number;
  aboveHorizon?: boolean; // true when sun above horizon; undefined treated as true (legacy points)
}

/**
 * Calculate analemma points projected onto a sundial surface for a given hour.
 * By default returns only above-horizon days. When showBelowHorizon is true, also
 * includes below-horizon days where the dial face is still geometrically illuminated
 * (relevant for steeply inclined/declined dials). The last point duplicates the first
 * to close the analemma loop for rendering.
 */
export function getAnalemmaPointsProjected(params: AnalemmaParams): AnalemmaPoint[] {
  const { lat, lng, tzMeridian, hour, styleHeight, dialInclination, dialDeclination = 0, showBelowHorizon = false, eotMinutes, applyRefraction } = params;
  const solarOptions = { ...(eotMinutes !== undefined ? { eotMinutes } : {}), ...(applyRefraction ? { applyRefraction } : {}) };
  const hasSolarOptions = Object.keys(solarOptions).length > 0;
  const points: AnalemmaPoint[] = [];

  for (let day = 1; day <= 365; day++) {
    const { altitude, azimuth, trueAltitude } = getSolarPosition(day, lat, lng, tzMeridian, hour, hasSolarOptions ? solarOptions : undefined);
    const aboveHorizon = (trueAltitude ?? altitude) > 0;

    if (!aboveHorizon && !showBelowHorizon) continue;

    const coords = computeShadowPoint(altitude, azimuth, styleHeight, lat, dialInclination, dialDeclination);
    if (coords === null) continue; // sun behind or parallel to dial face

    points.push({ day, x: coords.x, y: coords.y, aboveHorizon });
  }

  return points;
}

// ============================================================================
// Auto Gnomon Height Calculation
// ============================================================================

/**
 * Calculate auto style height so the winter-to-summer solstice shadow span
 * fills roughly 40% of the page height (for a horizontal reference dial).
 */
export function calculateAutoGnomonHeight(
  lat: number,
  lng: number,
  tzMeridian: number,
  pageHeight: number,
  dialInclination: number = 0,
  dialDeclination: number = 0
): number {
  const winterSolsticeDay = 355;
  const summerSolsticeDay = 172;
  const noonHour = 12;

  const winterPos = getSolarPosition(winterSolsticeDay, lat, lng, tzMeridian, noonHour);
  const summerPos = getSolarPosition(summerSolsticeDay, lat, lng, tzMeridian, noonHour);

  if (winterPos.altitude <= 0 || summerPos.altitude <= 0) {
    return Math.round(Math.tan((lat * Math.PI) / 180) * 100 * 3.7 / 8);
  }

  const tempStyleHeight = 1;
  const winterShadow = computeShadowPoint(winterPos.altitude, winterPos.azimuth, tempStyleHeight, lat, dialInclination, dialDeclination);
  const summerShadow = computeShadowPoint(summerPos.altitude, summerPos.azimuth, tempStyleHeight, lat, dialInclination, dialDeclination);

  if (!winterShadow || !summerShadow) {
    return Math.round(Math.tan((lat * Math.PI) / 180) * 100 * 3.7 / 8);
  }

  // Use the larger of y-span and x-span to size the dial
  const ySpan = Math.abs(winterShadow.y - summerShadow.y);
  const xSpan = Math.abs(winterShadow.x - summerShadow.x);
  const shadowDistance = Math.max(ySpan, xSpan, 1e-6);
  const targetDistance = pageHeight * 0.4;
  const requiredStyleHeight = targetDistance / shadowDistance;

  return Math.round(requiredStyleHeight * 0.66 * (55 / 40));
}

// ============================================================================
// Wall Declination
// ============================================================================

const COMPASS_BEARING: Record<string, number> = {
  'North': 0,   'NNE': 22.5,  'NE': 45,   'ENE': 67.5,
  'East': 90,   'ESE': 112.5, 'SE': 135,  'SSE': 157.5,
  'South': 180, 'SSW': 202.5, 'SW': 225,  'WSW': 247.5,
  'West': 270,  'WNW': 292.5, 'NW': 315,  'NNW': 337.5,
};

/**
 * Convert a DeclinationType preset + latitude to the dial declination angle (degrees).
 * 0 = poleward-facing (South in NH, North in SH). Positive = declined toward West.
 *
 * NH: poleward = South (compass 180). degrees = compassBearing - 180.
 *   South→0, SW→+45, W→+90, NW→+135, N→±180, NE→-135, E→-90, SE→-45.
 *
 * SH: poleward = North (compass 0). Positive West-decline turns the face
 *   counter-clockwise on the compass. degrees = -compassBearing.
 *   North→0, NW→+45, W→+90, SW→+135, S→±180, SE→-135, E→-90, NE→-45.
 */
export function getWallDeclinationForPreset(
  type: DeclinationType,
  manualDegrees: number,
  latitude: number
): number {
  if (type === 'Manual') return manualDegrees;
  const bearing = COMPASS_BEARING[type] ?? 0;
  let degrees: number;
  if (latitude >= 0) {
    degrees = bearing - 180;   // NH: South is 0
  } else {
    degrees = -bearing;        // SH: North is 0, West-decline is positive
  }
  if (degrees > 180) degrees -= 360;
  if (degrees < -180) degrees += 360;
  return degrees;
}

