import { computeInclineDegrees as computeInclinationDegrees } from './sundialMath';
import type { SundialPrint } from '../types/sundial';
import { log } from './logger';
import { ADMIN_PASSWORD, DEFAULT_PIN_LIMIT } from '../lib/adminPrefs';

// Re-export for backward compatibility
export { computeInclinationDegrees };

const API_URL =
  window.location.hostname === 'localhost'
    ? 'https://precisionsundial.com/sundial-prints-api.php?v=3'
    : '/sundial-prints-api.php?v=3';

// Matches the API's bounded maximum and is intentionally independent of Pins Shown.
export const WORLD_TOUR_CANDIDATE_LIMIT = 1000;

export async function saveSundialPrint(print: Omit<SundialPrint, 'id' | 'created_at'>): Promise<void> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(print),
    });
    if (!res.ok) {
      log.error('Error saving sundial print:', await res.text());
    }
  } catch (error) {
    log.error('Exception saving sundial print:', error);
    // Don't throw — logging failures shouldn't break the app
  }
}

export async function fetchSundialPrints(
  limit: number = DEFAULT_PIN_LIMIT,
  worldTourOnly = false,
): Promise<{ prints: SundialPrint[]; totalCount: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    ...(worldTourOnly ? { worldTour: '1' } : {}),
  });
  const url = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch prints: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return {
    prints: json.prints as SundialPrint[],
    totalCount: json.totalCount as number,
  };
}

export async function deleteSundialPrint(id: number): Promise<void> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId < 1) {
    throw new Error('Missing or invalid id');
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete',
      id: numericId,
      password: ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Delete failed');
  }
}
