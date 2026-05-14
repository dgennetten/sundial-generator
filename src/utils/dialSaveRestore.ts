// src/utils/dialSaveRestore.ts
// Utility functions for saving and restoring dial configurations to/from localStorage

import type { HourlineInterval } from '../components/hourlineUtils';
import type { LineStyle } from '../components/LineSettings';
import type { DeclinationLine } from '../components/DeclinationLineOptions';
import { log } from './logger';

export interface SavedDialConfig {
  id: string; // UUID or timestamp-based
  name: string; // User-provided name
  savedAt: number; // Timestamp
  config: {
    // Location
    latitude: number;
    longitude: number;
    tzMeridian: number;
    locationName: string;
    
    // Gnomon
    gnomonMode: 'auto' | 'manual';
    gnomonHeight: number;
    gnomonType: string;
    gnomonPosition: number;
    gnomonPositionMode: 'auto' | 'manual';
    gnomonHorizontalPosition?: number;
    
    // Page
    pageSize: string;
    customWidth: number;
    customHeight: number;
    customUnits: 'in' | 'cm';
    orientation: 'Landscape' | 'Portrait';
    inclineType: string;
    tiltAngle: number;
    declinationType: string;
    declinationDegrees: number;
    dialShape: string;
    borderStyle: string;
    borderMargin: number;
    
    // Hour lines
    hourlineDateRange: string;
    hourlineIntervals: HourlineInterval[];
    startHour: number;
    stopHour: number;
    use24Hour: boolean;
    labelWinterSide: boolean;
    labelSummerSide: boolean;
    labelOffset: number;
    fontFamily: string;
    fontSize: number;
    useDST: boolean;
    declinationNoonmarks: boolean;
    /** When date range is half-year, draw dotted noon analemma for the excluded half-year */
    showFullYearOnNoon?: boolean;
    showBelowHorizonHourLines?: boolean;
    showBelowHorizonDateLines?: boolean;
    syncBelowHorizon?: boolean;

    // Lines
    lineStyles: LineStyle[];
    declinationLines: DeclinationLine[];
    
    // Background/Text
    showBackground: boolean;
    backgroundColor: string;
    dialTextBlock: string;
    dialTextBlockFontSize: number;
    dialTextBlockFontFamily: string;
    sundialNotesMode: string;
    sundialNotesPositionMode: 'auto' | 'manual';
    sundialNotesOffset: number;
    sundialNotesOffsetHorizontal: number;
    dialOrientation?: 'North' | 'South';
  };
}

const STORAGE_KEY = 'sundial-saved-configs';

/**
 * Generates a unique ID for a saved config
 */
function generateId(): string {
  return `dial-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Saves a dial configuration to localStorage with the given name
 * @param name User-provided name for the configuration
 * @param config The configuration to save
 * @returns The ID of the saved configuration
 */
export function saveDialConfig(name: string, config: SavedDialConfig['config']): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('LocalStorage is not available');
    }
    const savedConfigs = loadAllSavedConfigs();
    const id = generateId();
    const newConfig: SavedDialConfig = {
      id,
      name: name.trim(),
      savedAt: Date.now(),
      config,
    };
    
    savedConfigs.push(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfigs));
    return id;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('LocalStorage quota exceeded. Please delete some saved configurations.');
    }
    throw new Error('Failed to save configuration: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Loads all saved configurations from localStorage
 * @returns Array of saved configurations, or empty array if none exist
 */
export function loadAllSavedConfigs(): SavedDialConfig[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Validate and filter out corrupted entries
    return parsed.filter((config: any): config is SavedDialConfig => {
      return (
        config &&
        typeof config === 'object' &&
        typeof config.id === 'string' &&
        typeof config.name === 'string' &&
        typeof config.savedAt === 'number' &&
        config.config &&
        typeof config.config === 'object'
      );
    });
  } catch (error) {
    log.error('Failed to load saved configurations:', error);
    return [];
  }
}

/**
 * Loads a specific saved configuration by ID
 * @param id The ID of the configuration to load
 * @returns The saved configuration, or null if not found
 */
export function loadSavedConfig(id: string): SavedDialConfig | null {
  const allConfigs = loadAllSavedConfigs();
  return allConfigs.find(config => config.id === id) || null;
}

/**
 * Deletes a saved configuration by ID
 * @param id The ID of the configuration to delete
 * @returns true if successfully deleted, false if not found
 */
export function deleteSavedConfig(id: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const allConfigs = loadAllSavedConfigs();
    const filtered = allConfigs.filter(config => config.id !== id);
    
    if (filtered.length === allConfigs.length) {
      return false; // Config not found
    }
    
    if (filtered.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    
    return true;
  } catch (error) {
    log.error('Failed to delete configuration:', error);
    return false;
  }
}

/**
 * Checks if any saved configurations exist
 * @returns true if at least one saved configuration exists
 */
export function hasSavedConfigs(): boolean {
  return loadAllSavedConfigs().length > 0;
}