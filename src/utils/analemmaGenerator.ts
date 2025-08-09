// src/utils/analemmaGenerator.ts

export type Orientation = 'Horizontal' | 'Vertical' | 'Equatorial';

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate common astronomical parameters for solar position calculations
 * Based on the Hughes, Yallop & Hohenkerk algorithm (1989)
 * @param dayOfYear Day of year (1-365/366)
 * @param year Full year (e.g., 2024)
 * @returns Object containing astronomical parameters
 */
function getAstronomicalParameters(dayOfYear: number, year: number) {
  // Calculate days since J2000.0 epoch (noon UTC, January 1, 2000)
  // Use a simpler and more reliable method to calculate days since epoch
  const jan1Year = new Date(year, 0, 1);
  const jan1_2000 = new Date(2000, 0, 1);
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
 * @param dayOfYear Day of year (1-365/366)
 * @param year Full year (e.g., 2024) - needed for proper astronomical calculations
 * @returns Equation of Time in minutes
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
  
  // Return the astronomical EoT (positive when sun is fast)
  return eotMinutes;
}

/**
 * Calculate the Solar Declination using the same astronomical method as the Equation of Time
 * This ensures consistency with the Hughes, Yallop & Hohenkerk approach
 * @param dayOfYear Day of year (1-365/366)
 * @param year Full year (e.g., 2024) - needed for proper astronomical calculations
 * @returns Solar declination in degrees
 */
export function getSolarDeclination(dayOfYear: number, year: number = new Date().getFullYear()): number {
  const params = getAstronomicalParameters(dayOfYear, year);
  
  // Solar declination (degrees)
  const declinationRad = Math.asin(Math.sin(params.obliquityRad) * Math.sin(params.eclipticLongRad));
  return (declinationRad * 180) / Math.PI;
}

export function getSolarPosition(
  day: number,
  lat: number,
  lng: number,
  tzMeridian: number,
  hour: number
) {
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

export function projectShadowToSurface(
  altitude: number,
  azimuth: number,
  gnomonHeight: number,
  orientation: Orientation,
  latitude: number
): { x: number; y: number } {
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

  if (orientation === 'Equatorial') {
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

export function getAnalemmaPointsProjected(params: AnalemmaParams): {
  day: number;
  x: number;
  y: number;
}[] {
  const { lat, lng, tzMeridian, hour, gnomonHeight, orientation } = params;
  const points: { day: number; x: number; y: number }[] = [];

  for (let day = 1; day <= 365; day++) {
    const { altitude, azimuth } = getSolarPosition(day, lat, lng, tzMeridian, hour);
    // Only skip individual points where the sun is below the horizon
    // This allows hour lines to show for days when the sun is visible at that hour
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