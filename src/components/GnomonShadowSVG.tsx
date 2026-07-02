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

  const maskId = React.useId();

  if (!geometry) return null;

  const { penumbraBands, triangle } = geometry;
  const coverages = [1, 2, 3] as const;
  const trianglePath = shadowPointsToSvgPath([triangle.tip, triangle.left, triangle.right]);

  return (
    <g className="gnomon-location-shadow" style={{ pointerEvents: 'none' }}>
      {/* Mask keeps the shadow everywhere except the gnomon triangle, which is left unfilled. */}
      <mask id={maskId} maskUnits="userSpaceOnUse">
        {penumbraBands.map((band, i) => (
          <path key={coverages[i]} d={shadowPointsToSvgPath(band)} fill="white" stroke="none" />
        ))}
        <path d={trianglePath} fill="black" stroke="none" />
      </mask>
      <g mask={`url(#${maskId})`}>
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
    </g>
  );
};

export default GnomonShadowSVG;
