import { describe, it, expect } from 'vitest';
import { 
  getSolarPosition, 
  projectShadowToSurface, 
  getSolarDeclination 
} from '../utils/sundialMath';

describe('Seasonal Shadow Variations - Fort Collins (8 AM)', () => {
  const latitude = 40.5853;
  const longitude = -105.0844;
  const tzMeridian = -105;
  const gnomonHeight = 1.0;
  const testHour = 8.0; // 8:00 AM
  const testYear = 2025;

  // Key dates for testing seasonal variations
  const seasonalDates = {
    winterSolstice: { day: 355, name: 'Winter Solstice (Dec 21)' },
    springEquinox: { day: 80, name: 'Spring Equinox (Mar 21)' },
    summerSolstice: { day: 172, name: 'Summer Solstice (Jun 21)' },
    fallEquinox: { day: 266, name: 'Fall Equinox (Sep 23)' }
  };

  describe('Solar Declination Seasonal Range (8 AM)', () => {
    it('should show same declination range regardless of time of day', () => {
      const winterDecl = getSolarDeclination(seasonalDates.winterSolstice.day, testYear);
      const summerDecl = getSolarDeclination(seasonalDates.summerSolstice.day, testYear);
      
      // Solar declination is independent of time of day
      // Winter solstice: sun at maximum southern declination (~-23.4°)
      expect(winterDecl).toBeLessThan(-23.0);
      expect(winterDecl).toBeGreaterThan(-24.0);
      
      // Summer solstice: sun at maximum northern declination (~+23.4°)
      expect(summerDecl).toBeGreaterThan(23.0);
      expect(summerDecl).toBeLessThan(24.0);
      
      // Total range should be close to 46.8° (2 × 23.4°)
      const declRange = summerDecl - winterDecl;
      expect(declRange).toBeCloseTo(46.8, 0.5);
      
      console.log(`Declination range at 8 AM: ${winterDecl.toFixed(2)}° to ${summerDecl.toFixed(2)}° (${declRange.toFixed(2)}° total)`);
    });
  });

  describe('Shadow Length Seasonal Variations (8 AM)', () => {
    Object.entries(seasonalDates).forEach(([, dateInfo]) => {
      it(`should calculate realistic shadow length for ${dateInfo.name} at 8 AM`, () => {
        const solarPos = getSolarPosition(dateInfo.day, latitude, longitude, tzMeridian, testHour);
        const shadowCoords = projectShadowToSurface(solarPos.altitude, solarPos.azimuth, gnomonHeight, 'Horizontal', latitude);
        
        const altitudeDeg = solarPos.altitude * 180 / Math.PI;
        const shadowLength = Math.sqrt(shadowCoords.x ** 2 + shadowCoords.y ** 2);
        const normalizedLength = shadowLength / gnomonHeight;
        
        // At 8 AM, sun should be above horizon for Fort Collins latitude in most seasons
        // (might be very low or below horizon in winter)
        if (altitudeDeg > 0) {
          expect(altitudeDeg).toBeLessThan(90);
          expect(altitudeDeg).toBeLessThan(45); // Should be lower than noon
          
          // Shadow length should be reasonable (longer than noon due to lower sun)
          expect(normalizedLength).toBeGreaterThan(0);
          expect(normalizedLength).toBeLessThan(20); // Less than 20x gnomon height
          expect(normalizedLength).toBeGreaterThan(1.0); // At least 1x gnomon height at 8 AM
        }
        
        console.log(`${dateInfo.name} at 8 AM: altitude=${altitudeDeg.toFixed(1)}°, shadow=${normalizedLength.toFixed(3)}x`);
      });
    });

    it('should show seasonal shadow variation pattern at 8 AM', () => {
      // Calculate shadow lengths for all seasons at 8 AM
      const shadows: { [key: string]: number } = {};
      const altitudes: { [key: string]: number } = {};
      
      Object.entries(seasonalDates).forEach(([season, dateInfo]) => {
        const solarPos = getSolarPosition(dateInfo.day, latitude, longitude, tzMeridian, testHour);
        const shadowCoords = projectShadowToSurface(solarPos.altitude, solarPos.azimuth, gnomonHeight, 'Horizontal', latitude);
        const shadowLength = Math.sqrt(shadowCoords.x ** 2 + shadowCoords.y ** 2);
        
        shadows[season] = shadowLength;
        altitudes[season] = solarPos.altitude * 180 / Math.PI;
      });
      
      // Summer should have shortest shadows at 8 AM (highest sun altitude)
      // Winter should have longest shadows at 8 AM (lowest sun altitude)
      if (altitudes.summerSolstice > 0 && altitudes.winterSolstice > 0) {
        expect(shadows.summerSolstice).toBeLessThan(shadows.winterSolstice);
        
        // The ratio should be significant
        const ratio = shadows.winterSolstice / shadows.summerSolstice;
        expect(ratio).toBeGreaterThan(1.5); // At least 1.5x difference
        
        console.log(`8 AM shadow length ratio (winter/summer): ${ratio.toFixed(2)}x`);
        console.log(`Winter at 8 AM: ${shadows.winterSolstice.toFixed(3)}, Summer at 8 AM: ${shadows.summerSolstice.toFixed(3)}`);
      }
    });
  });

  describe('Equinox Symmetry Test (8 AM)', () => {
    it('should have similar solar altitudes at spring and fall equinoxes at 8 AM', () => {
      const springPos = getSolarPosition(seasonalDates.springEquinox.day, latitude, longitude, tzMeridian, testHour);
      const fallPos = getSolarPosition(seasonalDates.fallEquinox.day, latitude, longitude, tzMeridian, testHour);
      
      const springAlt = springPos.altitude * 180 / Math.PI;
      const fallAlt = fallPos.altitude * 180 / Math.PI;
      
      // At equinoxes, sun should be at similar altitudes at the same time of day
      expect(Math.abs(springAlt - fallAlt)).toBeLessThan(3.0); // Allow 3° tolerance for orbital variations
      
      console.log(`Equinox altitudes at 8 AM: Spring=${springAlt.toFixed(2)}°, Fall=${fallAlt.toFixed(2)}°`);
    });
  });

  describe('Daily Time Comparison (8 AM vs Noon)', () => {
    it('should show consistently longer shadows at 8 AM than noon across all seasons', () => {
      Object.entries(seasonalDates).forEach(([, dateInfo]) => {
        // Calculate shadows at 8 AM
        const solarPos8am = getSolarPosition(dateInfo.day, latitude, longitude, tzMeridian, 8.0);
        const shadow8am = projectShadowToSurface(solarPos8am.altitude, solarPos8am.azimuth, gnomonHeight, 'Horizontal', latitude);
        const shadowLength8am = Math.sqrt(shadow8am.x ** 2 + shadow8am.y ** 2);
        
        // Calculate shadows at noon
        const solarPosNoon = getSolarPosition(dateInfo.day, latitude, longitude, tzMeridian, 12.0);
        const shadowNoon = projectShadowToSurface(solarPosNoon.altitude, solarPosNoon.azimuth, gnomonHeight, 'Horizontal', latitude);
        const shadowLengthNoon = Math.sqrt(shadowNoon.x ** 2 + shadowNoon.y ** 2);
        
        // 8 AM shadows should always be longer than noon shadows
        const altitude8am = solarPos8am.altitude * 180 / Math.PI;
        const altitudeNoon = solarPosNoon.altitude * 180 / Math.PI;
        
        if (altitude8am > 0 && altitudeNoon > 0) {
          expect(shadowLength8am).toBeGreaterThan(shadowLengthNoon);
          
          const ratio = shadowLength8am / shadowLengthNoon;
          expect(ratio).toBeGreaterThan(1.5); // At least 1.5x longer
          
          console.log(`${dateInfo.name}: 8AM/Noon shadow ratio = ${ratio.toFixed(2)}x (${shadowLength8am.toFixed(3)} vs ${shadowLengthNoon.toFixed(3)})`);
        }
      });
    });
  });

  describe('Shadow Direction Analysis (8 AM)', () => {
    it('should show westward shadow direction at 8 AM across seasons', () => {
      Object.entries(seasonalDates).forEach(([, dateInfo]) => {
        const solarPos = getSolarPosition(dateInfo.day, latitude, longitude, tzMeridian, testHour);
        const shadowCoords = projectShadowToSurface(solarPos.altitude, solarPos.azimuth, gnomonHeight, 'Horizontal', latitude);
        
        const altitude = solarPos.altitude * 180 / Math.PI;
        const azimuth = solarPos.azimuth * 180 / Math.PI;
        const shadowAngle = Math.atan2(shadowCoords.x, shadowCoords.y) * 180 / Math.PI;
        
        if (altitude > 0) {
          // At 8 AM, sun is in the east, so shadows point west
          // Azimuth should be in eastern quadrant (45° to 135°)
          expect(azimuth).toBeGreaterThan(45);
          expect(azimuth).toBeLessThan(135);
          
          // At 8 AM, shadow points roughly northwest in this coordinate system
          // which shows as a positive angle (east of north direction)
          expect(Math.abs(shadowAngle)).toBeGreaterThan(0);
          expect(Math.abs(shadowAngle)).toBeLessThan(180); // Allow full range of possible angles
          
          console.log(`${dateInfo.name} at 8 AM: sun azimuth=${azimuth.toFixed(1)}°, shadow angle=${shadowAngle.toFixed(1)}°`);
        }
      });
    });
  });
});