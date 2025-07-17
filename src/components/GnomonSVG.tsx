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
        {/* Popup: right triangle pointing up with dashed left side */}
        {/* Right side (solid) */}
        <line
          x1={0}
          y1={0}
          x2={gnomonHeight}
          y2={-gnomonHeight}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Base side (solid) */}
        <line
          x1={-gnomonHeight}
          y1={-gnomonHeight}
          x2={gnomonHeight}
          y2={-gnomonHeight}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Left side (dashed) */}
        <line
          x1={0}
          y1={0}
          x2={-gnomonHeight}
          y2={-gnomonHeight}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
  }

  if (gnomonType === 'popup-with-brace') {
    return (
      <>
        {/* Main triangle - same as popup */}
        {/* Right side (solid) */}
        <line
          x1={0}
          y1={0}
          x2={gnomonHeight}
          y2={-gnomonHeight}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Base side (solid) */}
        <line
          x1={-gnomonHeight}
          y1={-gnomonHeight}
          x2={gnomonHeight}
          y2={-gnomonHeight}
          stroke="red"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Left side (dashed) */}
        <line
          x1={0}
          y1={0}
          x2={-gnomonHeight}
          y2={-gnomonHeight}
          stroke="red"
          strokeWidth={1}
          strokeDasharray="3,3"
          vectorEffect="non-scaling-stroke"
        />
        {/* Brace design: semicircle over fold line with perpendicular connecting line */}
        {/* Semicircle cutout (dashed outline) */}
        <path
          d={`M ${-gnomonHeight * 0.3 - gnomonHeight * 0.2} ${-gnomonHeight * 0.6} A ${gnomonHeight * 0.2} ${gnomonHeight * 0.2} 0 0 1 ${-gnomonHeight * 0.3 + gnomonHeight * 0.2} ${-gnomonHeight * 0.6}`}
          stroke="blue"
          strokeWidth={1}
          strokeDasharray="2,2"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {/* Perpendicular connecting line (dashed) */}
        <line
          x1={-gnomonHeight * 0.3 - gnomonHeight * 0.2}
          y1={-gnomonHeight * 0.6}
          x2={-gnomonHeight * 0.3 - gnomonHeight * 0.2}
          y2={-gnomonHeight * 0.6 - gnomonHeight * 0.2}
          stroke="blue"
          strokeWidth={1}
          strokeDasharray="2,2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-gnomonHeight * 0.3 + gnomonHeight * 0.2}
          y1={-gnomonHeight * 0.6}
          x2={-gnomonHeight * 0.3 + gnomonHeight * 0.2}
          y2={-gnomonHeight * 0.6 - gnomonHeight * 0.2}
          stroke="blue"
          strokeWidth={1}
          strokeDasharray="2,2"
          vectorEffect="non-scaling-stroke"
        />
        {/* Fold line for semicircle tab (dotted) */}
        <line
          x1={-gnomonHeight * 0.3}
          y1={-gnomonHeight * 0.6}
          x2={-gnomonHeight * 0.3}
          y2={-gnomonHeight * 0.6 - gnomonHeight * 0.2}
          stroke="green"
          strokeWidth={1}
          strokeDasharray="3,3"
          vectorEffect="non-scaling-stroke"
        />
        {/* Cut lines for semicircle (solid) */}
        <path
          d={`M ${-gnomonHeight * 0.3 - gnomonHeight * 0.2} ${-gnomonHeight * 0.6} A ${gnomonHeight * 0.2} ${gnomonHeight * 0.2} 0 0 1 ${-gnomonHeight * 0.3 + gnomonHeight * 0.2} ${-gnomonHeight * 0.6}`}
          stroke="black"
          strokeWidth={1}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {/* Cut lines for perpendicular connections (solid) */}
        <line
          x1={-gnomonHeight * 0.3 - gnomonHeight * 0.2}
          y1={-gnomonHeight * 0.6}
          x2={-gnomonHeight * 0.3 - gnomonHeight * 0.2}
          y2={-gnomonHeight * 0.6 - gnomonHeight * 0.2}
          stroke="black"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={-gnomonHeight * 0.3 + gnomonHeight * 0.2}
          y1={-gnomonHeight * 0.6}
          x2={-gnomonHeight * 0.3 + gnomonHeight * 0.2}
          y2={-gnomonHeight * 0.6 - gnomonHeight * 0.2}
          stroke="black"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
  }

  return null;
};

export default GnomonSVG; 