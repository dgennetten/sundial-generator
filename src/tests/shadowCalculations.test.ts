import { describe, it, expect } from 'vitest';
import { 
  getSolarPosition, 
  projectShadowToSurface, 
  getSolarDeclination, 
  getEquationOfTime,
  degreesToRadians 
} from '../utils/analemmaGenerator';

describe('Shadow Calculations - Fort Collins Test', () => {
  // Fort Collins coordinates
  const latitude = 40.5853;  // degrees North
  const longitude = -105.0844; // degrees West
  const timezone = -7; // Mountain Standard Time (UTC-7)
  const tzMeridian = -105; // Mountain Time zone meridian
  const gnomonHeight = 1.0; // Normalized gnomon height of 1 unit
  const testHour = 12.0; // Noon (solar time will be adjusted)

  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayOfYear = Math.floor((tomorrow.getTime() - new Date(tomorrow.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const year = tomorrow.getFullYear();

  describe('Hughes, Yallop & Hohenkerk Algorithm Components', () => {
    it('should calculate solar declination for tomorrow', () => {
      const declination = getSolarDeclination(dayOfYear, year);
      
      // Solar declination should be between -23.44° and +23.44°
      expect(declination).toBeGreaterThanOrEqual(-23.44);
      expect(declination).toBeLessThanOrEqual(23.44);
      
      // Check that declination is a finite number
      expect(declination).toBeTypeOf('number');
      expect(Number.isFinite(declination)).toBe(true);
      
      console.log(`Tomorrow (day ${dayOfYear}): Solar declination = ${declination.toFixed(4)}°`);
    });

    it('should calculate equation of time for tomorrow', () => {
      const eot = getEquationOfTime(dayOfYear, year);
      
      // Equation of time should be between -16.5 and +14.3 minutes
      expect(eot).toBeGreaterThanOrEqual(-16.5);
      expect(eot).toBeLessThanOrEqual(14.3);
      
      // Check that EoT is a finite number
      expect(eot).toBeTypeOf('number');
      expect(Number.isFinite(eot)).toBe(true);
      
      console.log(`Tomorrow (day ${dayOfYear}): Equation of Time = ${eot.toFixed(4)} minutes`);
    });
  });

  describe('Solar Position Calculations', () => {
    it('should calculate solar position at noon for Fort Collins tomorrow', () => {
      const solarPos = getSolarPosition(dayOfYear, latitude, longitude, tzMeridian, testHour);
      
      // Convert from radians to degrees for easier interpretation
      const altitudeDeg = solarPos.altitude * 180 / Math.PI;
      const azimuthDeg = solarPos.azimuth * 180 / Math.PI;
      
      // At noon, sun should be roughly south (azimuth around 180°)
      // Altitude depends on season and latitude
      expect(altitudeDeg).toBeGreaterThan(0); // Sun should be above horizon at noon
      expect(altitudeDeg).toBeLessThan(90); // Sun should not be at zenith
      
      // Azimuth at solar noon should be close to 180° (south)
      expect(azimuthDeg).toBeGreaterThan(160);
      expect(azimuthDeg).toBeLessThan(200);
      
      // Check that values are finite
      expect(Number.isFinite(altitudeDeg)).toBe(true);
      expect(Number.isFinite(azimuthDeg)).toBe(true);
      
      console.log(`Solar position at noon: altitude = ${altitudeDeg.toFixed(2)}°, azimuth = ${azimuthDeg.toFixed(2)}°`);
    });
  });

  describe('Shadow Projection Calculations', () => {
    it('should calculate shadow length and angles for horizontal sundial', () => {
      // Get solar position
      const solarPos = getSolarPosition(dayOfYear, latitude, longitude, tzMeridian, testHour);
      
      // Project shadow onto horizontal surface
      const shadowCoords = projectShadowToSurface(
        solarPos.altitude, 
        solarPos.azimuth, 
        gnomonHeight, 
        'Horizontal', 
        latitude
      );
      
      // Calculate shadow length (normalized by gnomon height)
      const shadowLength = Math.sqrt(shadowCoords.x * shadowCoords.x + shadowCoords.y * shadowCoords.y);
      const normalizedShadowLength = shadowLength / gnomonHeight;
      
      // Calculate shadow angle from north
      const shadowAngleDeg = Math.atan2(shadowCoords.x, shadowCoords.y) * 180 / Math.PI;
      
      // Alternative calculation using trigonometry for verification
      const altitudeDeg = solarPos.altitude * 180 / Math.PI;
      const expectedShadowLength = gnomonHeight / Math.tan(solarPos.altitude);
      const expectedNormalizedLength = expectedShadowLength / gnomonHeight;
      
      // Verify shadow length calculation
      expect(shadowLength).toBeCloseTo(expectedShadowLength, 6);
      expect(normalizedShadowLength).toBeCloseTo(expectedNormalizedLength, 6);
      
      // Shadow length should be positive and finite
      expect(shadowLength).toBeGreaterThan(0);
      expect(Number.isFinite(shadowLength)).toBe(true);
      expect(Number.isFinite(normalizedShadowLength)).toBe(true);
      
      // Shadow coordinates should be finite
      expect(Number.isFinite(shadowCoords.x)).toBe(true);
      expect(Number.isFinite(shadowCoords.y)).toBe(true);
      
      // At noon in the northern hemisphere, shadow should point roughly north
      // Since azimuth ~180° (south) and y = -sy where sy = shadowLength * cos(azimuth)
      // cos(180°) = -1, so sy is negative, making y = -sy positive (pointing north)
      expect(shadowCoords.y).toBeGreaterThan(0);
      
      console.log(`Shadow calculations:`);
      console.log(`  - Shadow coordinates: (${shadowCoords.x.toFixed(4)}, ${shadowCoords.y.toFixed(4)})`);
      console.log(`  - Shadow length: ${shadowLength.toFixed(4)} units`);
      console.log(`  - Normalized shadow length: ${normalizedShadowLength.toFixed(4)}`);
      console.log(`  - Shadow angle from north: ${shadowAngleDeg.toFixed(2)}°`);
      console.log(`  - Expected length (1/tan(altitude)): ${expectedNormalizedLength.toFixed(4)}`);
    });

    it('should verify shadow calculations using independent trigonometric method', () => {
      // Get solar position using Hughes, Yallop & Hohenkerk algorithm
      const solarPos = getSolarPosition(dayOfYear, latitude, longitude, tzMeridian, testHour);
      
      // Independent calculation using basic trigonometry
      const altitudeRad = solarPos.altitude;
      const azimuthRad = solarPos.azimuth;
      
      // Direct trigonometric calculation for horizontal sundial
      // This matches the projectShadowToSurface implementation: y = -sy where sy = length * cos(azimuth)
      const shadowLength_trig = gnomonHeight / Math.tan(altitudeRad);
      const shadowX_trig = shadowLength_trig * Math.sin(azimuthRad);
      const shadowY_trig = -shadowLength_trig * Math.cos(azimuthRad); // Same as function: y = -sy
      
      // Get results from the projectShadowToSurface function
      const shadowCoords = projectShadowToSurface(altitudeRad, azimuthRad, gnomonHeight, 'Horizontal', latitude);
      
      // Compare the results
      expect(shadowCoords.x).toBeCloseTo(shadowX_trig, 10);
      expect(shadowCoords.y).toBeCloseTo(shadowY_trig, 10);
      
      const calculatedLength = Math.sqrt(shadowCoords.x ** 2 + shadowCoords.y ** 2);
      expect(calculatedLength).toBeCloseTo(shadowLength_trig, 10);
      
      console.log(`Verification using independent trigonometric calculation:`);
      console.log(`  - Trigonometric shadow: (${shadowX_trig.toFixed(6)}, ${shadowY_trig.toFixed(6)})`);
      console.log(`  - Function result: (${shadowCoords.x.toFixed(6)}, ${shadowCoords.y.toFixed(6)})`);
      console.log(`  - Length difference: ${Math.abs(calculatedLength - shadowLength_trig).toFixed(10)}`);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very low sun altitudes', () => {
      // Test with a very low altitude (near horizon)
      const lowAltitude = degreesToRadians(1); // 1 degree above horizon
      const azimuth = degreesToRadians(180); // South
      
      const shadowCoords = projectShadowToSurface(lowAltitude, azimuth, gnomonHeight, 'Horizontal', latitude);
      
      // Shadow should be very long but finite
      const shadowLength = Math.sqrt(shadowCoords.x ** 2 + shadowCoords.y ** 2);
      expect(shadowLength).toBeGreaterThan(10); // Should be much longer than gnomon
      expect(Number.isFinite(shadowLength)).toBe(true);
    });

    it('should handle zero altitude gracefully', () => {
      // Test with zero altitude (sun at horizon)
      const zeroAltitude = 0;
      const azimuth = degreesToRadians(180);
      
      const shadowCoords = projectShadowToSurface(zeroAltitude, azimuth, gnomonHeight, 'Horizontal', latitude);
      
      // Should return origin coordinates when sun is at horizon
      expect(shadowCoords.x).toBe(0);
      expect(shadowCoords.y).toBe(0);
    });
  });

  describe('Test Information Summary', () => {
    it('should log comprehensive test information', () => {
      const solarPos = getSolarPosition(dayOfYear, latitude, longitude, tzMeridian, testHour);
      const shadowCoords = projectShadowToSurface(solarPos.altitude, solarPos.azimuth, gnomonHeight, 'Horizontal', latitude);
      const shadowLength = Math.sqrt(shadowCoords.x ** 2 + shadowCoords.y ** 2);
      
      console.log(`\n=== SHADOW CALCULATION TEST SUMMARY ===`);
      console.log(`Test Date: ${tomorrow.toLocaleDateString()} (Day ${dayOfYear} of ${year})`);
      console.log(`Location: Fort Collins, CO (${latitude}°N, ${longitude}°W)`);
      console.log(`Test Time: 12:00 PM (Local Solar Time)`);
      console.log(`Gnomon Height: ${gnomonHeight} unit(s)`);
      console.log(`\nHughes, Yallop & Hohenkerk Algorithm Results:`);
      console.log(`  Solar Declination: ${getSolarDeclination(dayOfYear, year).toFixed(4)}°`);
      console.log(`  Equation of Time: ${getEquationOfTime(dayOfYear, year).toFixed(4)} minutes`);
      console.log(`  Solar Altitude: ${(solarPos.altitude * 180 / Math.PI).toFixed(4)}°`);
      console.log(`  Solar Azimuth: ${(solarPos.azimuth * 180 / Math.PI).toFixed(4)}°`);
      console.log(`\nShadow Results:`);
      console.log(`  Shadow Length: ${shadowLength.toFixed(6)} units`);
      console.log(`  Normalized Length: ${(shadowLength/gnomonHeight).toFixed(6)}`);
      console.log(`  Shadow Coordinates: (${shadowCoords.x.toFixed(6)}, ${shadowCoords.y.toFixed(6)})`);
      console.log(`===========================================\n`);
      
      // This test always passes - it's just for information
      expect(true).toBe(true);
    });
  });
});