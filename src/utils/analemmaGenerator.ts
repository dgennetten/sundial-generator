// src/utils/analemmaGenerator.ts
// DEPRECATED: This module is deprecated. Import from sundialMath instead.
// This file only exists for backward compatibility.

import type { Orientation } from './sundialMath';

export { degreesToRadians, radiansToDegrees } from './sundialMath';
export { getEquationOfTime, getSolarDeclination } from './sundialMath';
export { getSolarPosition, projectShadowToSurface, getAnalemmaPointsProjected } from './sundialMath';

// Re-export types
export type { Orientation as SundialOrientation, SolarPositionResult, ShadowProjectionResult, AnalemmaPoint } from './sundialMath';

// Keep original type alias for backward compatibility
export type { Orientation };

export interface AnalemmaParams {
  lat: number;
  lng: number;
  tzMeridian: number;
  hour: number;
  gnomonHeight: number;
  orientation: Orientation;
}
