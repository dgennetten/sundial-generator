import { describe, it, expect } from 'vitest';
import { interpretDialTextBlockForEmail } from '../utils/dialTextBlockInterpreter';

// Covers the placeholder-substitution logic used to build the plain-text
// dial description that ships in export notification emails.

function todayString(): string {
  const today = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[today.getMonth()]} ${today.getDate()}`;
}

describe('interpretDialTextBlockForEmail', () => {
  it('returns an empty string for an empty template', () => {
    expect(interpretDialTextBlockForEmail('', {})).toBe('');
  });

  it('passes text through unchanged when there are no placeholders', () => {
    expect(interpretDialTextBlockForEmail('A plain sundial note.', {})).toBe('A plain sundial note.');
  });

  it('substitutes {location} with the location name (case-insensitive)', () => {
    expect(interpretDialTextBlockForEmail('{location}', { locationName: 'Fort Collins' })).toBe('Fort Collins');
    expect(interpretDialTextBlockForEmail('{LOCATION}', { locationName: 'Fort Collins' })).toBe('Fort Collins');
  });

  it('derives a Lat/Lon location string when no name is supplied', () => {
    const out = interpretDialTextBlockForEmail('{location}', { latitude: 40.5853, longitude: -105.0844 });
    expect(out).toBe('Lat: 40.59, Lon: -105.08');
  });

  it('strips {location} (and bold/italic wrappers) for the "Custom Lat/Long" sentinel', () => {
    expect(interpretDialTextBlockForEmail('**{location}**', { locationName: 'Custom Lat/Long' })).toBe('');
    const multi = interpretDialTextBlockForEmail('Top\n\n{location}\n\nBottom', { locationName: 'Custom Lat/Long' });
    expect(multi).not.toContain('{location}');
  });

  it('substitutes coordinate values and labels', () => {
    const out = interpretDialTextBlockForEmail(
      '{latitude-label}: {latitude}, {longitude-label}: {longitude}',
      { latitude: 40.5853, longitude: -105.0844 },
    );
    expect(out).toBe('Latitude: 40.59, Longitude: -105.08');
  });

  it('maps {half-year} for each date range', () => {
    expect(interpretDialTextBlockForEmail('{half-year}', { dateRange: 'FullYear' })).toBe('');
    expect(interpretDialTextBlockForEmail('{half-year}', { dateRange: 'SummerToFall' })).toBe('Summer - Fall');
    expect(interpretDialTextBlockForEmail('{half-year}', { dateRange: 'WinterToSpring' })).toBe('Winter - Spring');
  });

  it('renders {gnomon} only for finite heights', () => {
    expect(interpretDialTextBlockForEmail('{gnomon}', { gnomonHeightMm: 25 })).toBe('height: 25 mm');
    expect(interpretDialTextBlockForEmail('{gnomon}', {})).toBe('');
  });

  it('renders {incline} when the angle is meaningful and blanks it otherwise', () => {
    expect(interpretDialTextBlockForEmail('{incline}', { inclineType: 'Vertical' })).toBe('incline: 90.0°');
    // Horizontal with ~0 tilt is below the 0.05° threshold -> blank
    expect(interpretDialTextBlockForEmail('{incline}', { inclineType: 'Horizontal', tiltAngle: 0 })).toBe('');
  });

  it('renders {decline} for a non-default wall declination', () => {
    // Northern hemisphere default is North; South is non-default.
    const out = interpretDialTextBlockForEmail('{decline}', {
      latitude: 40.5853,
      declinationType: 'South',
      declinationDegrees: 12,
    });
    expect(out).toBe('decline: 12.0°');
  });

  it('expands {today} only when the Today line is active', () => {
    const active = interpretDialTextBlockForEmail('{today}', { todayLineActive: true });
    expect(active).toContain(todayString());
    expect(active).not.toContain('{today}');

    const inactive = interpretDialTextBlockForEmail('{today}', { todayLineActive: false });
    expect(inactive).toBe('');
  });

  it('strips [colorname] line-prefix markup', () => {
    expect(interpretDialTextBlockForEmail('[red]Sunrise line', {})).toBe('Sunrise line');
  });
});
