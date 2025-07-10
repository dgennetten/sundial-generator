import React from 'react';
import { getAnalemmaPointsProjected } from '../utils/analemmaGenerator';

const pageSizeMap = {
  Letter: { width: 8.5 * 25.4, height: 11 * 25.4 },
  A4: { width: 210, height: 297 },
  Custom: { width: 8.5 * 25.4, height: 11 * 25.4 }, // fallback for now
};

type Props = {
  lat: number;
  lng: number;
  tzMeridian: number;
  scale: number;
  gnomonHeight: number;
  startHour: number;
  stopHour: number;
  orientation: 'Landscape' | 'Portrait';
  pageSize: 'A4' | 'Letter' | 'Custom';
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
  pageSize,
}) => {
  let { width, height } = pageSizeMap[pageSize] || pageSizeMap.Letter;
  if (orientation === 'Landscape') {
    [width, height] = [height, width];
  }
  const hourCurves = [];

  for (let h = startHour; h <= stopHour; h++) {
    const points = getAnalemmaPointsProjected({
      lat,
      lng,
      tzMeridian,
      hour: h,
      gnomonHeight,
      orientation: 'Horizontal', // Always use 'Horizontal' for analemma
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
        <strong>Projected Shadow Preview</strong> ({orientation})
      </legend>
      <svg
        width={width}
        height={height}
        viewBox={`-${width / 2} -${height / 2} ${width} ${height}`}
        style={{ border: '1px solid #ccc', background: '#fff' }}
      >
        <g transform={`translate(0, 0)`}>
          <circle cx={0} cy={0} r={3} fill="red" />
          {hourCurves}
        </g>
      </svg>
    </fieldset>
  );
};

export default SundialPreview;
