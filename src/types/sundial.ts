// src/types/sundial.ts
// Centralized type definitions for sundial-specific data structures

/**
 * Geographic coordinates with validation
 */
export interface Coordinates {
  /** Latitude in decimal degrees (-90 to +90) */
  latitude: number;
  /** Longitude in decimal degrees (-180 to +180) */
  longitude: number;
}

/**
 * Time zone information
 */
export interface TimeZoneInfo {
  /** Time zone meridian in degrees */
  meridian: number;
  /** Whether daylight saving time is used */
  useDST: boolean;
  /** IANA timezone identifier (optional) */
  identifier?: string;
}

/**
 * Location data with coordinates and timezone
 */
export interface LocationData extends Coordinates {
  /** Time zone meridian */
  tzMeridian: number;
  /** Whether to use daylight saving time */
  useDST?: boolean;
  /** Human-readable location name (optional) */
  locationName?: string;
}

/**
 * Page size options for sundial generation
 */
export type PageSize = 'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom';

/**
 * Page orientation options
 */
export type PageOrientation = 'Portrait' | 'Landscape';

/**
 * Incline types for sundial dials
 */
export type InclineType = 'Horizontal' | 'Vertical' | 'Cancer' | 'Capricorn';

/**
 * Dial facing direction
 */
export type DialFacing = 'North' | 'South';

/**
 * Gnomon types for sundial shadow casting
 */
export type GnomonType = 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north';

/**
 * Gnomon configuration
 */
export interface GnomonConfig {
  /** Gnomon mode - auto calculates height, manual uses specified height */
  mode: 'auto' | 'manual';
  /** Height in millimeters (used when mode is 'manual') */
  height: number;
  /** Type of gnomon to display */
  type: GnomonType;
  /** Position mode for gnomon placement */
  positionMode: 'auto' | 'manual';
  /** Manual position from top in millimeters (used when positionMode is 'manual') */
  manualPosition?: number;
}

/**
 * Date range options for hourline generation
 */
export type DateRange = 'FullYear' | 'SummerToFall' | 'WinterToSpring';

/**
 * Solar position data
 */
export interface SolarPosition {
  /** Solar azimuth in degrees */
  azimuth: number;
  /** Solar elevation in degrees */
  elevation: number;
  /** Solar declination in degrees */
  declination: number;
  /** Hour angle in degrees */
  hourAngle: number;
}

/**
 * Projected shadow point on sundial surface
 */
export interface ShadowPoint {
  /** X coordinate in millimeters */
  x: number;
  /** Y coordinate in millimeters */
  y: number;
  /** Time information for this point */
  time: {
    hour: number;
    minute: number;
    dayOfYear: number;
  };
}

/**
 * Analemma data for a specific hour
 */
export interface AnalemmaData {
  /** Hour (0-23) */
  hour: number;
  /** Array of shadow points throughout the year */
  points: ShadowPoint[];
}

/**
 * Export format options
 */
export type ExportFormat = 'SVG' | 'PNG' | 'PDF';

/**
 * Export configuration
 */
export interface ExportOptions {
  /** Output format */
  format: ExportFormat;
  /** Page size */
  pageSize: PageSize;
  /** Page orientation */
  orientation: PageOrientation;
  /** DPI for raster formats (PNG) */
  dpi?: number;
  /** Whether to include background */
  showBackground: boolean;
  /** Background color (hex) */
  backgroundColor?: string;
  /** Custom width in millimeters (for Custom page size) */
  customWidth?: number;
  /** Custom height in millimeters (for Custom page size) */
  customHeight?: number;
  /** Date range for hourlines */
  dateRange?: DateRange;
  /** Type of gnomon */
  gnomonType?: GnomonType;
  /** Location name for logging */
  locationName?: string;
}

/**
 * Font configuration
 */
export interface FontConfig {
  /** Font family name */
  family: string;
  /** Font size in points */
  size: number;
  /** Font weight */
  weight?: 'normal' | 'bold' | number;
  /** Font style */
  style?: 'normal' | 'italic';
}

/**
 * Border configuration
 */
export interface BorderConfig {
  /** Whether to show border */
  show: boolean;
  /** Border margin in millimeters */
  margin: number;
  /** Border style identifier */
  style: string;
}

/**
 * Text block configuration for dial information
 */
export interface TextBlockConfig {
  /** Whether text block is visible */
  visible: boolean;
  /** Text content with template variables */
  content: string;
  /** Font configuration */
  font: FontConfig;
}

/**
 * Complete sundial configuration
 */
export interface SundialConfig {
  /** Location and timezone information */
  location: LocationData;
  /** Gnomon configuration */
  gnomon: GnomonConfig;
  /** Page settings */
  page: {
    size: PageSize;
    orientation: PageOrientation;
    customWidth?: number;
    customHeight?: number;
    tiltAngle: number;
  };
  /** Time settings */
  time: {
    startHour: number;
    stopHour: number;
    use24Hour: boolean;
    dateRange: DateRange;
  };
  /** Visual settings */
  visual: {
    showBackground: boolean;
    backgroundColor?: string;
    border: BorderConfig;
    textBlock: TextBlockConfig;
  };
  /** Dial settings */
  dial: {
    facing: DialFacing;
    inclineType: InclineType;
    labelWinterSide: boolean;
    labelSummerSide: boolean;
    labelOffset: number;
  };
}
