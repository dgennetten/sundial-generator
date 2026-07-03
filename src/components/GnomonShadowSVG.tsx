import React, { useMemo } from 'react';
import {
  computeGnomonShadowGeometry,
  shadowFillForCoverage,
  shadowPointsToSvgPath,
  type LocationDateTime,
} from '../utils/gnomonShadowUtils';

interface GnomonShadowSVGProps {
  gnomonHeight: number;
  lat: number;
  lng: number;
  tzMeridian: number;
  useDST: boolean;
  dialInclination: number;
  dialDeclination: number;
  originalLatitude?: number;
  shadowDateTime: LocationDateTime;
}

const GnomonShadowSVG: React.FC<GnomonShadowSVGProps> = ({
  gnomonHeight,
  lat,
  lng,
  tzMeridian,
  useDST,
  dialInclination,
  dialDeclination,
  originalLatitude,
  shadowDateTime,
}) => {
  const geometry = useMemo(
    () =>
      computeGnomonShadowGeometry(
        shadowDateTime,
        lat,
        lng,
        tzMeridian,
        gnomonHeight,
        dialInclination,
        dialDeclination,
        useDST,
        originalLatitude,
      ),
    [
      shadowDateTime,
      lat,
      lng,
      tzMeridian,
      useDST,
      gnomonHeight,
      dialInclination,
      dialDeclination,
      originalLatitude,
    ],
  );

  if (!geometry) return null;

  const { penumbraBands, triangle } = geometry;
  const coverages = [1, 2, 3] as const;
  // Gnomon triangle as a subtractable hole: appended to each band and rendered
  // with evenodd so the triangle area is Boolean-subtracted from the shadow.
  const trianglePath = shadowPointsToSvgPath([triangle.tip, triangle.left, triangle.right]);

  return (
    <g className="gnomon-location-shadow" style={{ pointerEvents: 'none' }}>
      {penumbraBands.map((band, i) => (
        <path
          key={coverages[i]}
          d={`${shadowPointsToSvgPath(band)} ${trianglePath}`}
          fill={shadowFillForCoverage(coverages[i])}
          stroke="none"
          fillRule="evenodd"
        />
      ))}
    </g>
  );
};

export default GnomonShadowSVG;
