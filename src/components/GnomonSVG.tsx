import React from 'react';

interface GnomonSVGProps {
  gnomonType: 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north' | 'crosshair-with-height';
  gnomonHeight: number;
  lat?: number;
  inclineType?: string;
  fontSize?: number;
  dialFacing?: 'North' | 'South';
}

const GnomonSVG: React.FC<GnomonSVGProps> = ({
  gnomonType,
  gnomonHeight,
  lat = 0,
  inclineType = 'Horizontal',
  fontSize = 20,
  dialFacing = 'South'
}) => {
  // Convert fontSize from pt to mm for SVG (1 pt = 25.4/72 mm = 0.3528 mm)
  const fontSizeMm = fontSize * 0.3528;

  // Simple logic: determine if gnomon is above or below equinox line
  const getPopupOrientation = (): 'up' | 'down' => {
    // The 'lat' prop passed to GnomonSVG is already the effectiveLatitude from App.tsx
    // This represents the latitude of the dial's plane.
    const dialPlaneLatitude = lat; // Use the effectiveLatitude directly

    // Special case for Equatorial: The effective latitude is 0, so it's at the equinox.
    // The user's rule implies "at equinox" should point DOWN.
    if (inclineType === 'Equatorial') {
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
    return (
      <>
        {/* Crosshair gnomon: a "+" at (0,0), 6px long arms */}
        <line x1={-3} y1={0} x2={3} y2={0} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {/* North Point*/}
        <path d="M 2 -12 L 0 -10 L -2 -12 Z" stroke="black" strokeWidth={2} fill="black" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <path d="M 2 -20 L 2 -15 L -2 -20 L -2 -15" stroke="black" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
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
          transform={dialFacing === 'North' ? `rotate(180 0 -15)` : undefined}
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
      <g transform={flipTransform}>
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
    const shiftX = (leftMidX + (-leftMidX / len) * arcRadius) *1.5;
    const shiftY = (leftMidY + (-leftMidY / len) * arcRadius) *1.5;
    const theta = -Math.PI / 4;
    const arcStartX = shiftX - arcRadius;
    const rotatedStartX = shiftX + (arcStartX - shiftX) * Math.cos(theta);
    const rotatedStartY = shiftY + (arcStartX - shiftX) * Math.sin(theta);
    const arcEndX = shiftX + arcRadius;
    const rotatedEndX = shiftX + (arcEndX - shiftX) * Math.cos(theta);
    const rotatedEndY = shiftY + (arcEndX - shiftX) * Math.sin(theta);
    
    // For popup orientation, we need to flip the triangle if pointing up
    const flipTransform = popupOrientation === 'up' ? 'scale(1, -1)' : '';
    
    return (
      <g transform={flipTransform}>
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
          x1={-gnomonHeight / Math.SQRT2 * 2/3}
          y1={-gnomonHeight / Math.SQRT2 * 2/3}
          x2={-gnomonHeight / Math.SQRT2}
          y2={-gnomonHeight / Math.SQRT2}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-gnomonHeight / Math.SQRT2 * 9/16}
          y1={-gnomonHeight / Math.SQRT2 * 9/16}
          x2={-gnomonHeight / Math.SQRT2 * 2/3}
          y2={-gnomonHeight / Math.SQRT2 * 2/3}
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
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }
  return null;
};

export default GnomonSVG; 