// src/types/visitor.ts
// Centralized type definitions for visitor data

/**
 * Represents a single visitor location with geographic and visit data
 */
export interface VisitorLocation {
  /** IP address of the visitor */
  ip: string;
  /** Country name */
  country: string;
  /** ISO country code (e.g., 'US', 'DE', 'JP') */
  countryCode: string;
  /** State/province/region name */
  region: string;
  /** City name */
  city: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lon: number;
  /** IANA timezone identifier (e.g., 'America/Denver') */
  timezone: string;
  /** ISO 8601 timestamp of first visit */
  firstVisit: string;
  /** ISO 8601 timestamp of last visit */
  lastVisit: string;
  /** Total number of visits from this location */
  visitCount: number;
}

/**
 * Complete visitor data structure returned by the backend processing
 */
export interface VisitorData {
  /** Array of unique visitor locations */
  visitors: VisitorLocation[];
  /** Total number of unique visitors */
  totalVisitors: number;
  /** Total number of visits across all visitors */
  totalVisits: number;
  /** ISO 8601 timestamp when data was processed */
  processedDate: string;
  /** Number of days since the oldest log entry (optional) */
  daysSince?: number;
}

/**
 * Props for visitor map components
 */
export interface VisitorMapProps {
  /** Array of visitor locations to display */
  visitors: VisitorLocation[];
  /** Currently selected country (null if none selected) */
  selectedCountry: string | null;
  /** Callback when a country is selected/deselected */
  onCountrySelect: (country: string | null) => void;
  /** Height of the map container */
  height?: string;
}

/**
 * Country statistics for visitor data aggregation
 */
export interface CountryStats {
  /** Country name */
  country: string;
  /** ISO country code */
  countryCode: string;
  /** Number of unique visitors from this country */
  visitorCount: number;
  /** Total visits from this country */
  totalVisits: number;
  /** Array of cities within this country */
  cities: Array<{
    city: string;
    region: string;
    visitorCount: number;
    totalVisits: number;
  }>;
}

/**
 * Geolocation API response structure (from ip-api.com)
 */
export interface GeolocationResponse {
  status: 'success' | 'fail';
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  message?: string; // Error message if status is 'fail'
}

/**
 * Log entry structure for parsing access logs
 */
export interface LogEntry {
  /** IP address from log */
  ip: string;
  /** Timestamp from log */
  timestamp: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Requested URL path */
  path: string;
  /** HTTP status code */
  status: number;
  /** User agent string */
  userAgent: string;
}

/**
 * Configuration for log processing
 */
export interface LogProcessingConfig {
  /** Number of days to look back in logs */
  daysBack: number;
  /** Whether to include bot traffic */
  includeBots: boolean;
  /** File extensions to exclude (static assets) */
  excludeExtensions: string[];
  /** IP addresses to exclude (private/local) */
  excludeIpPatterns: RegExp[];
}
