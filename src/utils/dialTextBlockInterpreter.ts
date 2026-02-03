import { computeInclineDegrees } from './sundialMath';
import type { DateRange, InclineType } from '../types';

function getTodayDateString(): string {
  const today = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[today.getMonth()]} ${today.getDate()}`;
}

/**
 * Expands Decoration text block placeholders into a single string, intended for logging/email.
 * Unlike on-dial rendering, this does NOT depend on whether a "Today" declination line is visible.
 */
export function interpretDialTextBlockForEmail(template: string, ctx: {
  locationName?: string;
  latitude?: number;
  longitude?: number;
  dateRange?: DateRange;
  gnomonHeightMm?: number;
  inclineType?: InclineType;
  tiltAngle?: number;
}): string {
  if (!template) return '';

  const displayLat = typeof ctx.latitude === 'number' ? ctx.latitude : undefined;
  const displayLng = typeof ctx.longitude === 'number' ? ctx.longitude : undefined;

  let locationString = ctx.locationName || '';
  if (!locationString && typeof displayLat === 'number' && typeof displayLng === 'number') {
    locationString = `Lat: ${displayLat.toFixed(3)}, Lon: ${displayLng.toFixed(3)}`;
  }

  const coordinatesString =
    typeof displayLat === 'number' && typeof displayLng === 'number'
      ? `Latitude: ${displayLat.toFixed(3)}, Longitude: ${displayLng.toFixed(3)}`
      : '';

  const halfYearString =
    ctx.dateRange === 'FullYear'
      ? ''
      : ctx.dateRange === 'SummerToFall'
        ? 'Summer - Fall'
        : ctx.dateRange === 'WinterToSpring'
          ? 'Winter - Spring'
          : '';

  const gnomonString =
    typeof ctx.gnomonHeightMm === 'number' && isFinite(ctx.gnomonHeightMm)
      ? `height: ${ctx.gnomonHeightMm} mm`
      : '';

  const inclineDegrees = computeInclineDegrees({
    inclineType: ctx.inclineType,
    latitude: ctx.latitude,
    tiltAngle: ctx.tiltAngle,
  });
  const inclineString =
    ctx.inclineType && ctx.inclineType !== 'Horizontal' && typeof inclineDegrees === 'number'
      ? `incline: ${inclineDegrees.toFixed(1)}°`
      : '';

  let processedText = template;
  
  // Remove {location} placeholder if location is "Custom Lat/Long", otherwise replace it
  if (locationString === 'Custom Lat/Long') {
    // Remove {location} and any surrounding formatting (like **{location}**)
    // Also handle cases with newlines before/after
    processedText = processedText
      .replace(/\*\*\{location\}\*\*/gi, '')  // Remove **{location}**
      .replace(/\*\{location\}\*/gi, '')      // Remove *{location}*
      .replace(/\{location\}/gi, '')          // Remove {location}
      .replace(/\n{3,}/g, '\n\n');            // Clean up multiple newlines
  } else {
    processedText = processedText.replace(/\{location\}/gi, locationString);
  }
  
  processedText = processedText
    .replace(/\{coordinates\}/gi, coordinatesString)
    .replace(/\{half-year\}/gi, halfYearString)
    .replace(/\{gnomon\}/gi, gnomonString)
    .replace(/\{incline\}/gi, inclineString);

  // Always expand {today} for email/logging (even if it isn't shown on the dial)
  const todayDate = getTodayDateString();
  processedText = processedText.replace(/\*?\{today\}\*?/gi, (match) => {
    if (match.startsWith('*') && match.endsWith('*')) {
      return `*${todayDate}*`;
    } else if (match.startsWith('*')) {
      return `*${todayDate}`;
    } else if (match.endsWith('*')) {
      return `${todayDate}*`;
    }
    return `*${todayDate}*`;
  });

  return processedText;
}






