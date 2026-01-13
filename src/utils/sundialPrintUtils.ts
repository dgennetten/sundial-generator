import { supabase } from './supabaseClient';
import type { SundialPrint } from '../types/sundial';
import type { InclineType } from '../types';

/**
 * Calculate inclination degrees from inclineType and tiltAngle
 * Uses the same logic as computeInclineDegrees from dialTextBlockInterpreter
 */
function getCancerIncline(lat: number): number {
  return Math.abs(lat - 23.4367);
}

function getCapricornIncline(lat: number): number {
  return Math.abs(lat - (-23.4367));
}

export function computeInclinationDegrees(args: {
  inclineType?: InclineType;
  latitude?: number;
  tiltAngle?: number;
}): number {
  const { inclineType, latitude, tiltAngle } = args;
  if (!inclineType) return 0;
  const lat = typeof latitude === 'number' ? latitude : 0;

  if (inclineType === 'Horizontal') return 0;
  if (inclineType === 'Vertical') return 90;
  if (inclineType === 'Polar') return lat;
  if (inclineType === 'Cancer') return getCancerIncline(lat);
  if (inclineType === 'Capricorn') return getCapricornIncline(lat);
  if (inclineType === 'Manual') return typeof tiltAngle === 'number' ? tiltAngle : 0;
  return 0;
}

/**
 * Save a print/export record to Supabase
 */
export async function saveSundialPrint(print: Omit<SundialPrint, 'id' | 'created_at'>): Promise<void> {
  try {
    const { error } = await supabase
      .from('sundial_prints')
      .insert(print);

    if (error) {
      console.error('Error saving sundial print to Supabase:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  } catch (error) {
    console.error('Exception saving sundial print to Supabase:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Fetch sundial prints from Supabase
 * Returns the most recent 200 records and total count
 */
export async function fetchSundialPrints(): Promise<{ prints: SundialPrint[]; totalCount: number }> {
  try {
    // First get the total count
    const { count, error: countError } = await supabase
      .from('sundial_prints')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting sundial prints:', countError);
      throw new Error(`Failed to count prints: ${countError.message}`);
    }

    const totalCount = count || 0;

    // Fetch the most recent 200 records
    const { data, error } = await supabase
      .from('sundial_prints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching sundial prints:', error);
      throw new Error(`Failed to fetch prints: ${error.message}`);
    }

    // Ensure numeric fields are properly converted (Supabase NUMERIC might come as strings)
    const processedPrints = (data || []).map((print: any) => {
      return {
        ...print,
        latitude: typeof print.latitude === 'string' ? parseFloat(print.latitude) : print.latitude,
        longitude: typeof print.longitude === 'string' ? parseFloat(print.longitude) : print.longitude,
        inclination: typeof print.inclination === 'string' ? parseFloat(print.inclination) : print.inclination,
        declination: typeof print.declination === 'string' ? parseFloat(print.declination) : print.declination,
      };
    }) as SundialPrint[];

    return {
      prints: processedPrints,
      totalCount,
    };
  } catch (error) {
    console.error('Exception fetching sundial prints:', error);
    throw error; // Re-throw to let component handle it
  }
}
