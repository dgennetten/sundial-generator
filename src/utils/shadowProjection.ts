// src/utils/shadowProjection.ts
// Shared "sun position → shadow tip" calculation.
//
// This exact sequence (solar altitude/azimuth from the hour angle, optional
// atmospheric-refraction correction, then computeShadowPoint) was copy-pasted
// into every hour-line, date-line and noonmark builder in SundialPreview.tsx.
// Extracting it removes that duplication and gives the calculation a direct
// unit test.

import {
  computeShadowPoint,
  degreesToRadians,
  radiansToDegrees,
  atmosphericRefraction,
} from './sundialMath';

export interface ShadowSample {
  /** Geometric solar altitude in radians (no refraction applied). */
  altitude: number;
  /** Solar azimuth in radians (from North clockwise, dial sign convention applied). */
  azimuth: number;
  /** Shadow-tip position on the dial surface (mm), or null when it cannot be projected. */
  coords: { x: number; y: number } | null;
}

/**
 * Compute the solar altitude/azimuth for a latitude, solar declination and local
 * hour, then project the gnomon's shadow tip onto the dial surface.
 *
 * `applyRefraction` mirrors the on-dial atmospheric-refraction correction: when
 * true the altitude fed to the shadow projection is bent upward by
 * {@link atmosphericRefraction}. The returned `altitude` is always the geometric
 * (un-refracted) value so callers can keep using it for above-horizon tests.
 *
 * @param latDeg          geographic latitude, degrees (+N / −S)
 * @param declDeg         solar declination, degrees
 * @param hour            local hour (solar), 0–24; noon = 12
 * @param gnomonHeight    perpendicular style height above the dial surface (mm)
 * @param dialInclination dial tilt from horizontal, degrees (0 = flat, 90 = vertical)
 * @param dialDeclination dial rotation from poleward, degrees (+West / −East)
 * @param applyRefraction whether to apply the atmospheric-refraction correction
 */
export function calculateShadowAtTime(
  latDeg: number,
  declDeg: number,
  hour: number,
  gnomonHeight: number,
  dialInclination: number,
  dialDeclination: number,
  applyRefraction: boolean,
): ShadowSample {
  const latRad = degreesToRadians(latDeg);
  const declRad = degreesToRadians(declDeg);
  const hourAngle = degreesToRadians(15 * (hour - 12));

  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
  const altitude = Math.asin(sinAlt);

  const altitudeForShadow = applyRefraction
    ? degreesToRadians(radiansToDegrees(altitude) + atmosphericRefraction(radiansToDegrees(altitude)))
    : altitude;

  let cosAz =
    (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) /
    (Math.cos(altitude) * Math.cos(latRad));
  cosAz = Math.max(-1, Math.min(1, cosAz));
  let azimuth = Math.acos(cosAz);
  if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;

  const coords = computeShadowPoint(
    altitudeForShadow,
    azimuth,
    gnomonHeight,
    latDeg,
    dialInclination,
    dialDeclination,
  );

  return { altitude, azimuth, coords };
}
