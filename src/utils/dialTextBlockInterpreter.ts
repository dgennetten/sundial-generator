import { computeInclineDegrees } from './sundialMath';
import type { DateRange, InclineType, DeclinationType } from '../types';

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
 * The {today} placeholder is expanded only when the "Today" declination line is active,
 * mirroring the on-dial rendering so the report matches the exported dial.
 */
export function interpretDialTextBlockForEmail(template: string, ctx: {
  locationName?: string;
  latitude?: number;
  longitude?: number;
  dateRange?: DateRange;
  gnomonHeightMm?: number;
  inclineType?: InclineType;
  tiltAngle?: number;
  declinationType?: DeclinationType;
  declinationDegrees?: number;
  todayLineActive?: boolean;
}): string {
  if (!template) return '';

  const displayLat = typeof ctx.latitude === 'number' ? ctx.latitude : undefined;
  const displayLng = typeof ctx.longitude === 'number' ? ctx.longitude : undefined;

  let locationString = ctx.locationName || '';
  if (!locationString && typeof displayLat === 'number' && typeof displayLng === 'number') {
    locationString = `Lat: ${displayLat.toFixed(2)}, Lon: ${displayLng.toFixed(2)}`;
  }

  const latStr = typeof displayLat === 'number' ? displayLat.toFixed(2) : '';
  const lngStr = typeof displayLng === 'number' ? displayLng.toFixed(2) : '';

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
    ctx.inclineType && typeof inclineDegrees === 'number' && Math.abs(inclineDegrees) >= 0.05
      ? `incline: ${inclineDegrees.toFixed(1)}°`
      : '';

  const isNorthern = (ctx.latitude ?? 0) >= 0;
  const defaultDecl = isNorthern ? 'North' : 'South';
  const isNonDefaultDeclination = ctx.declinationType && ctx.declinationType !== defaultDecl;
  const declDeg = ctx.declinationDegrees ?? 0;
  const declineString =
    isNonDefaultDeclination && Math.abs(declDeg) >= 0.05
      ? `decline: ${declDeg.toFixed(1)}°`
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
    .replace(/\{latitude-label\}/gi, 'Latitude')
    .replace(/\{longitude-label\}/gi, 'Longitude')
    .replace(/\{latitude\}/gi, latStr)
    .replace(/\{longitude\}/gi, lngStr)
    .replace(/\{half-year\}/gi, halfYearString)
    .replace(/\{gnomon\}/gi, gnomonString)
    .replace(/\{incline\}/gi, inclineString)
    .replace(/\{decline\}/gi, (inclineString && declineString) ? `, ${declineString}` : declineString);

  // Expand {today} only when the Today line is active on the dial; otherwise
  // strip the placeholder so the report matches what was actually exported.
  if (ctx.todayLineActive) {
    const todayDate = getTodayDateString();
    processedText = processedText
      .replace(/\*\*\{today\}\*\*/gi, `**${todayDate}**`)
      .replace(/\*\{today\}\*/gi, `*${todayDate}*`)
      .replace(/\{today\}/gi, `**${todayDate}**`);
  } else {
    processedText = processedText
      .replace(/\*\*\{today\}\*\*/gi, '')
      .replace(/\*\{today\}\*/gi, '')
      .replace(/\{today\}/gi, '');
  }

  // Strip [colorname] line prefixes — they're display-only markup, not meaningful in plain text
  processedText = processedText.replace(/^\[[a-zA-Z]+\]/gm, '');

  return processedText;
}






