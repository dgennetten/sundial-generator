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

// ============================================================================
// Solar Position and Shadow Projection
// ============================================================================

/**
 * @deprecated Use dialInclination / dialDeclination parameters instead.
 * Retained for backward compatibility with tests and legacy callers.
 */
export type Orientation = 'Horizontal' | 'Vertical' | 'Polar';

export interface SolarPositionResult {
  /** Solar altitude in radians */
  altitude: number;
  /** Solar azimuth in radians, measured from North clockwise */
  azimuth: number;
}

export interface ShadowProjectionResult {
  /** X coordinate in millimeters (positive = West on dial face) */
  x: number;
  /** Y coordinate in millimeters (positive = poleward / up on dial face) */
  y: number;
}

/**
 * Calculate solar position for a given day, location, and time
 */
export function getSolarPosition(
  day: number,
  lat: number,
  lng: number,
  tzMeridian: number,
  hour: number
): SolarPositionResult {
  const latRad = degreesToRadians(lat);
  const decl = getSolarDeclination(day);
  const declRad = degreesToRadians(decl);
  const eot = getEquationOfTime(day);
  const timeCorrection = 4 * (lng - tzMeridian); // minutes: positive = location east of meridian (solar noon earlier)
  const correctedMinutes = timeCorrection + eot;
  const solarTime = hour + correctedMinutes / 60;
  const hourAngle = degreesToRadians(15 * (solarTime - 12));

  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
  const altitude = Math.asin(sinAlt);

  let cosAz =
    (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) /
    (Math.cos(altitude) * Math.cos(latRad));

  cosAz = Math.max(-1, Math.min(1, cosAz)); // clamp
  let azimuth = Math.acos(cosAz);
  if (hourAngle > 0) {
    azimuth = 2 * Math.PI - azimuth;
  }

  return { altitude, azimuth };
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
}

export interface AnalemmaPoint {
  day: number;
  x: number;
  y: number;
}

/**
 * Calculate analemma points projected onto a sundial surface for a given hour.
 * Returns one point per visible day (sun above horizon and illuminating the dial face).
 * The last point duplicates the first to close the analemma loop for rendering.
 */
export function getAnalemmaPointsProjected(params: AnalemmaParams): AnalemmaPoint[] {
  const { lat, lng, tzMeridian, hour, styleHeight, dialInclination, dialDeclination = 0 } = params;
  const points: AnalemmaPoint[] = [];

  for (let day = 1; day <= 365; day++) {
    const { altitude, azimuth } = getSolarPosition(day, lat, lng, tzMeridian, hour);
    if (altitude <= 0) continue;

    const coords = computeShadowPoint(altitude, azimuth, styleHeight, lat, dialInclination, dialDeclination);
    if (coords === null) continue; // sun behind the dial face

    points.push({ day, x: coords.x, y: coords.y });
  }

  // Close the loop for rendering
  if (points.length > 1) {
    points.push({ ...points[0] });
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

