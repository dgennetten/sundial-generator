// src/utils/typeGuards.ts
// Type guards and validators for runtime type safety

import type {
  VisitorLocation,
  VisitorData,
  GeolocationResponse,
  Coordinates,
  PageSize,
  PageOrientation,
  InclineType,
  GnomonType,
  ExportFormat
} from '../types';

/**
 * Type guard to check if a value is a valid coordinate
 */
export function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard to check if coordinates are valid
 */
export function isValidCoordinates(coords: unknown): coords is Coordinates {
  if (typeof coords !== 'object' || coords === null) {
    return false;
  }
  
  const { latitude, longitude } = coords as Record<string, unknown>;
  
  return (
    isValidCoordinate(latitude) &&
    isValidCoordinate(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Type guard for VisitorLocation
 */
export function isVisitorLocation(obj: unknown): obj is VisitorLocation {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const visitor = obj as Record<string, unknown>;
  
  return (
    typeof visitor.ip === 'string' &&
    typeof visitor.country === 'string' &&
    typeof visitor.countryCode === 'string' &&
    typeof visitor.region === 'string' &&
    typeof visitor.city === 'string' &&
    isValidCoordinate(visitor.lat) &&
    isValidCoordinate(visitor.lon) &&
    typeof visitor.timezone === 'string' &&
    typeof visitor.firstVisit === 'string' &&
    typeof visitor.lastVisit === 'string' &&
    typeof visitor.visitCount === 'number' &&
    visitor.visitCount > 0
  );
}

/**
 * Type guard for VisitorData
 */
export function isVisitorData(obj: unknown): obj is VisitorData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const data = obj as Record<string, unknown>;
  
  return (
    Array.isArray(data.visitors) &&
    data.visitors.every(isVisitorLocation) &&
    typeof data.totalVisitors === 'number' &&
    typeof data.totalVisits === 'number' &&
    typeof data.processedDate === 'string' &&
    data.totalVisitors >= 0 &&
    data.totalVisits >= 0 &&
    (data.daysSince === undefined || typeof data.daysSince === 'number')
  );
}

/**
 * Type guard for GeolocationResponse
 */
export function isGeolocationResponse(obj: unknown): obj is GeolocationResponse {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const response = obj as Record<string, unknown>;
  
  if (response.status !== 'success' && response.status !== 'fail') {
    return false;
  }
  
  if (response.status === 'fail') {
    return typeof response.message === 'string';
  }
  
  // For success responses, check required fields
  return (
    typeof response.country === 'string' &&
    typeof response.countryCode === 'string' &&
    isValidCoordinate(response.lat) &&
    isValidCoordinate(response.lon)
  );
}

/**
 * Type guard for PageSize
 */
export function isPageSize(value: unknown): value is PageSize {
  return typeof value === 'string' && 
    ['A4', 'Letter', '11x17', '10x15cm Postcard', 'Custom'].includes(value);
}

/**
 * Type guard for PageOrientation
 */
export function isPageOrientation(value: unknown): value is PageOrientation {
  return value === 'Portrait' || value === 'Landscape';
}

/**
 * Type guard for InclineType
 */
export function isInclineType(value: unknown): value is InclineType {
  return typeof value === 'string' && 
    ['Horizontal', 'Vertical', 'Cancer', 'Capricorn'].includes(value);
}

/**
 * Type guard for GnomonType
 */
export function isGnomonType(value: unknown): value is GnomonType {
  return typeof value === 'string' && 
    ['crosshair', 'popup', 'popup-with-brace', 'crosshair-with-north'].includes(value);
}

/**
 * Type guard for ExportFormat
 */
export function isExportFormat(value: unknown): value is ExportFormat {
  return value === 'SVG' || value === 'PNG' || value === 'PDF';
}

/**
 * Validates latitude value
 */
export function validateLatitude(lat: number): { isValid: boolean; error?: string } {
  if (!isValidCoordinate(lat)) {
    return { isValid: false, error: 'Latitude must be a valid number' };
  }
  
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }
  
  return { isValid: true };
}

/**
 * Validates longitude value
 */
export function validateLongitude(lng: number): { isValid: boolean; error?: string } {
  if (!isValidCoordinate(lng)) {
    return { isValid: false, error: 'Longitude must be a valid number' };
  }
  
  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }
  
  return { isValid: true };
}

/**
 * Validates timezone meridian
 */
export function validateTimezoneMeridian(tz: number): { isValid: boolean; error?: string } {
  if (!isValidCoordinate(tz)) {
    return { isValid: false, error: 'Timezone meridian must be a valid number' };
  }
  
  if (tz < -180 || tz > 180) {
    return { isValid: false, error: 'Timezone meridian must be between -180 and 180 degrees' };
  }
  
  return { isValid: true };
}

/**
 * Validates gnomon height
 */
export function validateGnomonHeight(height: number): { isValid: boolean; error?: string } {
  if (!isValidCoordinate(height)) {
    return { isValid: false, error: 'Gnomon height must be a valid number' };
  }
  
  if (height <= 0) {
    return { isValid: false, error: 'Gnomon height must be greater than 0' };
  }
  
  if (height > 1000) {
    return { isValid: false, error: 'Gnomon height must be less than 1000mm' };
  }
  
  return { isValid: true };
}

/**
 * Validates custom page dimensions
 */
export function validateCustomPageSize(
  width: number, 
  height: number
): { isValid: boolean; error?: string } {
  if (!isValidCoordinate(width) || !isValidCoordinate(height)) {
    return { isValid: false, error: 'Page dimensions must be valid numbers' };
  }
  
  if (width <= 0 || height <= 0) {
    return { isValid: false, error: 'Page dimensions must be greater than 0' };
  }
  
  if (width > 2000 || height > 2000) {
    return { isValid: false, error: 'Page dimensions must be less than 2000mm' };
  }
  
  return { isValid: true };
}

/**
 * Safely parses JSON with type checking
 */
export function safeJsonParse<T>(
  json: string,
  typeGuard: (obj: unknown) => obj is T
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    
    if (typeGuard(parsed)) {
      return { success: true, data: parsed };
    } else {
      return { success: false, error: 'Parsed data does not match expected type' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown parsing error' 
    };
  }
}
