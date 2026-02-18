# Changelog

## [Unreleased]

### Fixed
- **Longitude Correction Bug**: Fixed critical bug where longitude correction was not working, causing all locations to show noon at 12:00 regardless of their position relative to timezone meridians. 
  - Fixed formula sign in `getSolarPosition`: changed from `4 * (tzMeridian - lng)` to `4 * (lng - tzMeridian)`
  - Fixed `calculateTzMeridian` to correctly calculate timezone standard meridian from `rawOffset` instead of using longitude directly
  - Updated all call sites to pass `timeZoneData.rawOffset` instead of longitude
  - Fixed default `tzMeridian` in App.tsx from `-105.0844` (longitude) to `-105` (MST standard meridian)
  - Example: Dallas, TX (lng=-96.8°, CST meridian=-90°) now correctly shows solar noon at ~12:27 instead of 12:00

### Changed
- **Default Line Styles**:
  - Changed "1st of the Month" default line style from `'declination-5min-dot'` to `'declination-2min-dot'`
  - Changed "Half-hour" default line style from `'default-hairline'` to `'hourline-5-2-day-dash'`
  - Updated date range change logic to use new default for half-hour

### Added
- **New Location**: Added Dallas, TX to the locations dropdown with proper timezone configuration (Central Time, UTC-6)

### Updated
- **Welcome Dialog**: 
  - Added TIP text before "Happy Dialing" in all 11 languages (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, Arabic)
  - Fixed missing space between "gnomon." and "Enjoy" in English version
