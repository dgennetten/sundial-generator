# Unit Tests for Sundial Generator

## Overview
This directory contains unit tests for the sundial generator application, focusing on verifying the accuracy of solar position and shadow calculations using the Hughes, Yallop & Hohenkerk algorithm.

## Running Tests

### Basic Test Commands
```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (automatically re-runs when files change)
npm test

# Run tests with UI interface
npm run test:ui
```

### Test Structure
- **`shadowCalculations.test.ts`** - Comprehensive tests for shadow calculations
  - Solar position calculations (altitude, azimuth) using Hughes, Yallop & Hohenkerk algorithm
  - Shadow projection onto horizontal sundials
  - Verification against independent trigonometric calculations
  - Edge case handling (low sun altitudes, horizon conditions)

## Current Test Coverage

### Fort Collins Test Case
The primary test case uses Fort Collins, Colorado as the reference location:
- **Coordinates**: 40.5853°N, -105.0844°W
- **Test Time**: 12:00 PM (noon, local solar time)
- **Test Date**: Tomorrow (dynamically calculated)
- **Gnomon Height**: 1.0 units (normalized)

### Test Results (Example for August 28, 2025)
- **Solar Declination**: 9.52°
- **Equation of Time**: -1.16 minutes  
- **Solar Altitude**: 58.93° (sun well above horizon)
- **Solar Azimuth**: 179.61° (pointing nearly due south)
- **Shadow Length**: 0.603 units (normalized by gnomon height)
- **Shadow Coordinates**: (0.0041, 0.6025) - pointing nearly due north

### Coordinate System
The shadow calculations use this coordinate system:
- **X-axis**: East-West (positive = East)
- **Y-axis**: North-South (positive = North) 
- **Origin**: Base of gnomon
- At solar noon, shadows point north (positive Y direction)

## Understanding Test Output

### What the Tests Verify
1. **Algorithm Accuracy**: Hughes, Yallop & Hohenkerk algorithm implementation
2. **Solar Position**: Correct calculation of sun altitude and azimuth
3. **Shadow Geometry**: Accurate projection of shadows onto horizontal surfaces
4. **Mathematical Consistency**: Independent verification using basic trigonometry
5. **Edge Cases**: Proper handling of extreme conditions (low sun, horizon)

### Key Measurements
- **Normalized Shadow Length**: Shadow length divided by gnomon height
  - At Fort Collins noon in late August: ~0.60 (shadow is 60% of gnomon height)
  - This varies by season and latitude
- **Shadow Angle**: Direction shadow points from north (in degrees)
  - Should be very close to 0° at solar noon (pointing due north)

## Test Development Guidelines

### Adding New Test Cases
1. **Different Locations**: Test various latitudes and longitudes
2. **Different Times**: Test different hours, seasons, dates  
3. **Different Orientations**: Test vertical and equatorial sundials
4. **Boundary Conditions**: Test extreme latitudes, winter/summer solstices

### Validation Methods
1. **Cross-verification**: Compare against independent calculations
2. **Known Values**: Use published solar position tables
3. **Physical Constraints**: Verify results make physical sense
4. **Algorithm Consistency**: Ensure all components use same astronomical basis

## Common Issues and Debugging

### Expected Values by Season (Fort Collins, Noon)
- **Winter Solstice**: High altitude (~26°), long shadows (~2.3 units)
- **Summer Solstice**: Low altitude (~73°), short shadows (~0.3 units)  
- **Spring/Fall Equinox**: Medium altitude (~50°), medium shadows (~0.8 units)

### Troubleshooting Failed Tests
1. **Check Date**: Astronomical calculations are date-sensitive
2. **Verify Coordinates**: Ensure latitude/longitude are correct
3. **Time Zone Issues**: Confirm solar time vs. clock time calculations
4. **Algorithm Implementation**: Compare against reference implementations

## Future Enhancements
- Add tests for different sundial orientations (vertical, equatorial)
- Test seasonal variations (solstices, equinoxes)  
- Add performance benchmarks
- Test extreme latitude locations (Arctic, Antarctic)
- Validate against professional astronomical software