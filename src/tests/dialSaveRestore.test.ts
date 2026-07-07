import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveDialConfig,
  loadAllSavedConfigs,
  loadSavedConfig,
  deleteSavedConfig,
  hasSavedConfigs,
  type SavedDialConfig,
} from '../utils/dialSaveRestore';

const STORAGE_KEY = 'sundial-saved-configs';

// A minimal but fully-typed dial config. Array-valued fields are left empty;
// the persistence layer only round-trips them, it does not inspect their shape.
function makeConfig(overrides: Partial<SavedDialConfig['config']> = {}): SavedDialConfig['config'] {
  return {
    latitude: 40.5853,
    longitude: -105.0844,
    tzMeridian: -105,
    locationName: 'Fort Collins',
    gnomonMode: 'auto',
    gnomonHeight: 1,
    gnomonType: 'triangle',
    gnomonPosition: 0,
    gnomonPositionMode: 'auto',
    pageSize: 'Letter',
    customWidth: 8.5,
    customHeight: 11,
    customUnits: 'in',
    orientation: 'Landscape',
    inclineType: 'Horizontal',
    tiltAngle: 0,
    declinationType: 'South',
    declinationDegrees: 0,
    dialShape: 'rectangle',
    borderStyle: 'solid',
    borderMargin: 0.236,
    hourlineDateRange: 'FullYear',
    hourlineIntervals: [],
    startHour: 6,
    stopHour: 18,
    use24Hour: false,
    labelWinterSide: true,
    labelSummerSide: false,
    labelOffset: 1.5,
    fontFamily: 'sans-serif',
    fontSize: 20,
    useDST: false,
    declinationNoonmarks: true,
    lineStyles: [],
    declinationLines: [],
    showBackground: true,
    backgroundColor: '#ffffff',
    dialTextBlock: '',
    dialTextBlockFontSize: 14,
    dialTextBlockFontFamily: 'sans-serif',
    sundialNotesMode: 'off',
    sundialNotesPositionMode: 'auto',
    sundialNotesOffset: 0,
    sundialNotesOffsetHorizontal: 0,
    ...overrides,
  };
}

describe('dialSaveRestore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves and restores a configuration round-trip', () => {
    const id = saveDialConfig('My Dial', makeConfig({ locationName: 'Sydney' }));
    expect(id).toMatch(/^dial-/);

    const restored = loadSavedConfig(id);
    expect(restored).not.toBeNull();
    expect(restored!.name).toBe('My Dial');
    expect(restored!.config.locationName).toBe('Sydney');
  });

  it('reports and lists saved configs', () => {
    expect(hasSavedConfigs()).toBe(false);
    saveDialConfig('A', makeConfig());
    saveDialConfig('B', makeConfig());
    expect(hasSavedConfigs()).toBe(true);
    expect(loadAllSavedConfigs()).toHaveLength(2);
  });

  it('trims the supplied name', () => {
    const id = saveDialConfig('  padded  ', makeConfig());
    expect(loadSavedConfig(id)!.name).toBe('padded');
  });

  it('deletes a config by id and clears storage when the last one is removed', () => {
    const id = saveDialConfig('Only', makeConfig());
    expect(deleteSavedConfig(id)).toBe(true);
    expect(hasSavedConfigs()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // Deleting a missing id returns false.
    expect(deleteSavedConfig('does-not-exist')).toBe(false);
  });

  it('filters out corrupted entries when loading', () => {
    const good: SavedDialConfig = {
      id: 'good-1',
      name: 'Good',
      savedAt: Date.now(),
      config: makeConfig(),
    };
    const bad = { id: 42, name: null }; // wrong types / missing fields
    localStorage.setItem(STORAGE_KEY, JSON.stringify([good, bad, null]));

    const loaded = loadAllSavedConfigs();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('good-1');
  });

  it('returns an empty array for non-array or malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(loadAllSavedConfigs()).toEqual([]);

    localStorage.setItem(STORAGE_KEY, '{ this is not valid json');
    expect(loadAllSavedConfigs()).toEqual([]);
  });

  it('translates a QuotaExceededError into a friendly message', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => saveDialConfig('Nope', makeConfig())).toThrow(/quota exceeded/i);
  });
});
