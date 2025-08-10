// src/types/index.ts
// Central export for all type definitions

// Visitor-related types
export type {
  VisitorLocation,
  VisitorData,
  VisitorMapProps,
  CountryStats,
  GeolocationResponse,
  LogEntry,
  LogProcessingConfig
} from './visitor';

// Sundial-related types
export type {
  Coordinates,
  TimeZoneInfo,
  LocationData,
  PageSize,
  PageOrientation,
  InclineType,
  DialFacing,
  GnomonType,
  GnomonConfig,
  DateRange,
  SolarPosition,
  ShadowPoint,
  AnalemmaData,
  ExportFormat,
  ExportOptions,
  FontConfig,
  BorderConfig,
  TextBlockConfig,
  SundialConfig
} from './sundial';

// Export-related types
export type {
  SVGExportOptions,
  SimpleSVGExportOptions,
  PageDimensions,
  SVGElementInfo,
  LayerCategories,
  LineStyleMap,
  ExportResult,
  CanvasExportConfig,
  Html2CanvasOptions,
  FileDownloadConfig,
  ExportProgress
} from './export';

// Component-related types
export type {
  LocationInputsProps,
  GnomonSettingsProps,
  PageSettingsProps,

  DesignExportProps,
  HourlineSettingsProps,
  LineSettingsProps,
  DeclinationLineOptionsProps,
  MapPickerProps,
  LayoutMode,
  LocationChangeCallback,
  GnomonChangeCallback,
  ValidationResult,
  ComponentState,
  FormFieldConfig
} from './components';

// Re-export existing types that are already well-defined
export type { HourlineInterval } from '../components/hourlineUtils';
export type { LineStyle } from '../components/LineSettings';
export type { DeclinationLine } from '../components/DeclinationLineOptions';
