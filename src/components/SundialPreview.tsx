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
  dateRange: 'FullYear' | 'SummerToWinter' | 'WinterToSummer';
  hourlineStyle?: {
    width: string;
    color: string;
    style: 'solid' | 'dashed';
    name: string;
  };
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
  dateRange,
  hourlineStyle,
}) => {
  let { width, height } = pageSizeMap[pageSize] || pageSizeMap.Letter;
  if (orientation === 'Landscape') {
    [width, height] = [height, width];
  }
  const hourCurves = [];

  // Helper to get day range
  function getDayRange(dateRange: 'FullYear' | 'SummerToWinter' | 'WinterToSummer') {
    // Approximate: Summer solstice ~ day 172, Winter solstice ~ day 355 (northern hemisphere)
    if (dateRange === 'FullYear') return [1, 365];
    if (dateRange === 'SummerToWinter') return [172, 355];
    if (dateRange === 'WinterToSummer') return [355, 365, 1, 172]; // wrap around
    return [1, 365];
  }

  // Helper to split points for WinterToSummer
  function splitWinterToSummer(points: { day: number; x: number; y: number }[]): [{ day: number; x: number; y: number }[], { day: number; x: number; y: number }[]] {
    const seg1 = points.filter((p: { day: number; x: number; y: number }) => p.day >= 355);
    const seg2 = points.filter((p: { day: number; x: number; y: number }) => p.day <= 172);
    return [seg1, seg2];
  }

  // Calculate noon analemma vertical center
  const noonHour = 12;
  let noonPoints = getAnalemmaPointsProjected({
    lat,
    lng,
    tzMeridian,
    hour: noonHour,
    gnomonHeight,
    orientation: 'Horizontal',
  });
  // Filter noonPoints by date range
  if (dateRange === 'WinterToSummer') {
    // Split into two segments and combine for y-centering
    const [seg1, seg2] = splitWinterToSummer(noonPoints);
    noonPoints = [...seg1, ...seg2];
  } else {
    const [start, end] = getDayRange(dateRange);
    noonPoints = noonPoints.filter(p => p.day >= start && p.day <= end);
  }
  let noonYCenter = 0;
  if (noonPoints.length > 0) {
    const yVals = noonPoints.map((p) => scale * p.y);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    noonYCenter = (minY + maxY) / 2;
  }

  // Determine stroke width and dasharray from hourlineStyle
  const strokeColor = hourlineStyle?.color || 'black';
  let strokeWidth = 1;
  if (hourlineStyle?.width === 'hairline') strokeWidth = 1;
  else if (hourlineStyle?.width?.endsWith('mm')) strokeWidth = parseFloat(hourlineStyle.width) * 3.78 || 1; // 1mm ≈ 3.78px
  const strokeDasharray = hourlineStyle?.style === 'dashed' ? '6,4' : undefined;

  for (let h = startHour; h <= stopHour; h++) {
    let points = getAnalemmaPointsProjected({
      lat,
      lng,
      tzMeridian,
      hour: h,
      gnomonHeight,
      orientation: 'Horizontal', // Always use 'Horizontal' for analemma
    });
    // Filter points by date range
    if (dateRange === 'WinterToSummer') {
      const [seg1, seg2] = splitWinterToSummer(points);
      [seg1, seg2].forEach((segment, idx) => {
        if (segment.length === 0) return;
        const pathData = segment
          .map((p: { x: number; y: number }, i: number) => {
            const x = scale * p.x;
            const y = scale * p.y;
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(' ');
        hourCurves.push(
          <g key={`${h}-seg${idx}`}>
            <path
              d={pathData}
              stroke={strokeColor}
              fill="none"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
            />
            {idx === 0 && (
              <text
                x={scale * segment[0].x}
                y={scale * segment[0].y - 4}
                fontSize="10"
                fill={strokeColor}
              >
                {h}:00
              </text>
            )}
          </g>
        );
      });
      continue;
    } else {
      const [start, end] = getDayRange(dateRange);
      points = points.filter((p: { day: number }) => p.day >= start && p.day <= end);
    }
    if (points.length === 0) continue;
    const pathData = points
      .map((p: { x: number; y: number }, i: number) => {
        const x = scale * p.x;
        const y = scale * p.y;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
    hourCurves.push(
      <g key={h}>
        <path
          d={pathData}
          stroke={strokeColor}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
        <text
          x={scale * points[0].x}
          y={scale * points[0].y - 4}
          fontSize="10"
          fill={strokeColor}
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
      <div style={{ width: '100%', maxWidth: '1000px', margin: 'auto' }}>
        <svg
          width="100%"
          height="auto"
          viewBox={`-${width / 2} -${height / 2} ${width} ${height}`}
          style={{ display: 'block', border: '1px solid #ccc', background: '#fff', width: '100%', height: 'auto' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(0, ${-noonYCenter})`}>
            <circle cx={0} cy={0} r={3} fill="red" />
            {hourCurves}
          </g>
        </svg>
      </div>
    </fieldset>
  );
};

export default SundialPreview;
