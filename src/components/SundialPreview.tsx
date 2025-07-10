// src/components/SundialPreview.tsx

import React from 'react';
import { getAnalemmaPointsProjected } from '../utils/analemmaGenerator';
import type { Orientation } from '../utils/analemmaGenerator';

type Props = {
  lat: number;
  lng: number;
  tzMeridian: number;
  scale: number;
  gnomonHeight: number;
  startHour: number;
  stopHour: number;
  orientation: Orientation;
};

const colorForHour = (hour: number) => {
  const hue = 200 + (hour - 6) * 12;
  return `hsl(${hue}, 70%, 50%)`;
};

const SundialPreview: React.FC<Props> = ({
  lat,
  lng,
  tzMeridian,
  scale,
  gnomonHeight,
  startHour,
  stopHour,
  orientation,
}) => {
  const hourCurves = [];

  for (let h = startHour; h <= stopHour; h++) {
    const points = getAnalemmaPointsProjected({
      lat,
      lng,
      tzMeridian,
      hour: h,
      gnomonHeight,
      orientation,
    });

    if (points.length === 0) continue;

    const pathData = points
      .map((p, i) => {
        const x = scale * p.x;
        const y = scale * p.y;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');

    hourCurves.push(
      <g key={h}>
        <path
          d={pathData}
          stroke={colorForHour(h)}
          fill="none"
          strokeWidth={1.5}
        />
        <text
          x={scale * points[0].x}
          y={scale * points[0].y - 4}
          fontSize="10"
          fill={colorForHour(h)}
        >
          {h}:00
        </text>
      </g>
    );
  }

  return (
    <fieldset style={{ marginTop: '1rem' }}>
      <legend>
        <strong>Projected Shadow Preview</strong> ({orientation} Dial)
      </legend>
      <svg
        width={600}
        height={600}
        viewBox="-300 -300 600 600"
        style={{ border: '1px solid #ccc' }}
      >
        <circle cx={0} cy={0} r={3} fill="red" />
        {hourCurves}
      </svg>
    </fieldset>
  );
};

export default SundialPreview;