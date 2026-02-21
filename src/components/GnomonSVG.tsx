import React from 'react';

interface GnomonSVGProps {
  gnomonType: 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north' | 'crosshair-with-height';
  gnomonHeight: number;
  lat?: number;
  inclineType?: string;
  fontSize?: number;
  originalLatitude?: number;
  /** Wall declination in degrees (horizontal dials only); gnomon rotates about (0,0) by this angle */
  wallDeclination?: number;
}

const GnomonSVG: React.FC<GnomonSVGProps> = ({
  gnomonType,
  gnomonHeight,
  lat = 0,
  inclineType = 'Horizontal',
  fontSize = 20,
  originalLatitude,
  wallDeclination = 0,
}) => {
  // Convert fontSize from pt to mm for SVG (1 pt = 25.4/72 mm = 0.3528 mm)
  const fontSizeMm = fontSize * 0.3528;

  // Simple logic: determine if gnomon is above or below equinox line
  const getPopupOrientation = (): 'up' | 'down' => {
    // The 'lat' prop passed to GnomonSVG is already the effectiveLatitude from App.tsx
    // This represents the latitude of the dial's plane.
    const dialPlaneLatitude = lat; // Use the effectiveLatitude directly

    // Special case for Polar: The effective latitude is 0, so it's at the equinox.
    // The user's rule implies "at equinox" should point DOWN.
    if (inclineType === 'Polar') {
      return 'down';
    }

    // For all other cases, use the dialPlaneLatitude (effectiveLatitude)
    // to determine if the gnomon is above or below the equinox.
    // Gnomon above equinox (dialPlaneLatitude >= 0) -> point DOWN
    // Gnomon below equinox (dialPlaneLatitude < 0) -> point UP
    return dialPlaneLatitude >= 0 ? 'down' : 'up';
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
    // On horizontal declined dials, rotate gnomon about (0,0) by wall declination
    const declinationRotate = inclineType === 'Horizontal' && wallDeclination ? `rotate(${-wallDeclination})` : '';

    return (
      <g transform={[declinationRotate, flipTransform].filter(Boolean).join(' ')}>
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
    const declinationRotate = inclineType === 'Horizontal' && wallDeclination ? `rotate(${-wallDeclination})` : '';

    return (
      <g transform={[declinationRotate, flipTransform].filter(Boolean).join(' ')}>
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
  return null;
};

export default GnomonSVG; 