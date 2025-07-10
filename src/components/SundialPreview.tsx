import React from 'react';
import { getAnalemmaPointsProjected, degreesToRadians, getSolarDeclination, projectShadowToSurface } from '../utils/analemmaGenerator';
import type { DeclinationLine } from './DeclinationLineOptions';
import type { LineStyle } from './LineSettings';

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
  declinationLines?: DeclinationLine[];
  lineStyles?: LineStyle[];
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
  declinationLines = [],
  lineStyles = [],
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

  // Helper to get declination for a declination line
  function getDeclinationForLine(line: DeclinationLine): number | null {
    if (line.date === 'Equinox') return 0;
    if (line.date === 'Summer Solstice') return 23.44;
    if (line.date === 'Winter Solstice') return -23.44;
    // Try to parse user date as month/day
    let date = new Date(line.date + ' 2000'); // year doesn't matter for declination
    if (isNaN(date.getTime())) {
      // Try parsing as 'MMM DD' or 'MMMM D'
      const tryFormats = [
        line.date,
        line.date.replace(/([A-Za-z]+) (\d+)/, '$1 $2'),
        line.date.replace(/(\d+) ([A-Za-z]+)/, '$2 $1'),
      ];
      for (const fmt of tryFormats) {
        date = new Date(fmt + ' 2000');
        if (!isNaN(date.getTime())) break;
      }
    }
    if (!isNaN(date.getTime())) {
      // Day of year (1-365)
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date.getTime() - start.getTime();
      const day = Math.floor(diff / (1000 * 60 * 60 * 24));
      const decl = getSolarDeclination(day);
      if (line.date && line.id && !line.fixed) {
        // Debug log for user dates
        // eslint-disable-next-line no-console
        console.log(`User declination line: ${line.date} => day ${day}, decl ${decl}`);
      }
      return decl;
    }
    return null;
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

  // Draw declination lines
  if (declinationLines.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Declination lines to render:', declinationLines.map(l => ({date: l.date, active: l.active, styleId: l.styleId, id: l.id, decl: getDeclinationForLine(l)})));
  }
  const maxRadius = Math.sqrt(width * width + height * height);
  const declinationLineElements = declinationLines.map((line, idx) => {
    const style = lineStyles.find(s => s.id === line.styleId || s.name === line.styleId);
    const decl = getDeclinationForLine(line);
    if (decl === null) return null;
    if (decl === 0) {
      // Equinox: draw a straight line for all hours, but clip to maxRadius
      const points = [];
      for (let h = startHour; h <= stopHour; h += 1/60) {
        const latRad = degreesToRadians(lat);
        const declRad = degreesToRadians(decl);
        const hourAngle = degreesToRadians(15 * (h - 12));
        const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
        const altitude = Math.asin(sinAlt);
        let cosAz = (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad));
        cosAz = Math.max(-1, Math.min(1, cosAz));
        let azimuth = Math.acos(cosAz);
        if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;
        const coords = projectShadowToSurface(altitude, azimuth, gnomonHeight, 'Horizontal', lat);
        const x = scale * coords.x;
        const y = scale * coords.y;
        if (Math.sqrt(x * x + y * y) <= maxRadius) {
          points.push({ x, y });
        }
      }
      if (points.length < 2) return null;
      const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
      return (
        <path
          key={line.id || line.date || idx}
          d={pathData}
          stroke={style?.color || 'black'}
          fill="none"
          strokeWidth={style?.width === 'hairline' ? 1 : (style?.width?.endsWith('mm') ? parseFloat(style.width) * 3.78 : 1)}
          strokeDasharray={style?.style === 'dashed' ? '6,4' : undefined}
        />
      );
    }
    // For each hour, compute the shadow tip for this declination
    const segments: { x: number; y: number }[][] = [];
    let currentSegment: { x: number; y: number }[] = [];
    for (let h = startHour; h <= stopHour; h += 1/60) { // one-minute increments for smooth, complete arcs
      const latRad = degreesToRadians(lat);
      const declRad = degreesToRadians(decl);
      const hourAngle = degreesToRadians(15 * (h - 12));
      const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
      const altitude = Math.asin(sinAlt);
      if (altitude > 0) {
        let cosAz = (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad));
        cosAz = Math.max(-1, Math.min(1, cosAz));
        let azimuth = Math.acos(cosAz);
        if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;
        const coords = projectShadowToSurface(altitude, azimuth, gnomonHeight, 'Horizontal', lat);
        const x = scale * coords.x;
        const y = scale * coords.y;
        if (Math.sqrt(x * x + y * y) <= maxRadius) {
          currentSegment.push({ x, y });
        }
      } else if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
    if (currentSegment.length > 0) segments.push(currentSegment);
    return segments.map((segment, segIdx) => {
      if (segment.length < 2) {
        // Debug log for short segments
        if (segment.length === 1) {
          // eslint-disable-next-line no-console
          console.log('Short declination segment (1 point):', segment[0]);
        }
        return null;
      }
      const pathData = segment.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
      return (
        <path
          key={segIdx}
          d={pathData}
          stroke={style?.color || 'black'}
          fill="none"
          strokeWidth={style?.width === 'hairline' ? 1 : (style?.width?.endsWith('mm') ? parseFloat(style.width) * 3.78 : 1)}
          strokeDasharray={style?.style === 'dashed' ? '6,4' : undefined}
        />
      );
    });
  });

  return (
    <fieldset style={{ marginTop: '1rem' }}>
      <legend>
        <strong>Projected Shadow Preview</strong> ({orientation})
      </legend>
      <div style={{ width: '100%', maxWidth: '1000px', margin: 'auto' }}>
        <svg
          width="100%"
          viewBox={`-${width / 2} -${height / 2} ${width} ${height}`}
          style={{ display: 'block', border: '1px solid #ccc', background: '#fff', width: '100%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(0, ${-noonYCenter})`}>
            <circle cx={0} cy={0} r={3} fill="red" />
            {hourCurves}
            {declinationLineElements}
          </g>
        </svg>
      </div>
    </fieldset>
  );
};

export default SundialPreview;
