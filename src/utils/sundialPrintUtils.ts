import { computeInclineDegrees as computeInclinationDegrees } from './sundialMath';
import { supabase } from './supabaseClient';
import type { SundialPrint } from '../types/sundial';
import { log } from './logger';

// Re-export for backward compatibility
export { computeInclinationDegrees };

/**
 * Calculate inclination degrees from inclineType and tiltAngle
 * @deprecated Use computeInclineDegrees from sundialMath instead
 */

/**
 * Save a print/export record to Supabase
 */
export async function saveSundialPrint(print: Omit<SundialPrint, 'id' | 'created_at'>): Promise<void> {
  try {
    const { error } = await supabase
      .from('sundial_prints')
      .insert(print);

    if (error) {
      log.error('Error saving sundial print to Supabase:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  } catch (error) {
    log.error('Exception saving sundial print to Supabase:', error);
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
      log.error('Error counting sundial prints:', countError);
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
      log.error('Error fetching sundial prints:', error);
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
    log.error('Exception fetching sundial prints:', error);
    throw error; // Re-throw to let component handle it
  }
}
