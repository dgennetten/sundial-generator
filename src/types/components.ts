// src/types/components.ts
// Type definitions for component props and state

import type {
  PageSize,
  PageOrientation,
  InclineType,

  GnomonType,
  DateRange,
  HourlineInterval,
  LineStyle,
  DeclinationLine
} from './index';

/**
 * Props for LocationInputs component
 */
export interface LocationInputsProps {
  latitude: number;
  longitude: number;
  tzMeridian: number;
  onChange: (data: {
    lat: number;
    lng: number;
    tz: number;
    useDST?: boolean;
    locationName?: string;
  }) => void;
}

/**
 * Props for GnomonSettings component
 */
export interface GnomonSettingsProps {
  mode: 'auto' | 'manual';
  height: number;
  gnomonType: GnomonType;
  positionMode: 'auto' | 'manual';
  manualPosition: number;
  latitude: number;
  longitude: number;
  tzMeridian: number;
  pageHeight: number;
  onChange: (settings: {
    mode: 'auto' | 'manual';
    height: number;
    gnomonType: GnomonType;
    positionMode: 'auto' | 'manual';
    manualPosition: number;
  }) => void;
}

/**
 * Props for PageSettings component
 */
export interface PageSettingsProps {
  pageSize: PageSize;
  orientation: PageOrientation;
  customWidth: number;
  customHeight: number;
  tiltAngle: number;
  inclineType: InclineType;
  onPageSizeChange: (size: PageSize) => void;
  onOrientationChange: (orientation: PageOrientation) => void;
  onCustomSizeChange: (width: number, height: number) => void;
  onTiltAngleChange: (angle: number) => void;
  onInclineTypeChange: (type: InclineType) => void;
}


/**
 * Props for DesignExport component
 */
export interface DesignExportProps {
  pageSize: PageSize;
  orientation: PageOrientation;
  showBackground: boolean;
  backgroundColor: string;
  customWidth: number;
  customHeight: number;
}

/**
 * Props for HourlineSettings component
 */
export interface HourlineSettingsProps {
  intervals: HourlineInterval[];
  dateRange: DateRange;
  startHour: number;
  stopHour: number;
  use24Hour: boolean;
  lineStyles: LineStyle[];
  onChange: (intervals: HourlineInterval[]) => void;
  onDateRangeChange: (range: DateRange) => void;
  onHourRangeChange: (start: number, stop: number) => void;
  on24HourChange: (use24Hour: boolean) => void;
}

/**
 * Props for LineSettings component
 */
export interface LineSettingsProps {
  lineStyles: LineStyle[];
  onChange: (styles: LineStyle[]) => void;
}

/**
 * Props for DeclinationLineOptions component
 */
export interface DeclinationLineOptionsProps {
  declinationLines: DeclinationLine[];
  lineStyles: LineStyle[];
  onChange: (lines: DeclinationLine[]) => void;
}

/**
 * Props for MapPicker component
 */
export interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, placeName?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

/**
 * Common layout mode type for responsive components
 */
export type LayoutMode = 'desktop' | 'mobile-portrait' | 'mobile-landscape';

/**
 * Common callback types
 */
export type LocationChangeCallback = (data: {
  lat: number;
  lng: number;
  tz: number;
  useDST?: boolean;
  locationName?: string;
}) => void;

export type GnomonChangeCallback = (settings: {
  mode: 'auto' | 'manual';
  height: number;
  gnomonType: GnomonType;
  positionMode: 'auto' | 'manual';
  manualPosition: number;
}) => void;

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Component state management helpers
 */
export interface ComponentState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'range';
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  helpText?: string;
}
