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

  const { penumbraBands } = geometry;
  const coverages = [1, 2, 3] as const;

  return (
    <g className="gnomon-location-shadow" style={{ pointerEvents: 'none' }}>
      {penumbraBands.map((band, i) => (
        <path
          key={coverages[i]}
          d={shadowPointsToSvgPath(band)}
          fill={shadowFillForCoverage(coverages[i])}
          stroke="none"
          fillRule="nonzero"
        />
      ))}
    </g>
  );
};

export default GnomonShadowSVG;
