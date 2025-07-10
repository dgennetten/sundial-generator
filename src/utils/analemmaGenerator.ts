// src/utils/analemmaGenerator.ts

export type Orientation = 'Horizontal' | 'Vertical' | 'Equatorial';

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function getEquationOfTime(dayOfYear: number): number {
  const B = degreesToRadians((360 / 365) * (dayOfYear - 81));
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // in minutes
}

export function getSolarDeclination(dayOfYear: number): number {
  return 23.44 * Math.sin(degreesToRadians((360 / 365) * (dayOfYear - 81)));
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
    if (altitude <= 0) continue;

    const coords = projectShadowToSurface(altitude, azimuth, gnomonHeight, orientation, lat);
    points.push({ day, x: coords.x, y: coords.y });
  }

  return points;
}