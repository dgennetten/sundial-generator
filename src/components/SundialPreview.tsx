import React from 'react';
import type { JSX } from 'react';
import { getAnalemmaPointsProjected, degreesToRadians, getSolarDeclination, projectShadowToSurface } from '../utils/analemmaGenerator';
import type { DeclinationLine } from './DeclinationLineOptions';
import type { LineStyle } from './LineSettings';
import type { HourlineInterval } from './HourlineSettings';
import { Sun } from 'lucide-react';
import GnomonSVG from './GnomonSVG';

const pageSizeMap = {
  Letter: { width: 8.5 * 25.4, height: 11 * 25.4 },
  A4: { width: 210, height: 297 },
  '11x17': { width: 11 * 25.4, height: 17 * 25.4 },
  '10x15cm Postcard': { width: 100, height: 150 },
};

type Props = {
  lat: number;
  lng: number;
  tzMeridian: number;
  scale: number;
  gnomonHeight: number;
  gnomonType: 'crosshair' | 'popup' | 'popup-with-brace';
  startHour: number;
  stopHour: number;
  use24Hour: boolean;
  orientation: 'Landscape' | 'Portrait';
  pageSize: 'A4' | 'Letter' | '11x17' | '10x15cm Postcard';
  dateRange: 'FullYear' | 'SummerToWinter' | 'WinterToSummer';
  hourlineIntervals?: HourlineInterval[];
  declinationLines?: DeclinationLine[];
  lineStyles?: LineStyle[];
  labelWinterSide?: boolean;
  labelSummerSide?: boolean;
  labelOffset?: number;
  fontFamily?: string;
  fontSize?: number;
  useDST?: boolean;
  showBorder?: boolean;
  borderMargin?: number; // in inches
  borderStyle?: string;
  gnomonPosition?: number;
  showBackground?: boolean;
  backgroundColor?: string;
  dialTextBlock?: string;
  dialTextBlockVisible?: boolean;
  dialTextBlockFontSize?: number;
  dialTextBlockFontFamily?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  inclineType?: string;
  tiltAngle?: number;
  declinationNoonmarks?: boolean;
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
  fontSize = 20, // in pt
  useDST = true,
  showBorder = true,
  borderMargin = 0.25, // in inches
  borderStyle = 'default-hairline',
  gnomonPosition = 0,
  showBackground = true,
  backgroundColor = 'Cornsilk',
  dialTextBlock = '',
  dialTextBlockVisible = false,
  dialTextBlockFontSize = 14,
  dialTextBlockFontFamily = 'sans-serif',
  latitude,
  longitude,
  locationName = '',
  inclineType = 'Horizontal',
  tiltAngle = 0,
  declinationNoonmarks = true,
}) => {
  let { width, height } = pageSizeMap[pageSize] || pageSizeMap.Letter;
  if (orientation === 'Landscape') {
    [width, height] = [height, width];
  }

  // Convert border margin from inches to mm (moved up to avoid initialization error)
  const borderMarginMm = borderMargin * 25.4;
  
  // Calculate normalized viewBox for consistent preview scaling
  // Use a minimum viewBox size to prevent tiny pages from appearing too zoomed in
  const minViewBoxSize = 200; // mm

  
  // Scale up small pages while maintaining aspect ratio
  let viewBoxWidth = width;
  let viewBoxHeight = height;
  let viewBoxScaleFactor = 1;
  
  if (Math.min(width, height) < minViewBoxSize) {
    viewBoxScaleFactor = minViewBoxSize / Math.min(width, height);
    viewBoxWidth = width * viewBoxScaleFactor;
    viewBoxHeight = height * viewBoxScaleFactor;
  }

  // Calculate noon analemma vertical center (moved up to avoid initialization error)
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
  // Removed noonYCenter as it was unused

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
  function formatHour(hour: number, isSummerSolstice: boolean = false): string {
    let adjustedHour = hour;
    
    // Add one hour for DST if it's summer solstice and DST is enabled
    if (isSummerSolstice && useDST) {
      adjustedHour = hour + 1;
    }
    
    if (use24Hour) {
      return Math.round(adjustedHour).toString();
    } else {
      const h = Math.round(adjustedHour);
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

  // Line clipping using Cohen-Sutherland algorithm
  function clipLineToRectangle(
    x1: number, y1: number, x2: number, y2: number,
    left: number, top: number, right: number, bottom: number
  ): { x1: number; y1: number; x2: number; y2: number } | null {
    // Cohen-Sutherland region codes
    const INSIDE = 0;
    const LEFT = 1;
    const RIGHT = 2;
    const BOTTOM = 4;
    const TOP = 8;

    function computeCode(x: number, y: number): number {
      let code = INSIDE;
      if (x < left) code |= LEFT;
      else if (x > right) code |= RIGHT;
      if (y < top) code |= TOP;
      else if (y > bottom) code |= BOTTOM;
      return code;
    }

    let code1 = computeCode(x1, y1);
    let code2 = computeCode(x2, y2);

    while (true) {
      if ((code1 | code2) === 0) {
        // Both endpoints inside window
        return { x1, y1, x2, y2 };
      } else if ((code1 & code2) !== 0) {
        // Both endpoints outside window, in same region
        return null;
      } else {
        // Some segment may be inside
        const codeOut = code1 !== 0 ? code1 : code2;
        let x = 0, y = 0;

        // Find intersection point using formulas:
        // slope = (y2 - y1) / (x2 - x1)
        // x = x1 + (1 / slope) * (ym - y1), where ym is clip edge
        // y = y1 + slope * (xm - x1), where xm is clip edge
        if (codeOut & TOP) {
          x = x1 + (x2 - x1) * (top - y1) / (y2 - y1);
          y = top;
        } else if (codeOut & BOTTOM) {
          x = x1 + (x2 - x1) * (bottom - y1) / (y2 - y1);
          y = bottom;
        } else if (codeOut & RIGHT) {
          y = y1 + (y2 - y1) * (right - x1) / (x2 - x1);
          x = right;
        } else if (codeOut & LEFT) {
          y = y1 + (y2 - y1) * (left - x1) / (x2 - x1);
          x = left;
        }

        // Replace point outside with intersection point
        if (codeOut === code1) {
          x1 = x;
          y1 = y;
          code1 = computeCode(x1, y1);
        } else {
          x2 = x;
          y2 = y;
          code2 = computeCode(x2, y2);
        }
      }
    }
  }

  // Clip a series of points to the border rectangle
  function clipPathData(points: { x: number; y: number }[]): string | null {
    if (points.length < 2) return null;

    // Account for the transform applied to the sundial content group
    const transformY = (gnomonPosition ?? 0) - (height / 2);
    
    const left = -width / 2 + borderMarginMm;
    const top = -height / 2 + borderMarginMm - transformY;
    const right = width / 2 - borderMarginMm;
    const bottom = height / 2 - borderMarginMm - transformY;

    const clippedSegments: string[] = [];
    let currentSegment: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const x1 = scale * p1.x;
      const y1 = scale * p1.y;
      const x2 = scale * p2.x;
      const y2 = scale * p2.y;

      const clipped = clipLineToRectangle(x1, y1, x2, y2, left, top, right, bottom);
      
      if (clipped) {
        // If this is the start of a new segment
        if (currentSegment.length === 0) {
          currentSegment.push({ x: clipped.x1, y: clipped.y1 });
        }
        currentSegment.push({ x: clipped.x2, y: clipped.y2 });
      } else {
        // Line segment is completely outside, end current segment
        if (currentSegment.length > 0) {
          const pathData = currentSegment
            .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
            .join(' ');
          clippedSegments.push(pathData);
          currentSegment = [];
        }
      }
    }

    // Add final segment if any
    if (currentSegment.length > 0) {
      const pathData = currentSegment
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');
      clippedSegments.push(pathData);
    }

    return clippedSegments.join(' ');
  }

  // Convert labelOffset from mm to px
  const labelOffsetPx = labelOffset * 3.78;

  // Convert fontSize from pt to mm for SVG (1 pt = 25.4/72 mm = 0.3528 mm)
  const fontSizeMm = fontSize * 0.3528;
  const dialTextBlockFontSizeMm = dialTextBlockFontSize * 0.3528;

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
                fontSize={fontSizeMm}
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
                fontSize={fontSizeMm}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h, true)}
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
                fontSize={fontSizeMm}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h, true)}
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
                fontSize={fontSizeMm}
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
                fontSize={fontSizeMm}
                fill={style.color || 'black'}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily }}
              >
                {formatHour(h, isSummer)}
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
            const pathData = clipPathData(sortedSegment);
            if (pathData) {
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
            }
          });
        } else {
          const [start, end] = getDayRange(dateRange);
          points = points.filter((p: { day: number }) => p.day >= start && p.day <= end);
          if (points.length === 0) continue;
          const pathData = clipPathData(points);
          if (pathData) {
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
      }
      return elements;
    });

  // Helper to get declination for a declination line
  function getDeclinationForLine(line: DeclinationLine): number | null {
    if (line.date === 'Equinox') return 0;
    if (line.date === 'Summer Solstice') return 23.44;
    if (line.date === 'Winter Solstice') return -23.44;
    if (line.date === 'Today') {
      // Calculate today's declination
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return getSolarDeclination(dayOfYear);
    }
    if (line.date === 'Month Boundaries') {
      // This is handled separately in getMonthBoundaryDeclinations
      return null;
    }
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

  // Helper to get month boundary declinations within the date range
  // This function generates declination lines for the first day of each month
  // that falls within the selected date range (FullYear, SummerToWinter, or WinterToSummer)
  function getMonthBoundaryDeclinations(): { day: number; decl: number; month: string }[] {
    const [start, end] = getDayRange(dateRange);
    const monthBoundaries: { day: number; decl: number; month: string }[] = [];
    
    // Month start days (approximate, for a non-leap year)
    const monthStarts = [
      { month: 'January', day: 1 },
      { month: 'February', day: 32 },
      { month: 'March', day: 60 },
      { month: 'April', day: 91 },
      { month: 'May', day: 121 },
      { month: 'June', day: 152 },
      { month: 'July', day: 182 },
      { month: 'August', day: 213 },
      { month: 'September', day: 244 },
      { month: 'October', day: 274 },
      { month: 'November', day: 305 },
      { month: 'December', day: 335 }
    ];

    if (dateRange === 'WinterToSummer') {
      // Handle wrap-around case: days 355-365 and 1-172
      for (const monthStart of monthStarts) {
        if ((monthStart.day >= 355 && monthStart.day <= 365) || (monthStart.day >= 1 && monthStart.day <= 172)) {
          monthBoundaries.push({
            day: monthStart.day,
            decl: getSolarDeclination(monthStart.day),
            month: monthStart.month
          });
        }
      }
    } else {
      // Normal range case
      for (const monthStart of monthStarts) {
        if (monthStart.day >= start && monthStart.day <= end) {
          monthBoundaries.push({
            day: monthStart.day,
            decl: getSolarDeclination(monthStart.day),
            month: monthStart.month
          });
        }
      }
    }

    return monthBoundaries;
  }

  // Helper function to find the best intersection point of declination line with noon analemma
  function findDeclinationAnalemmaIntersection(decl: number): { x: number; y: number } | null {
    // Get the noon analemma points (hour = 12)
    const noonAnalemmaPoints = getAnalemmaPointsProjected({
      lat,
      lng,
      tzMeridian,
      hour: 12,
      gnomonHeight,
      orientation: 'Horizontal',
    });
    
    // Filter points by date range
    let filteredPoints = noonAnalemmaPoints;
    if (dateRange === 'WinterToSummer') {
      const [seg1, seg2] = splitWinterToSummer(filteredPoints);
      filteredPoints = [...seg1, ...seg2];
    } else {
      const [start, end] = getDayRange(dateRange);
      filteredPoints = filteredPoints.filter((p: { day: number }) => p.day >= start && p.day <= end);
    }
    
    // Find the point with the closest declination match
    let bestPoint: { x: number; y: number } | null = null;
    let smallestDifference = Infinity;
    
    for (const point of filteredPoints) {
      const pointDeclination = getSolarDeclination(point.day);
      const difference = Math.abs(pointDeclination - decl);
      
      if (difference < smallestDifference) {
        smallestDifference = difference;
        bestPoint = { x: point.x, y: point.y };
      }
    }
    
    // Only return the point if it's reasonably close (within 2 degrees)
    if (bestPoint && smallestDifference < 2.0) {
      return bestPoint;
    }
    
    return null;
  }

  // Helper function to render a single declination line
  function renderDeclinationLine(decl: number, style: LineStyle | undefined, key: string) {
    const maxRadius = Math.sqrt(width * width + height * height);
    
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
      const pathData = clipPathData(points);
      if (!pathData) return null;
      return (
        <path
          key={key}
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
      const pathData = clipPathData(segment);
      if (!pathData) return null;
      return (
        <path
          key={`${key}-${segIdx}`}
          d={pathData}
          stroke={style?.color || 'black'}
          fill="none"
          strokeWidth={getStrokeWidth(style?.width)}
          strokeDasharray={style?.style === 'dashed' ? '6,4' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      );
    });
  }

  // Draw declination lines
  if (declinationLines.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Declination lines to render:', declinationLines.map(l => ({date: l.date, active: l.active, styleId: l.styleId, id: l.id, decl: getDeclinationForLine(l)})));
  }
  
  const declinationLineElements = declinationLines.flatMap((line, idx) => {
    if (!line.active) return [];
    
    const style = lineStyles.find(s => s.id === line.styleId || s.name === line.styleId);
    
    // Handle Month Boundaries as a special case
    if (line.date === 'Month Boundaries') {
      const monthBoundaries = getMonthBoundaryDeclinations();
      // eslint-disable-next-line no-console
      console.log(`Month Boundaries for ${dateRange}:`, monthBoundaries.map(b => `${b.month} (day ${b.day}, decl ${b.decl.toFixed(2)}°)`));
      return monthBoundaries.flatMap((boundary, boundaryIdx) => {
        const elements = renderDeclinationLine(boundary.decl, style, `${line.id || line.date || idx}-${boundary.month}-${boundaryIdx}`);
        return elements || [];
      });
    }
    
    // Handle regular declination lines
    const decl = getDeclinationForLine(line);
    if (decl === null) return [];
    
    const elements = renderDeclinationLine(decl, style, line.id || line.date || idx.toString());
    return elements || [];
  });

  // Create declination noonmarks if enabled
  const declinationNoonmarkElements = declinationNoonmarks ? declinationLines.flatMap((line, idx) => {
    if (!line.active) return [];
    
    const style = lineStyles.find(s => s.id === line.styleId || s.name === line.styleId);
    if (!style) return [];
    
    // Get the noon hour line style to determine circle diameter
    // Look for the 'Hour' interval style, or fall back to the default '0.5mm-black' style
    const noonHourInterval = hourlineIntervals.find(interval => interval.name === 'Hour');
    let noonHourStyle = null;
    
    if (noonHourInterval) {
      noonHourStyle = lineStyles.find(s => s.id === noonHourInterval.styleId || s.name === noonHourInterval.styleId);
    }
    
    // If no Hour interval or style found, use the default '0.5mm-black' style
    if (!noonHourStyle) {
      noonHourStyle = lineStyles.find(s => s.id === '0.5mm-black');
    }
    
    // Extract the raw mm value from the stroke width
    const strokeWidthStr = noonHourStyle?.width || '0.5mm';
    let strokeWidthMm = 0.5; // Default
    if (strokeWidthStr.endsWith('mm')) {
      strokeWidthMm = parseFloat(strokeWidthStr) || 0.5;
    }
    
    // Circle diameter should be 2x the width of the hour line stroke width
    // So radius = stroke width (in mm, same coordinate system as the circle position)
    const circleRadius = strokeWidthMm;
    

    

    
    // Handle Month Boundaries as a special case
    if (line.date === 'Month Boundaries') {
      const monthBoundaries = getMonthBoundaryDeclinations();
      return monthBoundaries.flatMap((boundary, boundaryIdx) => {
        // Find single intersection point with noon analemma for this declination
        const intersectionPoint = findDeclinationAnalemmaIntersection(boundary.decl);
        if (!intersectionPoint) return [];
        
        return [
          <circle
            key={`noonmark-${line.id || line.date || idx}-${boundary.month}-${boundaryIdx}`}
            cx={scale * intersectionPoint.x}
            cy={scale * intersectionPoint.y}
            r={circleRadius}
            fill={style.color || 'black'}
            stroke="none"
          />
        ];
      });
    }
    
    // Handle regular declination lines
    const decl = getDeclinationForLine(line);
    if (decl === null) return [];
    
    // Find single intersection point with noon analemma for this declination
    const intersectionPoint = findDeclinationAnalemmaIntersection(decl);
    if (!intersectionPoint) return [];
    
    return [
      <circle
        key={`noonmark-${line.id || line.date || idx}`}
        cx={scale * intersectionPoint.x}
        cy={scale * intersectionPoint.y}
        r={circleRadius}
        fill={style.color || 'black'}
        stroke="none"
      />
    ];
  }) : [];

  // Get border line style
  const borderLineStyle = lineStyles.find(s => s.id === borderStyle || s.name === borderStyle);
  

  


  // Create border rectangle if border is enabled
  // Scale border coordinates to match viewBox scaling
  const scaledWidth = width * viewBoxScaleFactor;
  const scaledHeight = height * viewBoxScaleFactor;
  const scaledBorderMargin = borderMarginMm * viewBoxScaleFactor;
  
  const borderRect = showBorder ? (
    <rect
      x={-scaledWidth / 2 + scaledBorderMargin}
      y={-scaledHeight / 2 + scaledBorderMargin}
      width={scaledWidth - 2 * scaledBorderMargin}
      height={scaledHeight - 2 * scaledBorderMargin}
      stroke={borderLineStyle?.color || 'black'}
      fill="none"
      strokeWidth={getStrokeWidth(borderLineStyle?.width)}
      strokeDasharray={getStrokeDashProps(borderLineStyle).dasharray}
      strokeLinecap={getStrokeDashProps(borderLineStyle).linecap}
      vectorEffect="non-scaling-stroke"
    />
  ) : null;

  // Show clipping boundary when border is not visible (for debugging)
  const clippingBoundary = !showBorder ? (
    <rect
      x={-scaledWidth / 2 + scaledBorderMargin}
      y={-scaledHeight / 2 + scaledBorderMargin}
      width={scaledWidth - 2 * scaledBorderMargin}
      height={scaledHeight - 2 * scaledBorderMargin}
      stroke="#ccc"
      fill="none"
      strokeWidth={1}
      strokeDasharray="5,5"
      vectorEffect="non-scaling-stroke"
      opacity={0.5}
    />
  ) : null;

  // --- Text Block Logic ---
  let locationString = locationName || '';
  if (!locationString && typeof latitude === 'number' && typeof longitude === 'number') {
    // Fallback if no location name is provided
    locationString = 'Lat: ' + latitude.toFixed(4) + ', Lon: ' + longitude.toFixed(4);
  }
  let coordinatesString = '';
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    coordinatesString = `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`;
  }
  // Function to parse bold and italic text (text between ** markers for bold, * markers for italic)
  const parseMarkupText = (text: string): Array<{ text: string; bold: boolean; italic: boolean }> => {
    const parts: Array<{ text: string; bold: boolean; italic: boolean }> = [];
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      const boldStart = text.indexOf('**', currentIndex);
      const italicStart = text.indexOf('*', currentIndex);
      
      // Find the earliest marker, but prioritize bold markers
      let markerStart = -1;
      let markerType = '';
      let markerLength = 0;
      
      if (boldStart !== -1) {
        // Check if this is actually a bold marker (not part of an italic marker)
        const nextChar = text[boldStart + 2];
        if (nextChar !== '*') {
          markerStart = boldStart;
          markerType = 'bold';
          markerLength = 2;
        }
      }
      
      // If no bold marker found, look for italic marker
      if (markerStart === -1 && italicStart !== -1) {
        // Check if this is actually an italic marker (not part of a bold marker)
        const prevChar = text[italicStart - 1];
        const nextChar = text[italicStart + 1];
        if (prevChar !== '*' && nextChar !== '*') {
          markerStart = italicStart;
          markerType = 'italic';
          markerLength = 1;
        }
      }
      
      if (markerStart === -1) {
        // No more markers, add remaining text as normal
        parts.push({ text: text.slice(currentIndex), bold: false, italic: false });
        break;
      }
      
      // Add text before marker as normal
      if (markerStart > currentIndex) {
        parts.push({ text: text.slice(currentIndex, markerStart), bold: false, italic: false });
      }
      
      const markerEnd = text.indexOf(markerType === 'bold' ? '**' : '*', markerStart + markerLength);
      if (markerEnd === -1) {
        // No closing marker, treat as normal text
        parts.push({ text: text.slice(currentIndex), bold: false, italic: false });
        break;
      }
      
      // Add marked text
      parts.push({ 
        text: text.slice(markerStart + markerLength, markerEnd), 
        bold: markerType === 'bold', 
        italic: markerType === 'italic' 
      });
      currentIndex = markerEnd + markerLength;
    }
    
    return parts;
  };

  let textBlockLines: Array<Array<{ text: string; bold: boolean; italic: boolean }>> = [];
  if (dialTextBlock) {
    // Create incline string - only show if tilt angle is not zero
    const effectiveTiltAngle = inclineType === 'Horizontal' ? 0 : 
                              inclineType === 'Equatorial' ? (latitude || 0) :
                              inclineType === 'Vertical' ? 90 : tiltAngle;
    const inclineString = effectiveTiltAngle !== 0 ? `Dial incline: ${effectiveTiltAngle.toFixed(1)} degrees` : '';
    
    const processedText = dialTextBlock
      .replace(/\{location\}/gi, locationString)
      .replace(/\{coordinates\}/gi, coordinatesString)
      .replace(/\{incline\}/gi, inclineString);
    
    // Filter out lines that become empty or contain only markup after replacement
    textBlockLines = processedText.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Remove lines that are empty or contain only markup characters (*, **)
        return trimmed !== '' && !trimmed.match(/^\*+$/);
      })
      .map(line => parseMarkupText(line));
  }
  // Calculate y position for the text block in the space below winter solstice and above bottom border

  const bottomBorderY = height / 2 - borderMarginMm;
  
  // Position text much closer to bottom border, well below the hour lines
  const paddingFromBottomBorder = 15; // mm - move further down from bottom border
  const textBlockY = bottomBorderY + paddingFromBottomBorder;



  return (
    <div className="card" style={{ width: '100%', margin: 0 }}>
      <div className="card-header">
        <h3 className="card-title"><Sun color="#2563eb" size={20} style={{marginRight: 6}} /> Sundial Preview ({orientation}, {pageSize})</h3>
      </div>
      <div style={{ width: '100%', minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`-${viewBoxWidth / 2} -${viewBoxHeight / 2} ${viewBoxWidth} ${viewBoxHeight}`}
          style={{ display: 'block', border: '1px solid #ccc', background: showBackground ? backgroundColor : '#fff', width: '100%', height: '100%', objectFit: 'contain' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {borderRect}
          {clippingBoundary}
          <g transform={`scale(${viewBoxScaleFactor}) translate(0, ${(gnomonPosition ?? 0) - (height / 2)})`}>
            {/* Gnomon mark at (0,0) */}
            <GnomonSVG gnomonType={gnomonType} gnomonHeight={gnomonHeight} />
            

            {hourlineElements.flat()}
            {hourLabelElements}
            {declinationLineElements}
            {declinationNoonmarkElements}
            {/* --- Dial Text Block --- */}
            {dialTextBlockVisible && textBlockLines.length > 0 && (
            <text
              x={0}
              y={textBlockY}
              fontSize={dialTextBlockFontSizeMm}
              fill="#222"
              textAnchor="middle"
              fontFamily={dialTextBlockFontFamily}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {textBlockLines.map((line, lineIndex) => (
                <tspan
                  key={lineIndex}
                  x={0}
                  dy={lineIndex === 0 ? 0 : dialTextBlockFontSizeMm * 1.2}
                >
                  {line.map((part, partIndex) => (
                    <tspan
                      key={partIndex}
                      fontWeight={part.bold ? 'bold' : 'normal'}
                      fontStyle={part.italic ? 'italic' : 'normal'}
                    >
                      {part.text}
                    </tspan>
                  ))}
                </tspan>
              ))}
            </text>
          )}
          </g>
        </svg>
      </div>
    </div>
  );
};
export default SundialPreview;
