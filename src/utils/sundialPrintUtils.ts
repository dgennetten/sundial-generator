import { computeInclineDegrees as computeInclinationDegrees } from './sundialMath';
import type { SundialPrint } from '../types/sundial';
import { log } from './logger';

// Re-export for backward compatibility
export { computeInclinationDegrees };

const API_URL =
  window.location.hostname === 'localhost'
    ? 'https://precisionsundial.com/sundial-prints-api.php'
    : '/sundial-prints-api.php';

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

export async function fetchSundialPrints(): Promise<{ prints: SundialPrint[]; totalCount: number }> {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch prints: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return {
    prints: json.prints as SundialPrint[],
    totalCount: json.totalCount as number,
  };
}
