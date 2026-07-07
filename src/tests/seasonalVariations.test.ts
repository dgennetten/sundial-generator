import { describe, it, expect } from 'vitest';
import { 
  getSolarPosition, 
  projectShadowToSurface, 
  getSolarDeclination 
} from '../utils/sundialMath';

describe('Seasonal Shadow Variations - Fort Collins', () => {
  const latitude = 40.5853;
  const longitude = -105.0844;
  const tzMeridian = -105;
  const gnomonHeight = 1.0;
  const testHour = 12.0; // Noon
  const testYear = 2025;

  // Key dates for testing seasonal variations
  const seasonalDates = {
    winterSolstice: { day: 355, name: 'Winter Solstice (Dec 21)' },
    springEquinox: { day: 80, name: 'Spring Equinox (Mar 21)' },
    summerSolstice: { day: 172, name: 'Summer Solstice (Jun 21)' },
    fallEquinox: { day: 266, name: 'Fall Equinox (Sep 23)' }
  };

  describe('Solar Declination Seasonal Range', () => {
    it('should show maximum declination range from winter to summer solstice', () => {
      const winterDecl = getSolarDeclination(seasonalDates.winterSolstice.day, testYear);
      const summerDecl = getSolarDeclination(seasonalDates.summerSolstice.day, testYear);
      
      // Winter solstice: sun at maximum southern declination (~-23.4°)
      expect(winterDecl).toBeLessThan(-23.0);
      expect(winterDecl).toBeGreaterThan(-24.0);
      
      // Summer solstice: sun at maximum northern declination (~+23.4°)
      expect(summerDecl).toBeGreaterThan(23.0);
      expect(summerDecl).toBeLessThan(24.0);
      
      // Total range should be close to 46.8° (2 × 23.4°)
      const declRange = summerDecl - winterDecl;
      expect(declRange).toBeCloseTo(46.8, 0.5);
      
      console.log(`Declination range: ${winterDecl.toFixed(2)}° to ${summerDecl.toFixed(2)}° (${declRange.toFixed(2)}° total)`);
    });
  });

  describe('Shadow Length Seasonal Variations', () => {
    Object.entries(seasonalDates).forEach(([, dateInfo]) => {
      it(`should calculate realistic shadow length for ${dateInfo.name}`, () => {
        const solarPos = getSolarPosition(dateInfo.day, latitude, longitude, tzMeridian, testHour);
        const shadowCoords = projectShadowToSurface(solarPos.altitude, solarPos.azimuth, gnomonHeight, 'Horizontal', latitude);
        
        const altitudeDeg = solarPos.altitude * 180 / Math.PI;
        const shadowLength = Math.sqrt(shadowCoords.x ** 2 + shadowCoords.y ** 2);
        const normalizedLength = shadowLength / gnomonHeight;
        
        // Sun should be above horizon at noon for Fort Collins latitude
        expect(altitudeDeg).toBeGreaterThan(0);
        expect(altitudeDeg).toBeLessThan(90);
        
        // Shadow length should be reasonable (not infinite)
        expect(normalizedLength).toBeGreaterThan(0);
        expect(normalizedLength).toBeLessThan(10); // Less than 10x gnomon height
        
        console.log(`${dateInfo.name}: altitude=${altitudeDeg.toFixed(1)}°, shadow=${normalizedLength.toFixed(3)}x`);
      });
    });

    it('should show shortest shadow at summer solstice, longest at winter solstice', () => {
      // Calculate shadow lengths for solstices
      const winterPos = getSolarPosition(seasonalDates.winterSolstice.day, latitude, longitude, tzMeridian, testHour);
      const summerPos = getSolarPosition(seasonalDates.summerSolstice.day, latitude, longitude, tzMeridian, testHour);
      
      const winterShadow = projectShadowToSurface(winterPos.altitude, winterPos.azimuth, gnomonHeight, 'Horizontal', latitude);
      const summerShadow = projectShadowToSurface(summerPos.altitude, summerPos.azimuth, gnomonHeight, 'Horizontal', latitude);
      
      const winterLength = Math.sqrt(winterShadow.x ** 2 + winterShadow.y ** 2);
      const summerLength = Math.sqrt(summerShadow.x ** 2 + summerShadow.y ** 2);
      
      // Winter shadow should be longer than summer shadow
      expect(winterLength).toBeGreaterThan(summerLength);
      
      // The ratio should be significant (winter shadow is much longer)
      const ratio = winterLength / summerLength;
      expect(ratio).toBeGreaterThan(2.0); // At least 2x longer in winter
      
      console.log(`Shadow length ratio (winter/summer): ${ratio.toFixed(2)}x`);
      console.log(`Winter: ${winterLength.toFixed(3)}, Summer: ${summerLength.toFixed(3)}`);
    });
  });

  describe('Equinox Symmetry Test', () => {
    it('should have similar solar altitudes at spring and fall equinoxes', () => {
      const springPos = getSolarPosition(seasonalDates.springEquinox.day, latitude, longitude, tzMeridian, testHour);
      const fallPos = getSolarPosition(seasonalDates.fallEquinox.day, latitude, longitude, tzMeridian, testHour);
      
      const springAlt = springPos.altitude * 180 / Math.PI;
      const fallAlt = fallPos.altitude * 180 / Math.PI;
      
      // At equinoxes, sun should be at similar altitudes (within 2 degrees)
      expect(Math.abs(springAlt - fallAlt)).toBeLessThan(2.0);
      
      // Theoretical expectation: 90° - latitude = 90° - 40.6° = 49.4°
      // But Earth's elliptical orbit causes real equinox altitudes to differ from this simple calculation
      // Real astronomy shows equinox altitudes can vary by ~0.4° due to orbital mechanics
      const expectedAlt = 90 - latitude;
      
      // Both equinox altitudes should be reasonably close to the theoretical value
      expect(Math.abs(springAlt - expectedAlt)).toBeLessThan(1.0);
      expect(Math.abs(fallAlt - expectedAlt)).toBeLessThan(1.0);
      
      console.log(`Equinox altitudes: Spring=${springAlt.toFixed(2)}°, Fall=${fallAlt.toFixed(2)}°`);
      console.log(`Expected (90° - lat): ${expectedAlt.toFixed(2)}°`);
    });
  });
});