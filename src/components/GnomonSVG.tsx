import React from 'react';

interface GnomonSVGProps {
  gnomonType: 'crosshair' | 'popup' | 'popup-with-brace';
  gnomonHeight: number;
}

const GnomonSVG: React.FC<GnomonSVGProps> = ({ gnomonType, gnomonHeight }) => {
  if (gnomonType === 'crosshair') {
    return (
      <>
        {/* Crosshair gnomon: a "+" at (0,0), 6px long arms */}
        <line x1={-3} y1={0} x2={3} y2={0} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </>
    );
  }

  if (gnomonType === 'popup') {
    return (
      <>
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
      </>
    );
  }

  if (gnomonType === 'popup-with-brace') {
    const leftMidX = -gnomonHeight / (2 * Math.SQRT2);
    const leftMidY = -gnomonHeight / (2 * Math.SQRT2);
    const arcRadius = gnomonHeight * 0.2;
    const len = Math.sqrt(leftMidX * leftMidX + leftMidY * leftMidY);
    const shiftX = leftMidX + (-leftMidX / len) * arcRadius;
    const shiftY = leftMidY + (-leftMidY / len) * arcRadius;
    const theta = -Math.PI / 4;
    const arcStartX = shiftX - arcRadius;
    const arcStartY = shiftY;
    const rotatedStartX = shiftX + (arcStartX - shiftX) * Math.cos(theta);
    const rotatedStartY = shiftY + (arcStartX - shiftX) * Math.sin(theta);
    const arcEndX = shiftX + arcRadius;
    const arcEndY = shiftY;
    const rotatedEndX = shiftX + (arcEndX - shiftX) * Math.cos(theta);
    const rotatedEndY = shiftY + (arcEndX - shiftX) * Math.sin(theta);
    return (
      <>
        {/* Main triangle - same as popup */}
        {/* Right side (3/4 solid, quarter dashed) */}
        <line
          x1={gnomonHeight / Math.SQRT2 / 4}
          y1={-gnomonHeight / Math.SQRT2 / 4}
          x2={gnomonHeight / Math.SQRT2}
          y2={-gnomonHeight / Math.SQRT2}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
         <line
          x1={-gnomonHeight / Math.SQRT2 / 4}
          y1={gnomonHeight / Math.SQRT2 / 4}
          x2={gnomonHeight / Math.SQRT2 / 4}
          y2={-gnomonHeight / Math.SQRT2 / 4}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
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
        {/* Left side (half dashed, quarter solid)  */}
        <line
          x1={-gnomonHeight / Math.SQRT2 / 2}
          y1={-gnomonHeight / Math.SQRT2 / 2}
          x2={-gnomonHeight / Math.SQRT2}
          y2={-gnomonHeight / Math.SQRT2}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-gnomonHeight / Math.SQRT2 / 4}
          y1={-gnomonHeight / Math.SQRT2 / 4}
          x2={-gnomonHeight / Math.SQRT2 / 2}
          y2={-gnomonHeight / Math.SQRT2 / 2}
          stroke="red"
          strokeWidth={1}
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
          x2={-gnomonHeight / Math.SQRT2 / 4}
          y2={gnomonHeight / Math.SQRT2 / 4}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Solid red line from right (end) of rotated arc to (gnomonHeight/Math.SQRT2/4, -gnomonHeight/Math.SQRT2/4) */}
        <line
          x1={rotatedEndX}
          y1={rotatedEndY}
          x2={gnomonHeight / Math.SQRT2 / 4}
          y2={-gnomonHeight / Math.SQRT2 / 4}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
  }

  return null;
};

export default GnomonSVG; 