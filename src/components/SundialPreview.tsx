import React from 'react';
import type { JSX } from 'react';
import { getAnalemmaPointsProjected, degreesToRadians, getSolarDeclination, projectShadowToSurface } from '../utils/analemmaGenerator';
import type { DeclinationLine } from './DeclinationLineOptions';
import type { LineStyle } from './LineSettings';
import type { HourlineInterval } from './HourlineSettings';

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
  gnomonType: 'crosshair' | 'sized-base-triangle';
  startHour: number;
  stopHour: number;
  use24Hour: boolean;
  orientation: 'Landscape' | 'Portrait';
  pageSize: 'A4' | 'Letter' | 'Custom';
  dateRange: 'FullYear' | 'SummerToWinter' | 'WinterToSummer';
  hourlineIntervals?: HourlineInterval[];
  declinationLines?: DeclinationLine[];
  lineStyles?: LineStyle[];
  labelWinterSide?: boolean;
  labelSummerSide?: boolean;
  labelOffset?: number;
  fontFamily?: string;
  fontSize?: number;
  showBorder?: boolean;
  borderMargin?: number; // in inches
  borderStyle?: string;
};

const SundialPreview: React.FC<Props> = ({
  lat,
  lng,
  tzMeridian,
  scale,
  gnomonHeight,
  gnomonType,
  startHour,
  stopHour,
  use24Hour,
  orientation,
  pageSize,
  dateRange,
  hourlineIntervals = [],
  declinationLines = [],
  lineStyles = [],
  labelWinterSide = true,
  labelSummerSide = true,
  labelOffset = 6, // now in mm
  fontFamily = 'sans-serif',
  fontSize = 5, // in pt
  showBorder = true,
  borderMargin = 0.25, // in inches
  borderStyle = 'default-hairline',
}) => {
  let { width, height } = pageSizeMap[pageSize] || pageSizeMap.Letter;
  if (orientation === 'Landscape') {
    [width, height] = [height, width];
  }

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

  // Helper to get interval step in hours
  function getIntervalStep(intervalName: string): number {
    switch (intervalName) {
      case 'Hour': return 1;
      case 'Half-hour': return 0.5;
      case 'Quarter-hour': return 0.25;
      case '5-minute': return 1/12; // 5 minutes = 1/12 hour
      case '2-minute': return 1/30; // 2 minutes = 1/30 hour
      default: return 1;
    }
  }

  // Helper to get interval priority (lower number = higher priority)
  function getIntervalPriority(intervalName: string): number {
    switch (intervalName) {
      case 'Hour': return 1;
      case 'Half-hour': return 2;
      case 'Quarter-hour': return 3;
      case '5-minute': return 4;
      case '2-minute': return 5;
      default: return 5;
    }
  }

  // Helper to check if a time slot is covered by a higher priority interval
  function isTimeSlotCovered(time: number, currentIntervalName: string, activeIntervals: HourlineInterval[]): boolean {
    const currentIntervalPriority = getIntervalPriority(currentIntervalName);
    return activeIntervals.some(activeInterval => {
      const activePriority = getIntervalPriority(activeInterval.name);
      const activeStep = getIntervalStep(activeInterval.name);
      // Check if this active interval has higher priority AND would draw at this time
      return activePriority < currentIntervalPriority && Math.abs(time % activeStep) < 0.001;
    });
  }

  // Helper to format hour for display
  function formatHour(hour: number): string {
    if (use24Hour) {
      return Math.round(hour).toString();
    } else {
      const h = Math.round(hour);
      if (h === 0) return '12';
      if (h > 12) return (h - 12).toString();
      return h.toString();
    }
  }

  // Helper to get stroke width from style
  function getStrokeWidth(width: string | undefined): number {
    if (!width) return 1;
    if (width === 'hairline') return 1;
    if (width.endsWith('mm')) return parseFloat(width) * 3.78 || 1; // 1mm ≈ 3.78px
    if (width.endsWith('px')) return parseFloat(width) || 1;
    return 1;
  }

  // Helper to get stroke dasharray and linecap for style
  function getStrokeDashProps(style: LineStyle | undefined): { dasharray?: string; linecap?: 'round' | 'inherit' | 'butt' | 'square' | undefined } {
    if (!style) return {};
    if (style.style === 'dashed') {
      return { dasharray: '6,4', linecap: undefined };
    }
    if (style.style === 'dotted') {
      const dotWidth = getStrokeWidth(style.width);
      const gap = 4 * dotWidth;
      return { dasharray: `${dotWidth},${gap}`, linecap: 'round' };
    }
    return { linecap: undefined };
  }

  // Helper to compute normal at a point on the analemma
  function getNormalAtPoint(points: { x: number; y: number }[], idx: number): { nx: number; ny: number } {
    // Use central difference if possible, else forward/backward
    let dx, dy;
    if (idx > 0 && idx < points.length - 1) {
      dx = points[idx + 1].x - points[idx - 1].x;
      dy = points[idx + 1].y - points[idx - 1].y;
    } else if (idx < points.length - 1) {
      dx = points[idx + 1].x - points[idx].x;
      dy = points[idx + 1].y - points[idx].y;
    } else if (idx > 0) {
      dx = points[idx].x - points[idx - 1].x;
      dy = points[idx].y - points[idx - 1].y;
    } else {
      dx = 1; dy = 0;
    }
    // Normal is (-dy, dx)
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { nx: -dy / len, ny: dx / len };
  }

  // Convert labelOffset from mm to px
  const labelOffsetPx = labelOffset * 3.78;

  // Convert fontSize from pt to px for SVG
  const fontSizePx = fontSize * 1.333;

  // Improved hour label placement
  const hourLabelElements: JSX.Element[] = [];
  if (hourlineIntervals) {
    hourlineIntervals.forEach((interval) => {
      if (interval.name !== 'Hour') return;
      const style = lineStyles.find(s => s.id === interval.styleId || s.name === interval.styleId);
      if (!style) return;
      const step = getIntervalStep(interval.name);
      for (let h = startHour; h <= stopHour; h += step) {
        // Skip if a higher priority interval is already drawing at this time
        if (isTimeSlotCovered(h, interval.name, hourlineIntervals)) continue;
        let points = getAnalemmaPointsProjected({
          lat,
          lng,
          tzMeridian,
          hour: h,
          gnomonHeight,
          orientation: 'Horizontal',
        });
        // Filter points by date range
        if (dateRange === 'WinterToSummer') {
          const [seg1, seg2] = splitWinterToSummer(points);
          // Sort segments by day
          const sortedSeg1 = [...seg1].sort((a, b) => a.day - b.day);
          const sortedSeg2 = [...seg2].sort((a, b) => a.day - b.day);
          // If labelWinterSide, place at start of first segment (day 355)
          if (labelWinterSide && sortedSeg1.length > 0) {
            const pt = sortedSeg1[0];
            const { nx, ny } = getNormalAtPoint(sortedSeg1, 0);
            const x = scale * pt.x + nx * labelOffsetPx;
            const y = scale * pt.y + ny * labelOffsetPx;
            hourLabelElements.push(
              <text
                key={`label-${h}-355`}
                x={x}
                y={y}
                fontSize={fontSizePx}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h)}
              </text>
            );
          }
          // If labelSummerSide, place at end of last segment (day 172)
          if (labelSummerSide && sortedSeg2.length > 0) {
            const lastIdx = sortedSeg2.length - 1;
            const pt = sortedSeg2[lastIdx];
            const { nx, ny } = getNormalAtPoint(sortedSeg2, lastIdx);
            const x = scale * pt.x - nx * labelOffsetPx;
            const y = scale * pt.y - ny * labelOffsetPx;
            hourLabelElements.push(
              <text
                key={`label-${h}-172`}
                x={x}
                y={y}
                fontSize={fontSizePx}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h)}
              </text>
            );
          }
        } else if (dateRange === 'SummerToWinter') {
          // Only one segment: days 172 to 355
          const [start, end] = getDayRange(dateRange);
          points = points.filter((p: { day: number }) => p.day >= start && p.day <= end);
          if (points.length === 0) continue;
          // Sort points by day
          const sortedPoints = [...points].sort((a, b) => a.day - b.day);
          // If labelSummerSide, place at start (day 172)
          if (labelSummerSide) {
            const pt = sortedPoints[0];
            const { nx, ny } = getNormalAtPoint(sortedPoints, 0);
            const x = scale * pt.x - nx * labelOffsetPx;
            const y = scale * pt.y - ny * labelOffsetPx;
            hourLabelElements.push(
              <text
                key={`label-${h}-172`}
                x={x}
                y={y}
                fontSize={fontSizePx}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h)}
              </text>
            );
          }
          // If labelWinterSide, place at end (day 355)
          if (labelWinterSide) {
            const lastIdx = sortedPoints.length - 1;
            const pt = sortedPoints[lastIdx];
            const { nx, ny } = getNormalAtPoint(sortedPoints, lastIdx);
            const x = scale * pt.x + nx * labelOffsetPx;
            const y = scale * pt.y + ny * labelOffsetPx;
            hourLabelElements.push(
              <text
                key={`label-${h}-355`}
                x={x}
                y={y}
                fontSize={fontSizePx}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h)}
              </text>
            );
          }
        } else {
          const [start, end] = getDayRange(dateRange);
          points = points.filter((p: { day: number }) => p.day >= start && p.day <= end);
          if (points.length === 0) continue;
          // Find solstice points
          const solsticeDays = [];
          if (labelSummerSide) solsticeDays.push(172); // Summer solstice
          if (labelWinterSide) solsticeDays.push(355); // Winter solstice
          solsticeDays.forEach((solsticeDay) => {
            let idx = points.findIndex(p => p.day === solsticeDay);
            if (idx === -1) {
              // If not found, find closest
              let minDist = 9999, minIdx = 0;
              for (let i = 0; i < points.length; ++i) {
                const d = Math.abs(points[i].day - solsticeDay);
                if (d < minDist) { minDist = d; minIdx = i; }
              }
              idx = minIdx;
            }
            const pt = points[idx];
            const { nx, ny } = getNormalAtPoint(points, idx);
            // Offset outward by labelOffsetPx (mm to px)
            // Summer labels go above (negative offset), Winter labels go below (positive offset)
            const isSummer = solsticeDay === 172;
            const offset = isSummer ? -labelOffsetPx : labelOffsetPx;
            const x = scale * pt.x + nx * offset;
            const y = scale * pt.y + ny * offset;
            hourLabelElements.push(
              <text
                key={`label-${h}-${solsticeDay}`}
                x={x}
                y={y}
                fontSize={fontSizePx}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h)}
              </text>
            );
          });
        }
      }
    });
  }

  // Draw hourlines for each active interval
  const hourlineElements = hourlineIntervals
    .filter(interval => interval.active)
    .flatMap((interval) => {
      const style = lineStyles.find(s => s.id === interval.styleId || s.name === interval.styleId);
      if (!style) return [];
      const step = getIntervalStep(interval.name);
      const elements: JSX.Element[] = [];
      for (let h = startHour; h <= stopHour; h += step) {
        // Skip if a higher priority interval is already drawing at this time
        if (isTimeSlotCovered(h, interval.name, hourlineIntervals)) continue;
        let points = getAnalemmaPointsProjected({
          lat,
          lng,
          tzMeridian,
          hour: h,
          gnomonHeight,
          orientation: 'Horizontal',
        });
        // Filter points by date range
        if (dateRange === 'WinterToSummer') {
          const [seg1, seg2] = splitWinterToSummer(points);
          [seg1, seg2].forEach((segment, idx) => {
            if (segment.length === 0) return;
            // Sort segment by day to avoid a straight line between segments
            const sortedSegment = [...segment].sort((a, b) => a.day - b.day);
            const pathData = sortedSegment
              .map((p: { x: number; y: number }, i: number) => {
                const x = scale * p.x;
                const y = scale * p.y;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
              })
              .join(' ');
            elements.push(
              <g key={`${h}-${interval.id}-seg${idx}`}>
                <path
                  d={pathData}
                  stroke={style.color || 'black'}
                  fill="none"
                  strokeWidth={getStrokeWidth(style.width)}
                  strokeDasharray={getStrokeDashProps(style).dasharray}
                  strokeLinecap={getStrokeDashProps(style).linecap}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          });
        } else {
          const [start, end] = getDayRange(dateRange);
          points = points.filter((p: { day: number }) => p.day >= start && p.day <= end);
          if (points.length === 0) continue;
          const pathData = points
            .map((p: { x: number; y: number }, i: number) => {
              const x = scale * p.x;
              const y = scale * p.y;
              return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(' ');
          elements.push(
            <g key={`${h}-${interval.id}`}>
              <path
                d={pathData}
                stroke={style.color || 'black'}
                fill="none"
                strokeWidth={getStrokeWidth(style.width)}
                strokeDasharray={getStrokeDashProps(style).dasharray}
                strokeLinecap={getStrokeDashProps(style).linecap}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        }
      }
      return elements;
    });

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
          strokeWidth={getStrokeWidth(style?.width)}
          strokeDasharray={style?.style === 'dashed' ? '6,4' : undefined}
          vectorEffect="non-scaling-stroke"
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
          strokeWidth={getStrokeWidth(style?.width)}
          strokeDasharray={style?.style === 'dashed' ? '6,4' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      );
    });
  });

  // Convert border margin from inches to mm
  const borderMarginMm = borderMargin * 25.4;
  
  // Get border line style
  const borderLineStyle = lineStyles.find(s => s.id === borderStyle || s.name === borderStyle);
  

  


  // Create border rectangle if border is enabled
  const borderRect = showBorder ? (
    <rect
      x={-width / 2 + borderMarginMm}
      y={-height / 2 + borderMarginMm}
      width={width - 2 * borderMarginMm}
      height={height - 2 * borderMarginMm}
      stroke={borderLineStyle?.color || 'black'}
      fill="none"
      strokeWidth={getStrokeWidth(borderLineStyle?.width)}
      strokeDasharray={getStrokeDashProps(borderLineStyle).dasharray}
      strokeLinecap={getStrokeDashProps(borderLineStyle).linecap}
      vectorEffect="non-scaling-stroke"
    />
  ) : null;

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
          {borderRect}
          <g transform={`translate(0, ${-noonYCenter})`}>
            {/* Gnomon mark at (0,0) */}
            {gnomonType === 'crosshair' ? (
              <>
                {/* Crosshair gnomon: a "+" at (0,0), 6px long arms */}
                <line x1={-3} y1={0} x2={3} y2={0} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <line x1={0} y1={-3} x2={0} y2={3} stroke="red" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              </>
            ) : (
              <>
                {/* Sized Base Triangle: right triangle pointing up */}
                <polygon
                  points={`0,0 ${-gnomonHeight},${-gnomonHeight} ${gnomonHeight},${-gnomonHeight}`}
                  fill="none"
                  stroke="red"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
            {hourlineElements.flat()}
            {hourLabelElements}
            {declinationLineElements}
          </g>
        </svg>
      </div>
    </fieldset>
  );
};

export default SundialPreview;
