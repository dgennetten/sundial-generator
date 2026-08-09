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
export type InclineType = 'Horizontal' | 'Vertical' | 'Cancer' | 'Capricorn' | 'Polar' | 'Manual';

/**
 * Wall declination preset types
 */
export type DeclinationType = 'North' | 'NNE' | 'NE' | 'ENE' | 'East' | 'ESE' | 'SE' | 'SSE' | 'South' | 'SSW' | 'SW' | 'WSW' | 'West' | 'WNW' | 'NW' | 'NNW' | 'Manual';

/**
 * Gnomon types for sundial shadow casting
 */
export type GnomonType = 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north' | 'crosshair-with-height' | 'glued-popup-base' | 'dual-dial-popup';

/**
 * True for the two-page folding-card popup gnomon types. Both produce a dial
 * face on page 1 and a cut-and-fold gnomon net on page 2, and share the same
 * preview toggle / forced-flat / two-page export plumbing.
 */
export function isTwoPagePopup(type: GnomonType): boolean {
  return type === 'glued-popup-base' || type === 'dual-dial-popup';
}

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
export type DateRange = 'FullYear' | 'SummerToFall' | 'WinterToSpring' | 'DualHalf';

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
  /** Decoration mode for logging */
  sundialNotesMode?: string;
  /** Decoration text content (when mode is 'textBlock') */
  dialTextBlock?: string;

  /**
   * Extra fields used for richer export/print activity logging (e.g., interpreting dialTextBlock for email).
   * These are optional and do not affect the exported file content.
   */
  latitude?: number;
  longitude?: number;
  gnomonHeight?: number;
  inclineType?: InclineType;
  tiltAngle?: number;
  declinationType?: DeclinationType;
  declinationDegrees?: number;
  todayLineActive?: boolean;
  configJson?: string;
  /** When gnomonType is 'glued-popup-base', whether to include the gnomon net page */
  exportGnomonNet?: boolean;
  /** When gnomonType is 'glued-popup-base', whether to include the sundial face page */
  exportSundialFace?: boolean;
  /** Page width in mm (derived from pageSize + orientation + custom dims) */
  pageWidthMm?: number;
  /** Page height in mm */
  pageHeightMm?: number;
  /** Border inset for gnomon net page, in mm */
  borderMarginMm?: number;
  /** Dual-dial cube net: each face's width in mm (gnomon-feet separation / √2). */
  cubeSideMm?: number;
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
 * Sundial print/export record from MySQL
 */
export interface SundialPrint {
  id?: number;
  location?: string;
  latitude: number;
  longitude: number;
  inclination: number;
  declination: number;
  gnomon_type: string;
  notes_type: string;
  date_range: string;
  today_line_active?: boolean;
  config_json?: string;
  created_at?: string;
}

/**
 * Props for PrintedDialsMap component
 */
export interface SundialPrintMapProps {
  onPinClick: (print: SundialPrint) => void;
  refreshTrigger?: number; // Increment to trigger refresh
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
    inclineType: InclineType;
    labelWinterSide: boolean;
    labelSummerSide: boolean;
    labelOffset: number;
  };
}
