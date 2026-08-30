import React, { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import {
  computeGnomonShadowGeometry,
  shadowFillForCoverage,
  shadowPointsToSvgPath,
  type LocationDateTime,
  type ShadowFrameUpdater,
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
  /** True while the shadow is actively sweeping. When set, this instance registers an
      imperative updater with `shadowUpdaters` and lets the animation loop rewrite its path
      `d`s directly, so the dial is not re-rendered per frame. */
  animating?: boolean;
  shadowUpdaters?: MutableRefObject<Set<ShadowFrameUpdater>>;
}

const COVERAGES = [1, 2, 3] as const;

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
  animating = false,
  shadowUpdaters,
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

  // Refs to the three band <path>s so the animation loop can rewrite their `d` in place.
  const bandRefs = useRef<(SVGPathElement | null)[]>([]);

  // While animating, register an imperative updater: recompute this instance's geometry for the
  // frame's instant and write the new `d`s straight to the DOM — no React reconciliation. The
  // gnomon triangle is time-invariant, so only the band outlines change per frame.
  useLayoutEffect(() => {
    if (!animating || !shadowUpdaters) return;
    const updater: ShadowFrameUpdater = (dt) => {
      const g = computeGnomonShadowGeometry(
        dt, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude,
      );
      if (!g) {
        bandRefs.current.forEach((el) => el && el.setAttribute('d', ''));
        return;
      }
      const tri = shadowPointsToSvgPath([g.triangle.tip, g.triangle.left, g.triangle.right]);
      g.penumbraBands.forEach((band, i) => {
        const el = bandRefs.current[i];
        if (el) el.setAttribute('d', `${shadowPointsToSvgPath(band)} ${tri}`);
      });
    };
    const set = shadowUpdaters.current;
    set.add(updater);
    return () => { set.delete(updater); };
  }, [animating, shadowUpdaters, lat, lng, tzMeridian, gnomonHeight, dialInclination, dialDeclination, useDST, originalLatitude]);

  const bandDPath = (band: { x: number; y: number }[] | undefined, tri: string) =>
    band ? `${shadowPointsToSvgPath(band)} ${tri}` : '';

  // Animating: always emit the three <path>s (with refs) even if the anchor frame has no
  // geometry (e.g. the current clock hour is at night while the sweep covers daylight hours),
  // so the frame loop always has elements to write into. Initial `d` comes from the anchor
  // frame when it exists.
  if (animating) {
    const bands = geometry ? geometry.penumbraBands : [];
    const tri = geometry
      ? shadowPointsToSvgPath([geometry.triangle.tip, geometry.triangle.left, geometry.triangle.right])
      : '';
    return (
      <g className="gnomon-location-shadow" style={{ pointerEvents: 'none' }}>
        {COVERAGES.map((cov, i) => (
          <path
            key={cov}
            ref={(el) => { bandRefs.current[i] = el; }}
            d={bandDPath(bands[i], tri)}
            fill={shadowFillForCoverage(cov)}
            stroke="none"
            fillRule="evenodd"
          />
        ))}
      </g>
    );
  }

  if (!geometry) return null;

  const { penumbraBands, triangle } = geometry;
  // Gnomon triangle as a subtractable hole: appended to each band and rendered
  // with evenodd so the triangle area is Boolean-subtracted from the shadow.
  const trianglePath = shadowPointsToSvgPath([triangle.tip, triangle.left, triangle.right]);

  return (
    <g className="gnomon-location-shadow" style={{ pointerEvents: 'none' }}>
      {penumbraBands.map((band, i) => (
        <path
          key={COVERAGES[i]}
          d={`${shadowPointsToSvgPath(band)} ${trianglePath}`}
          fill={shadowFillForCoverage(COVERAGES[i])}
          stroke="none"
          fillRule="evenodd"
        />
      ))}
    </g>
  );
};

export default GnomonShadowSVG;
