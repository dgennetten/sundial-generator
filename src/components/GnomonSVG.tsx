import React from 'react';

interface GnomonSVGProps {
  gnomonType: 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north' | 'crosshair-with-height' | 'glued-popup-base' | 'dual-dial-popup';
  gnomonHeight: number;
  lat?: number;
  inclineType?: string;
  dialInclination?: number;
  fontSize?: number;
  originalLatitude?: number;
  /** Show a "GLUE" label on the popup triangle (the dual dial glues its net tab here). */
  glueLabel?: boolean;
}

const GnomonSVG: React.FC<GnomonSVGProps> = ({
  gnomonType,
  gnomonHeight,
  lat = 0,
  dialInclination = 0,
  fontSize = 20,
  originalLatitude,
  glueLabel = false,
}) => {
  // Convert fontSize from pt to mm for SVG (1 pt = 25.4/72 mm = 0.3528 mm)
  const fontSizeMm = fontSize * 0.3528;

  // Determine popup gnomon orientation so the triangle always points toward the dial grid.
  // Geographic latitude determines which side of the equinox line the gnomon sits on.
  // When dialInclination exceeds the polar angle (= |lat|), the dial has tilted past
  // polar and the gnomon triangle needs to flip 180° to stay clear of the dial grid.
  const getPopupOrientation = (): 'up' | 'down' => {
    const geoLat = originalLatitude ?? lat;
    const isNorthern = geoLat >= 0;
    const polarAngle = Math.abs(geoLat);
    const pastPolar = dialInclination > polarAngle;

    // Base orientation: northern hemisphere → 'down', southern → 'up'
    // Flip when past polar because the dial face has rotated through vertical
    // and the gnomon triangle would land on the dial grid without the flip.
    const base: 'up' | 'down' = isNorthern ? 'down' : 'up';
    if (pastPolar) return base === 'down' ? 'up' : 'down';
    return base;
  };

  const popupOrientation = getPopupOrientation();

  if (gnomonType === 'crosshair') {
    return (
      <>
        {/* Crosshair gnomon: a "+" at (0,0), 6px long arms */}
        <line x1={-3} y1={0} x2={3} y2={0} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </>
    );
  }

  if (gnomonType === 'crosshair-with-north') {
    // Determine hemisphere based on original geographic latitude
    // Northern hemisphere (lat >= 0): N above the crosshair (negative y)
    // Southern hemisphere (lat < 0): N below the crosshair (positive y)
    const isNorthernHemisphere = (originalLatitude ?? lat) >= 0;
    const northPointY = isNorthernHemisphere ? -12 : 12;
    const arrowBaseY = isNorthernHemisphere ? -10 : 10;
    const letterY1 = isNorthernHemisphere ? -20 : 20;
    const letterY2 = isNorthernHemisphere ? -15 : 15;
    
    // For southern hemisphere, flip horizontally to keep "N" readable
    const flipTransform = isNorthernHemisphere ? undefined : 'scale(-1, 1)';
    
    // Arrow should point toward north
    // Northern hemisphere: arrow points up (toward negative y, toward crosshair)
    // Southern hemisphere: arrow points down (toward positive y, away from crosshair)
    // For northern: tip at arrowBaseY (closer to crosshair), base at northPointY (further)
    // For southern: tip at northPointY (further from crosshair), base at arrowBaseY (closer)
    const arrowTipY = isNorthernHemisphere ? arrowBaseY : northPointY;
    const arrowBaseEdgeY = isNorthernHemisphere ? northPointY : arrowBaseY;
    
    return (
      <>
        {/* Crosshair gnomon: a "+" at (0,0), 6px long arms */}
        <line x1={-3} y1={0} x2={3} y2={0} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {/* North Point - positioned above for northern hemisphere, below for southern hemisphere */}
        <g transform={flipTransform}>
          <path d={`M 2 ${arrowBaseEdgeY} L 0 ${arrowTipY} L -2 ${arrowBaseEdgeY} Z`} stroke="black" strokeWidth={2} fill="black" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <path d={`M 2 ${letterY1} L 2 ${letterY2} L -2 ${letterY1} L -2 ${letterY2}`} stroke="black" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </>
    );
  }

  if (gnomonType === 'crosshair-with-height') {
    return (
      <>
        {/* Crosshair gnomon: a "+" at (0,0), 6px long arms */}
        <line x1={-3} y1={0} x2={3} y2={0} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {/* Gnomon Height text - positioned above the gnomon like the north point */}
        <text
          x={0}
          y={-15}
          fontSize={fontSizeMm}
          fill="black"
          textAnchor="middle"
          alignmentBaseline="middle"
          transform={(originalLatitude ?? lat) >= 0 ? `rotate(180 0 -15)` : undefined}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {gnomonHeight}mm
        </text>
      </>
    );
  }

  if (gnomonType === 'popup') {
    // For popup orientation, we need to flip the triangle if pointing up
    const flipTransform = popupOrientation === 'up' ? 'scale(1, -1)' : '';
    return (
      <>
        <g transform={flipTransform || undefined}>
          {/* Popup: right triangle pointing down with dashed left side */}
          {/* Right side (solid) */}
          <line
            x1={0}
            y1={0}
            x2={gnomonHeight / Math.SQRT2}
            y2={-gnomonHeight / Math.SQRT2}
            stroke="red"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {/* Base side (solid) */}
          <line
            x1={-gnomonHeight / Math.SQRT2}
            y1={-gnomonHeight / Math.SQRT2}
            x2={gnomonHeight / Math.SQRT2}
            y2={-gnomonHeight / Math.SQRT2}
            stroke="red"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {/* Left side (dashed) */}
          <line
            x1={0}
            y1={0}
            x2={-gnomonHeight / Math.SQRT2}
            y2={-gnomonHeight / Math.SQRT2}
            stroke="red"
            strokeWidth={1}
            strokeDasharray="3,3"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        {/* "GLUE" centred in the triangle (the dual dial's net tab glues here).
            Drawn outside the flip group and placed at the post-flip centroid so
            it stays upright. */}
        {glueLabel && (
          <text
            x={0}
            y={(popupOrientation === 'up' ? 1 : -1) * (2 * (gnomonHeight / Math.SQRT2) / 3)}
            fontSize={gnomonHeight * 0.16}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="red"
            fontFamily="sans-serif"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >GLUE</text>
        )}
      </>
    );
  }

  if (gnomonType === 'popup-with-brace') {
    const leftMidX = -gnomonHeight / (2 * Math.SQRT2);
    const leftMidY = -gnomonHeight / (2 * Math.SQRT2);
    const arcRadius = gnomonHeight * 0.2;
    const len = Math.sqrt(leftMidX * leftMidX + leftMidY * leftMidY);
    const shiftX = (leftMidX + (-leftMidX / len) * arcRadius) * 1.5;
    const shiftY = (leftMidY + (-leftMidY / len) * arcRadius) * 1.5;
    const theta = -Math.PI / 4;
    const arcStartX = shiftX - arcRadius;
    const rotatedStartX = shiftX + (arcStartX - shiftX) * Math.cos(theta);
    const rotatedStartY = shiftY + (arcStartX - shiftX) * Math.sin(theta);
    const arcEndX = shiftX + arcRadius;
    const rotatedEndX = shiftX + (arcEndX - shiftX) * Math.cos(theta);
    const rotatedEndY = shiftY + (arcEndX - shiftX) * Math.sin(theta);

    // For popup orientation, we need to flip the triangle if pointing up
    const flipTransform = popupOrientation === 'up' ? 'scale(1, -1)' : '';
    // On horizontal declined dials, rotate gnomon about (0,0) by wall declination
    return (
      <g transform={flipTransform || undefined}>
        {/* Main triangle - same as popup */}
        {/* Right side (solid) */}
        <line
          x1={0}
          y1={0}
          x2={gnomonHeight / Math.SQRT2}
          y2={-gnomonHeight / Math.SQRT2}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Base side (solid) */}
        <line
          x1={-gnomonHeight / Math.SQRT2}
          y1={-gnomonHeight / Math.SQRT2}
          x2={gnomonHeight / Math.SQRT2}
          y2={-gnomonHeight / Math.SQRT2}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Left side (third dashed, eighth solid, eighth dashed)  */}
        <line
          x1={-gnomonHeight / Math.SQRT2 * 2 / 3}
          y1={-gnomonHeight / Math.SQRT2 * 2 / 3}
          x2={-gnomonHeight / Math.SQRT2}
          y2={-gnomonHeight / Math.SQRT2}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-gnomonHeight / Math.SQRT2 * 9 / 16}
          y1={-gnomonHeight / Math.SQRT2 * 9 / 16}
          x2={-gnomonHeight / Math.SQRT2 * 2 / 3}
          y2={-gnomonHeight / Math.SQRT2 * 2 / 3}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-gnomonHeight / Math.SQRT2 / 4}
          y1={-gnomonHeight / Math.SQRT2 / 4}
          x2={0}
          y2={0}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />


        {/* Rotated semicircular arc, center moved toward (0,0) by arc radius */}
        <path
          d={`M ${shiftX - arcRadius} ${shiftY} A ${arcRadius} ${arcRadius} 0 0 1 ${shiftX + arcRadius} ${shiftY}`}
          stroke="red"
          strokeWidth={1}
          fill="none"
          vectorEffect="non-scaling-stroke"
          transform={`rotate(-45 ${shiftX} ${shiftY})`}
        />
        {/* Solid red line from rotated arc start to (-gnomonHeight/Math.SQRT2/4, gnomonHeight/Math.SQRT2/4) */}
        <line
          x1={rotatedStartX}
          y1={rotatedStartY}
          x2={-gnomonHeight / Math.SQRT2 / 2}
          y2={0}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Solid red line from right (end) of rotated arc to (gnomonHeight/Math.SQRT2/4, -gnomonHeight/Math.SQRT2/4) */}
        <line
          x1={rotatedEndX}
          y1={rotatedEndY}
          x2={-gnomonHeight / Math.SQRT2 / 4}
          y2={-gnomonHeight / Math.SQRT2 / 4}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-gnomonHeight / Math.SQRT2 / 2}
          y1={0}
          x2={-gnomonHeight / Math.SQRT2 / 4}
          y2={-gnomonHeight / Math.SQRT2 / 4}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }
  if (gnomonType === 'glued-popup-base') {
    // Same triangle as 'popup' but all lines dashed, plus a vertical center line
    // from the tip (0,0) to the base midpoint (0, -H/√2).
    // Labels A (left half) and B (right half) at each half-triangle's centroid.
    const flipTransform = popupOrientation === 'up' ? 'scale(1, -1)' : '';
    // Centroid of each half-triangle: x = ±H/(3√2), y = −2H/(3√2).
    // Text is outside the flip group so glyphs stay upright; y sign tracks orientation.
    // NH dials default to dialOrientation='North' which rotates the content group 180°,
    // so swap A/B x-positions and counter-rotate glyphs to compensate.
    const isNH = (originalLatitude ?? lat) >= 0;
    const labelX = gnomonHeight / (3 * Math.SQRT2);
    const labelY = (popupOrientation === 'up' ? 1 : -1) * 2 * gnomonHeight / (3 * Math.SQRT2);
    const labelFontSize = gnomonHeight * 0.1875; // 25% smaller than gnomonHeight/4
    const aX = isNH ? labelX : -labelX;
    const bX = isNH ? -labelX : labelX;
    return (
      <>
        <g transform={flipTransform || undefined}>
          {/* Right side */}
          <line
            x1={0} y1={0}
            x2={gnomonHeight / Math.SQRT2} y2={-gnomonHeight / Math.SQRT2}
            stroke="red" strokeWidth={1}
            strokeDasharray="3,3"
            vectorEffect="non-scaling-stroke"
          />
          {/* Base */}
          <line
            x1={-gnomonHeight / Math.SQRT2} y1={-gnomonHeight / Math.SQRT2}
            x2={gnomonHeight / Math.SQRT2} y2={-gnomonHeight / Math.SQRT2}
            stroke="red" strokeWidth={1}
            strokeDasharray="3,3"
            vectorEffect="non-scaling-stroke"
          />
          {/* Left side */}
          <line
            x1={0} y1={0}
            x2={-gnomonHeight / Math.SQRT2} y2={-gnomonHeight / Math.SQRT2}
            stroke="red" strokeWidth={1}
            strokeDasharray="3,3"
            vectorEffect="non-scaling-stroke"
          />
          {/* Vertical center line — tip to base midpoint */}
          <line
            x1={0} y1={0}
            x2={0} y2={-gnomonHeight / Math.SQRT2}
            stroke="red" strokeWidth={1}
            strokeDasharray="3,3"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <text
          x={aX} y={labelY}
          fontSize={labelFontSize}
          fill="red"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={isNH ? `rotate(180 ${aX} ${labelY})` : undefined}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >A</text>
        <text
          x={bX} y={labelY}
          fontSize={labelFontSize}
          fill="red"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={isNH ? `rotate(180 ${bX} ${labelY})` : undefined}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >B</text>
      </>
    );
  }

  return null;
};

export default GnomonSVG; 