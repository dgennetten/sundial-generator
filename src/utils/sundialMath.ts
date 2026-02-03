// src/utils/sundialMath.ts
// Consolidated math utilities for sundial calculations
// Replaces duplicate functions from: analemmaGenerator.ts, dialTextBlockInterpreter.ts, sundialPrintUtils.ts, App.tsx, PageSettings.tsx, SundialPreview.tsx

import type { InclineType } from '../types';

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
 * Returns positive value for Northern hemisphere (tilts up to northern sky)
 * Returns negative value for Southern hemisphere (tilts up to northern sky)
 */
export function getCancerIncline(lat: number): number {
  const tilt = Math.abs(lat - TROPIC_OF_CANCER);
  // Return negative for Southern hemisphere to indicate tilt toward northern sky
  return lat >= 0 ? tilt : -tilt;
}

/**
 * Calculate tilt toward Tropic of Capricorn (winter solstice orientation)
 * Returns positive value (tilts toward southern sky)
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
 * Compute effective tilt angle from inclineType
 */
/**
 * Calculate the effective tilt angle for sundial calculations
 * Returns the tilt value to use for effectiveLatitude = latitude - tilt
 * 
 * For most incline types, this is the direct tilt value.
 * For Polar, it returns the raw latitude (to preserve hemisphere sign).
 */
export function getEffectiveTiltAngle(
  inclineType: InclineType,
  latitude: number,
  tiltAngle: number
): number {
  switch (inclineType) {
    case 'Horizontal':
      return 0;
    case 'Cancer':
      return getCancerIncline(latitude);
    case 'Polar':
      return latitude; // Use raw latitude (can be negative for Southern hemisphere)
    case 'Capricorn':
      return getCapricornIncline(latitude);
    case 'Vertical':
      // For vertical dials:
      // Northern hemisphere: effectiveLatitude = latitude - 90 (e.g., 40 - 90 = -50)
      // Southern hemisphere: effectiveLatitude = latitude + 90 = |latitude| - 90 with positive sign
      // We handle this by returning -latitude for Southern hemisphere
      return latitude > 0 ? 90 : -90;
    case 'Manual':
      return tiltAngle;
    default:
      return 0;
  }
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

  if (inclineType === 'Horizontal') return 0;
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

export type Orientation = 'Horizontal' | 'Vertical' | 'Polar';

export interface SolarPositionResult {
  /** Solar altitude in radians */
  altitude: number;
  /** Solar azimuth in radians */
  azimuth: number;
}

export interface ShadowProjectionResult {
  /** X coordinate in millimeters */
  x: number;
  /** Y coordinate in millimeters */
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
  const timeCorrection = 4 * (tzMeridian - lng); // minutes
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
 * Project shadow position onto a sundial surface
 */
export function projectShadowToSurface(
  altitude: number,
  azimuth: number,
  gnomonHeight: number,
  orientation: Orientation,
  latitude: number
): ShadowProjectionResult {
  const tanAlt = Math.tan(altitude);
  if (!isFinite(tanAlt) || tanAlt === 0) return { x: 0, y: 0 };

  const shadowLength = gnomonHeight / tanAlt;

  const sx = shadowLength * Math.sin(azimuth);
  const sy = shadowLength * Math.cos(azimuth);
  const sz = gnomonHeight;

  if (orientation === 'Horizontal') {
    return { x: sx, y: -sy };
  }

  if (orientation === 'Vertical') {
    return { x: sx, y: sz };
  }

  if (orientation === 'Polar') {
    const tilt = degreesToRadians(latitude);
    const x = sx;
    const y = sz * Math.cos(tilt) - sy * Math.sin(tilt);
    return { x, y };
  }

  return { x: sx, y: sy };
}

interface AnalemmaParams {
  lat: number;
  lng: number;
  tzMeridian: number;
  hour: number;
  gnomonHeight: number;
  orientation: Orientation;
}

export interface AnalemmaPoint {
  day: number;
  x: number;
  y: number;
}

/**
 * Calculate analemma points projected onto a sundial surface
 */
export function getAnalemmaPointsProjected(params: AnalemmaParams): AnalemmaPoint[] {
  const { lat, lng, tzMeridian, hour, gnomonHeight, orientation } = params;
  const points: AnalemmaPoint[] = [];

  for (let day = 1; day <= 365; day++) {
    const { altitude, azimuth } = getSolarPosition(day, lat, lng, tzMeridian, hour);
    // Only skip individual points where the sun is below the horizon
    if (altitude <= 0) continue;

    const coords = projectShadowToSurface(altitude, azimuth, gnomonHeight, orientation, lat);
    points.push({ day, x: coords.x, y: coords.y });
  }

  // Close the loop if possible
  if (points.length > 1) {
    points.push({ ...points[0] });
  }

  return points;
}

// ============================================================================
// Auto Gnomon Height Calculation
// ============================================================================

/**
 * Calculate gnomon height based on winter-to-summer solstice shadow distance
 */
export function calculateAutoGnomonHeight(
  lat: number,
  lng: number,
  tzMeridian: number,
  pageHeight: number
): number {
  const winterSolsticeDay = 355;
  const summerSolsticeDay = 172;
  const noonHour = 12;

  // Calculate shadow positions for winter and summer solstices at noon
  const winterPos = getSolarPosition(winterSolsticeDay, lat, lng, tzMeridian, noonHour);
  const summerPos = getSolarPosition(summerSolsticeDay, lat, lng, tzMeridian, noonHour);

  if (winterPos.altitude <= 0 || summerPos.altitude <= 0) {
    // Fallback to original calculation if sun is below horizon
    return Math.round(Math.tan((lat * Math.PI) / 180) * 100 * 3.7 / 8);
  }

  // Project shadows to surface (using a temporary gnomon height of 1)
  const tempGnomonHeight = 1;
  const winterShadow = projectShadowToSurface(winterPos.altitude, winterPos.azimuth, tempGnomonHeight, 'Horizontal', lat);
  const summerShadow = projectShadowToSurface(summerPos.altitude, summerPos.azimuth, tempGnomonHeight, 'Horizontal', lat);

  // Calculate the distance between winter and summer shadows
  const shadowDistance = Math.abs(winterShadow.y - summerShadow.y);

  // Calculate required gnomon height to make this distance 40% of page height
  const targetDistance = pageHeight * 0.4;
  const requiredGnomonHeight = targetDistance / shadowDistance;

  // Reduce to 66% of previous value, then increase by factor of 55/40
  return Math.round(requiredGnomonHeight * 0.66 * (55 / 40));
}
