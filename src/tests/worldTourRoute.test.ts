import { describe, expect, it, vi } from 'vitest';
import type { SundialPrint } from '../types/sundial';
import {
  buildWorldTourRoute,
  isLikelyUSLocation,
  normalizeLongitude,
  shortLocationName,
} from '../utils/worldTourRoute';

function print(partial: Partial<SundialPrint> & Pick<SundialPrint, 'latitude' | 'longitude'>): SundialPrint {
  return {
    inclination: 40,
    declination: 0,
    gnomon_type: 'popup',
    notes_type: 'Notes',
    date_range: 'SummerToFall',
    ...partial,
  };
}

describe('worldTourRoute', () => {
  it('normalizes longitudes outside ±180', () => {
    expect(normalizeLongitude(-214.83334)).toBeCloseTo(145.16666, 4);
    expect(normalizeLongitude(190)).toBe(-170);
  });

  it('detects US vs non-US from strings and boxes', () => {
    expect(isLikelyUSLocation(print({ latitude: 28.8, longitude: -82, location: 'The Villages, Florida, United States' }), 28.8, -82)).toBe(true);
    expect(isLikelyUSLocation(print({ latitude: 35.67, longitude: 139.76, location: 'Tokyo, Japan' }), 35.67, 139.76)).toBe(false);
  });

  it('shortens long Nominatim-style names', () => {
    const name = shortLocationName(
      '2752, Carytown Loop, Village of Richmond, Brownwood, The Villages, Sumter County, Florida, 32163, United States',
      28.8,
      -82,
    );
    expect(name).toContain('The Villages');
    expect(name).toContain('Florida');
  });

  it('starts at newest print, prefers non-US, caps length', () => {
    const prints = [
      print({ latitude: 28.8, longitude: -82, location: 'The Villages, Florida, United States', created_at: '2026-09-07' }),
      print({ latitude: 28.8, longitude: -82, location: 'The Villages duplicate', created_at: '2026-09-06' }),
      print({ latitude: 35.67, longitude: 139.76, location: 'Tokyo, Japan', created_at: '2026-09-05' }),
      print({ latitude: 41.12, longitude: 0.14, location: 'Maella, España', created_at: '2026-09-04' }),
      print({ latitude: 40.5, longitude: -105.0, location: 'Fort Collins, Colorado, United States', created_at: '2026-09-03' }),
      print({ latitude: 49.49, longitude: 8.47, location: 'Mannheim, Deutschland', created_at: '2026-09-02' }),
    ];

    const route = buildWorldTourRoute(prints, 50, { start: 'latest', order: 'linear' });
    expect(route[0].shortName).toContain('The Villages');
    expect(route.length).toBe(5); // contiguous Villages run collapsed
    const nonStart = route.slice(1);
    expect(nonStart.some((s) => !s.isUS)).toBe(true);
  });

  it('can start at earliest print', () => {
    const prints = [
      print({ latitude: 28.8, longitude: -82, location: 'The Villages, Florida, United States', created_at: '2026-09-07' }),
      print({ latitude: 49.49, longitude: 8.47, location: 'Mannheim, Deutschland', created_at: '2026-09-01' }),
      print({ latitude: 35.67, longitude: 139.76, location: 'Tokyo, Japan', created_at: '2026-09-05' }),
    ];
    const route = buildWorldTourRoute(prints, 50, { start: 'earliest', order: 'linear' });
    expect(route[0].shortName).toContain('Mannheim');
  });

  it('skip collapses contiguous run and keeps latest in that run regardless of Start At', () => {
    const prints = [
      print({ id: 3, latitude: 40.5, longitude: -105, location: 'Fort Collins new', created_at: '2026-09-07' }),
      print({ id: 2, latitude: 40.5, longitude: -105, location: 'Fort Collins mid', created_at: '2026-09-05' }),
      print({ id: 1, latitude: 35.67, longitude: 139.76, location: 'Tokyo, Japan', created_at: '2026-09-01' }),
    ];
    const route = buildWorldTourRoute(prints, 50, {
      start: 'earliest',
      order: 'linear',
      duplicates: 'skip',
    });
    expect(route).toHaveLength(2);
    const fc = route.find((s) => s.lat === 40.5);
    expect(fc?.print.id).toBe(3);
    expect(route[0].shortName).toContain('Tokyo');
  });

  it('skip collapses only contiguous runs — A,A,B,A keeps two A stops', () => {
    const prints = [
      print({ id: 4, latitude: 40.5, longitude: -105, location: 'FC newest', created_at: '2026-09-08' }),
      print({ id: 3, latitude: 40.5, longitude: -105, location: 'FC older in run', created_at: '2026-09-07' }),
      print({ id: 2, latitude: 35.67, longitude: 139.76, location: 'Tokyo, Japan', created_at: '2026-09-06' }),
      print({ id: 1, latitude: 40.5, longitude: -105, location: 'FC later revisit', created_at: '2026-09-05' }),
    ];
    const route = buildWorldTourRoute(prints, 50, {
      start: 'latest',
      order: 'linear',
      duplicates: 'skip',
    });
    expect(route).toHaveLength(3);
    const fcStops = route.filter((s) => s.lat === 40.5 && s.lng === -105);
    expect(fcStops).toHaveLength(2);
    expect(fcStops.map((s) => s.print.id).sort()).toEqual([1, 4]);
  });

  it('skip does not dedupe by country — different US coords all stay', () => {
    const prints = [
      print({ id: 1, latitude: 28.8, longitude: -82, location: 'The Villages, FL, USA', created_at: '2026-09-07' }),
      print({ id: 2, latitude: 40.5, longitude: -105, location: 'Fort Collins, CO, USA', created_at: '2026-09-06' }),
      print({ id: 3, latitude: 34.05, longitude: -118.25, location: 'Los Angeles, CA, USA', created_at: '2026-09-05' }),
    ];
    const route = buildWorldTourRoute(prints, 50, { duplicates: 'skip' });
    expect(route).toHaveLength(3);
  });

  it('include duplicates keeps every print', () => {
    const prints = [
      print({ id: 3, latitude: 40.5, longitude: -105, location: 'Fort Collins new', created_at: '2026-09-07' }),
      print({ id: 2, latitude: 40.5, longitude: -105, location: 'Fort Collins mid', created_at: '2026-09-05' }),
      print({ id: 1, latitude: 35.67, longitude: 139.76, location: 'Tokyo, Japan', created_at: '2026-09-01' }),
    ];
    const route = buildWorldTourRoute(prints, 50, {
      start: 'latest',
      order: 'linear',
      duplicates: 'include',
    });
    expect(route).toHaveLength(3);
  });

  it('excludes opted-out prints while legacy and explicit-false rows remain eligible', () => {
    const prints = [
      print({ id: 3, latitude: 10, longitude: 10, created_at: '2026-09-07', exclude_from_world_tour: true }),
      print({ id: 2, latitude: 20, longitude: 20, created_at: '2026-09-06', exclude_from_world_tour: false }),
      print({ id: 1, latitude: 30, longitude: 30, created_at: '2026-09-05' }),
    ];

    const route = buildWorldTourRoute(prints, 50, { duplicates: 'include' });

    expect(route.map((stop) => stop.print.id)).toEqual([2, 1]);
  });

  it('randomizes the full candidate set before applying Tour Length', () => {
    const prints = Array.from({ length: 6 }, (_, i) =>
      print({
        id: i + 1,
        latitude: 10 + i,
        longitude: 20 + i,
        location: `International City ${i + 1}`,
        created_at: `2026-09-${String(7 - i).padStart(2, '0')}`,
      }),
    );
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      const route = buildWorldTourRoute(prints, 3, {
        start: 'latest',
        order: 'random',
        duplicates: 'include',
      });

      expect(route).toHaveLength(3);
      expect(route[0].print.id).toBe(1);
      expect(route.slice(1).map((stop) => stop.print.id)).toContain(4);
    } finally {
      random.mockRestore();
    }
  });

  it('reserves US pool slots when non-US would otherwise fill the tour', () => {
    const prints: SundialPrint[] = [
      print({
        latitude: 28.8,
        longitude: -82,
        location: 'The Villages, Florida, United States',
        created_at: '2026-09-20',
      }),
    ];
    for (let i = 0; i < 8; i++) {
      prints.push(
        print({
          latitude: 35 + i * 0.5,
          longitude: 10 + i,
          location: `City ${i}, Abroad`,
          created_at: `2026-09-${String(19 - i).padStart(2, '0')}`,
        }),
      );
    }
    for (let i = 0; i < 4; i++) {
      prints.push(
        print({
          latitude: 30 + i,
          longitude: -100 - i,
          location: `US City ${i}, United States`,
          created_at: `2026-09-${String(10 - i).padStart(2, '0')}`,
        }),
      );
    }

    const route = buildWorldTourRoute(prints, 8, { start: 'latest', order: 'linear', duplicates: 'skip' });
    expect(route[0].isUS).toBe(true);
    expect(route).toHaveLength(8);
    const usBeyondStart = route.slice(1).filter((s) => s.isUS);
    const nonUs = route.slice(1).filter((s) => !s.isUS);
    expect(usBeyondStart.length).toBeGreaterThanOrEqual(2);
    expect(nonUs.length).toBeGreaterThan(usBeyondStart.length);
  });
});
