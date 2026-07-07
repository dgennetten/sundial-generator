import { describe, it, expect } from 'vitest';
import { 
  getSolarPosition, 
  projectShadowToSurface, 
  getSolarDeclination, 
  getEquationOfTime 
} from '../utils/sundialMath';

describe('Shadow Calculations - Fort Collins 8 AM Test', () => {
  // Fort Collins coordinates
  const latitude = 40.5853;  // degrees North
  const longitude = -105.0844; // degrees West
  // const timezone = -7; // Mountain Standard Time (UTC-7) - not currently used
  const tzMeridian = -105; // Mountain Time zone meridian
  const gnomonHeight = 1.0; // Normalized gnomon height of 1 unit
  const testHour = 8.0; // 8:00 AM (solar time will be adjusted)
  const testYear = 2025;
  
  // Calculate tomorrow's date (day of year)
  const today = new Date();
  const testDay = Math.floor((today.getTime() - new Date(testYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  describe('Hughes, Yallop & Hohenkerk Algorithm Components', () => {
    it('should calculate solar declination for tomorrow at 8 AM', () => {
      const declination = getSolarDeclination(testDay, testYear);
      
      // Solar declination should be reasonable for late August
      // (between -25° and +25°, closer to +10° in late August)
      expect(declination).toBeGreaterThan(-25.0);
      expect(declination).toBeLessThan(25.0);
      
      // Should be finite
      expect(Number.isFinite(declination)).toBe(true);
      
      console.log(`Tomorrow (day ${testDay}): Solar declination = ${declination.toFixed(4)}°`);
    });

    it('should calculate equation of time for tomorrow at 8 AM', () => {
      const eqTime = getEquationOfTime(testDay, testYear);
      
      // Equation of time should be reasonable (typically -20 to +20 minutes)
      expect(eqTime).toBeGreaterThan(-20.0);
      expect(eqTime).toBeLessThan(20.0);
      
      // Should be finite
      expect(Number.isFinite(eqTime)).toBe(true);
      
      console.log(`Tomorrow (day ${testDay}): Equation of Time = ${eqTime.toFixed(4)} minutes`);
    });
  });

  describe('Solar Position Calculations', () => {
    it('should calculate solar position at 8 AM for Fort Collins tomorrow', () => {
      const solarPos = getSolarPosition(testDay, latitude, longitude, tzMeridian, testHour);
      
      // Convert to degrees for easier interpretation
      const altitudeDeg = solarPos.altitude * 180 / Math.PI;
      const azimuthDeg = solarPos.azimuth * 180 / Math.PI;
      
      // At 8 AM in Fort Collins in late August, sun should be:
      // - Above horizon but much lower than at noon
      // - In the eastern part of the sky (azimuth closer to 90°)
      expect(altitudeDeg).toBeGreaterThan(0); // Above horizon
      expect(altitudeDeg).toBeLessThan(90); // Below zenith
      expect(altitudeDeg).toBeLessThan(60); // Much lower than noon
      
      // Azimuth should be in eastern quadrant (between 45° and 135°)
      expect(azimuthDeg).toBeGreaterThan(45);
      expect(azimuthDeg).toBeLessThan(135);
      
      // Both values should be finite
      expect(Number.isFinite(altitudeDeg)).toBe(true);
      expect(Number.isFinite(azimuthDeg)).toBe(true);
      
      console.log(`Solar position at 8 AM: altitude = ${altitudeDeg.toFixed(2)}°, azimuth = ${azimuthDeg.toFixed(2)}°`);
    });
  });

  describe('Shadow Projection Calculations', () => {
    it('should calculate shadow length and angles for horizontal sundial at 8 AM', () => {
      // Get solar position
      const solarPos = getSolarPosition(testDay, latitude, longitude, tzMeridian, testHour);
      
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
      
      // At 8 AM, shadow should be longer than at noon due to lower sun angle
      // Expect shadow to be at least 1.5x gnomon height (longer than noon)
      expect(normalizedShadowLength).toBeGreaterThan(1.5);
      
      // At 8 AM in northern hemisphere, with sun in the east-southeast,
      // shadow points opposite direction (towards northwest)
      // In this coordinate system, positive angles are east of north
      expect(shadowAngleDeg).toBeGreaterThan(0); // East of north
      expect(shadowAngleDeg).toBeLessThan(90); // But less than due east
      
      console.log(`Shadow calculations at 8 AM:`);
      console.log(`  - Shadow coordinates: (${shadowCoords.x.toFixed(6)}, ${shadowCoords.y.toFixed(6)})`);
      console.log(`  - Shadow length: ${shadowLength.toFixed(6)} units`);
      console.log(`  - Normalized shadow length: ${normalizedShadowLength.toFixed(6)}`);
      console.log(`  - Shadow angle from north: ${shadowAngleDeg.toFixed(2)}°`);
      console.log(`  - Expected length (1/tan(altitude)): ${expectedShadowLength.toFixed(6)}`);
    });

    it('should verify shadow calculations using independent trigonometric method at 8 AM', () => {
      const solarPos = getSolarPosition(testDay, latitude, longitude, tzMeridian, testHour);
      
      // Use our function
      const shadowCoords = projectShadowToSurface(
        solarPos.altitude, 
        solarPos.azimuth, 
        gnomonHeight, 
        'Horizontal', 
        latitude
      );
      
      // Independent calculation using basic trigonometry
      const shadowLength = gnomonHeight / Math.tan(solarPos.altitude);
      const shadowX = shadowLength * Math.sin(solarPos.azimuth);
      const shadowY = -shadowLength * Math.cos(solarPos.azimuth);
      
      // Both methods should give identical results
      expect(shadowCoords.x).toBeCloseTo(shadowX, 6);
      expect(shadowCoords.y).toBeCloseTo(shadowY, 6);
      
      // Calculate the difference to show precision
      const lengthDifference = Math.abs(
        Math.sqrt(shadowCoords.x ** 2 + shadowCoords.y ** 2) - 
        Math.sqrt(shadowX ** 2 + shadowY ** 2)
      );
      
      console.log(`Verification using independent trigonometric calculation at 8 AM:`);
      console.log(`  - Trigonometric shadow: (${shadowX.toFixed(6)}, ${shadowY.toFixed(6)})`);
      console.log(`  - Function result: (${shadowCoords.x.toFixed(6)}, ${shadowCoords.y.toFixed(6)})`);
      console.log(`  - Length difference: ${lengthDifference.toFixed(10)}`);
    });
  });

  describe('Time Comparison with Noon', () => {
    it('should show longer shadows at 8 AM compared to noon', () => {
      // Calculate shadow at 8 AM
      const solarPos8am = getSolarPosition(testDay, latitude, longitude, tzMeridian, 8.0);
      const shadow8am = projectShadowToSurface(solarPos8am.altitude, solarPos8am.azimuth, gnomonHeight, 'Horizontal', latitude);
      const shadowLength8am = Math.sqrt(shadow8am.x ** 2 + shadow8am.y ** 2);
      
      // Calculate shadow at noon for comparison
      const solarPosNoon = getSolarPosition(testDay, latitude, longitude, tzMeridian, 12.0);
      const shadowNoon = projectShadowToSurface(solarPosNoon.altitude, solarPosNoon.azimuth, gnomonHeight, 'Horizontal', latitude);
      const shadowLengthNoon = Math.sqrt(shadowNoon.x ** 2 + shadowNoon.y ** 2);
      
      // 8 AM shadow should be significantly longer than noon shadow
      expect(shadowLength8am).toBeGreaterThan(shadowLengthNoon);
      
      // The ratio should be at least 2:1 (8 AM shadow at least 2x longer)
      const ratio = shadowLength8am / shadowLengthNoon;
      expect(ratio).toBeGreaterThan(2.0);
      
      console.log(`Shadow length comparison:`);
      console.log(`  - 8 AM: ${shadowLength8am.toFixed(3)} units`);
      console.log(`  - Noon: ${shadowLengthNoon.toFixed(3)} units`);
      console.log(`  - Ratio (8AM/Noon): ${ratio.toFixed(2)}x`);
    });

    it('should show different shadow directions at 8 AM vs noon', () => {
      // Calculate shadow angles
      const solarPos8am = getSolarPosition(testDay, latitude, longitude, tzMeridian, 8.0);
      const shadow8am = projectShadowToSurface(solarPos8am.altitude, solarPos8am.azimuth, gnomonHeight, 'Horizontal', latitude);
      const angle8am = Math.atan2(shadow8am.x, shadow8am.y) * 180 / Math.PI;
      
      const solarPosNoon = getSolarPosition(testDay, latitude, longitude, tzMeridian, 12.0);
      const shadowNoon = projectShadowToSurface(solarPosNoon.altitude, solarPosNoon.azimuth, gnomonHeight, 'Horizontal', latitude);
      const angleNoon = Math.atan2(shadowNoon.x, shadowNoon.y) * 180 / Math.PI;
      
      // Angles should be significantly different
      const angleDifference = Math.abs(angle8am - angleNoon);
      expect(angleDifference).toBeGreaterThan(45); // At least 45° difference
      
      // Angles should be significantly different
      // 8 AM shadow should point more eastward (larger positive angle)
      // Noon shadow should point nearly northward (close to 0°)
      expect(Math.abs(angle8am)).toBeGreaterThan(Math.abs(angleNoon));
      expect(Math.abs(angleNoon)).toBeLessThan(10); // Noon should be close to north
      
      console.log(`Shadow direction comparison:`);
      console.log(`  - 8 AM shadow angle: ${angle8am.toFixed(2)}° from north`);
      console.log(`  - Noon shadow angle: ${angleNoon.toFixed(2)}° from north`);
      console.log(`  - Angular difference: ${angleDifference.toFixed(2)}°`);
    });
  });

  describe('Test Information Summary', () => {
    it('should log comprehensive test information for 8 AM', () => {
      const solarPos = getSolarPosition(testDay, latitude, longitude, tzMeridian, testHour);
      const declination = getSolarDeclination(testDay, testYear);
      const eqTime = getEquationOfTime(testDay, testYear);
      const shadowCoords = projectShadowToSurface(solarPos.altitude, solarPos.azimuth, gnomonHeight, 'Horizontal', latitude);
      
      const altitudeDeg = solarPos.altitude * 180 / Math.PI;
      const azimuthDeg = solarPos.azimuth * 180 / Math.PI;
      const shadowLength = Math.sqrt(shadowCoords.x * shadowCoords.x + shadowCoords.y * shadowCoords.y);
      const normalizedLength = shadowLength / gnomonHeight;
      
      // Create a comprehensive summary
      console.log('\n=== SHADOW CALCULATION TEST SUMMARY (8 AM) ===');
      console.log(`Test Date: ${new Date().toLocaleDateString()} (Day ${testDay} of ${testYear})`);
      console.log(`Location: Fort Collins, CO (${latitude}°N, ${longitude}°W)`);
      console.log(`Test Time: 8:00 AM (Local Solar Time)`);
      console.log(`Gnomon Height: ${gnomonHeight} unit(s)`);
      console.log('');
      console.log('Hughes, Yallop & Hohenkerk Algorithm Results:');
      console.log(`  Solar Declination: ${declination.toFixed(4)}°`);
      console.log(`  Equation of Time: ${eqTime.toFixed(4)} minutes`);
      console.log(`  Solar Altitude: ${altitudeDeg.toFixed(4)}°`);
      console.log(`  Solar Azimuth: ${azimuthDeg.toFixed(4)}°`);
      console.log('');
      console.log('Shadow Results:');
      console.log(`  Shadow Length: ${shadowLength.toFixed(6)} units`);
      console.log(`  Normalized Length: ${normalizedLength.toFixed(6)}`);
      console.log(`  Shadow Coordinates: (${shadowCoords.x.toFixed(6)}, ${shadowCoords.y.toFixed(6)})`);
      console.log('===========================================\n');
      
      // All values should be reasonable and finite
      expect(Number.isFinite(declination)).toBe(true);
      expect(Number.isFinite(eqTime)).toBe(true);
      expect(Number.isFinite(altitudeDeg)).toBe(true);
      expect(Number.isFinite(azimuthDeg)).toBe(true);
      expect(Number.isFinite(shadowLength)).toBe(true);
      expect(Number.isFinite(normalizedLength)).toBe(true);
    });
  });
});