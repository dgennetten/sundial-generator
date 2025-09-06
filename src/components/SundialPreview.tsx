import React from 'react';
import type { JSX } from 'react';
import { getAnalemmaPointsProjected, degreesToRadians, getSolarDeclination, projectShadowToSurface } from '../utils/analemmaGenerator';
import type { DeclinationLine } from './DeclinationLineOptions';
import type { LineStyle } from './LineSettings';
import type { HourlineInterval } from './hourlineUtils';
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
  originalLat?: number; // Original geographic latitude for hemisphere detection
  tzMeridian: number;
  scale: number;
  gnomonHeight: number;
  gnomonType: 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north';
  startHour: number;
  stopHour: number;
  use24Hour: boolean;
  orientation: 'Landscape' | 'Portrait';
  pageSize: 'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom';
  customWidth?: number;
  customHeight?: number;
  dateRange: 'FullYear' | 'SummerToFall' | 'WinterToSpring';
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
  dialTextBlockFontSize?: number;
  dialTextBlockFontFamily?: string;
  sundialNotesMode?: string;
  locationName?: string;
  inclineType?: string;
  tiltAngle?: number;
  declinationNoonmarks?: boolean;
  dialFacing?: 'North' | 'South';
  originalLatitude?: number;
};
// Note: App now prefers passing a single `config` prop. To keep JSX happy where only `config` is provided,
// we use a union props type here and normalize to a single `p` object.

type SundialPreviewProps = { config: Props } | Props;

const SundialPreview = React.memo((props: SundialPreviewProps) => {
  const p: Props = (props as { config?: Props }).config ?? (props as Props);
  const {
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
    customWidth,
    customHeight,
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
    dialTextBlockFontSize = 14,
    dialTextBlockFontFamily = 'sans-serif',
    sundialNotesMode = 'textBlock',
    locationName = '',
    inclineType = 'Horizontal',
    tiltAngle = 0,
    declinationNoonmarks = true,
    dialFacing = 'South',
    originalLatitude,
  } = p;
  // Calculate custom page size in mm
  const getCustomPageSize = () => {
    if (pageSize !== 'Custom' || !customWidth || !customHeight) return null;
    // customWidth and customHeight are already stored in millimeters
    return {
      width: customWidth,
      height: customHeight
    };
  };

  const customPageSize = getCustomPageSize();
  let { width, height } = customPageSize || (pageSize !== 'Custom' ? pageSizeMap[pageSize as keyof typeof pageSizeMap] : pageSizeMap.Letter);
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
  // WinterToSpring (UI: Winter - Spring), SummerToFall (UI: Summer - Fall)
  if (dateRange === 'WinterToSpring') {
    // Split into two segments and combine for y-centering
    const [seg1, seg2] = splitWinterToSpring(noonPoints);
    noonPoints = [...seg1, ...seg2];
  } else {
    noonPoints = noonPoints.filter(p => isDayInRange(p.day, dateRange));
  }
  // Removed noonYCenter as it was unused

  // Helper to check if a day is in the date range (handles wrap-around)
  function isDayInRange(day: number, dateRange: 'FullYear' | 'SummerToFall' | 'WinterToSpring'): boolean {
    if (dateRange === 'FullYear') return true;

    const isNorthernHemisphere = lat >= 0;
    const summerSolsticeDay = isNorthernHemisphere ? 172 : 355;
    const winterSolsticeDay = isNorthernHemisphere ? 355 : 172;

    if (dateRange === 'SummerToFall') {
      if (isNorthernHemisphere) {
        // Normal range: summer (172) to winter (355)
        return day >= summerSolsticeDay && day <= winterSolsticeDay;
      } else {
        // Wrap-around: summer (355) to winter (172) next year
        return day >= summerSolsticeDay || day <= winterSolsticeDay;
      }
    }

    if (dateRange === 'WinterToSpring') {
      if (isNorthernHemisphere) {
        // Wrap-around: winter (355) to summer (172) next year
        return day >= winterSolsticeDay || day <= summerSolsticeDay;
      } else {
        // Normal range: winter (172) to summer (355)
        return day >= winterSolsticeDay && day <= summerSolsticeDay;
      }
    }

    return true;
  }

  // Check whether a date string (e.g., 'Today' or 'March 12') falls within selected dateRange
  function isDateStringInRange(dateStr: string): boolean {
    if (dateRange === 'FullYear') return true;
    if (!dateStr || dateStr === '1st of the Month' || dateStr === '1st and 15th' || dateStr === 'Equinox' || dateStr === 'Summer Solstice' || dateStr === 'Winter Solstice') return true;
    if (dateStr === 'Today') {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return isDayInRange(dayOfYear, dateRange);
    }
    const parsed = new Date(dateStr + ' 2000');
    if (isNaN(parsed.getTime())) return true; // Unknown format: do not block
    const start = new Date(parsed.getFullYear(), 0, 0);
    const day = Math.floor((parsed.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return isDayInRange(day, dateRange);
  }

  // Helper to split points for Winter - Spring (formerly WinterToSummer)
  function splitWinterToSpring(points: { day: number; x: number; y: number }[]): [{ day: number; x: number; y: number }[], { day: number; x: number; y: number }[]] {
    // Determine solstice days based on hemisphere
    const isNorthernHemisphere = lat >= 0;
    const summerSolsticeDay = isNorthernHemisphere ? 172 : 355;
    const winterSolsticeDay = isNorthernHemisphere ? 355 : 172;

    const seg1 = points.filter((p: { day: number; x: number; y: number }) => p.day >= winterSolsticeDay);
    const seg2 = points.filter((p: { day: number; x: number; y: number }) => p.day <= summerSolsticeDay);
    return [seg1, seg2];
  }

  // Helper to split points for Summer - Fall (formerly SummerToWinter); handles southern hemisphere wrap-around
  function splitSummerToFall(points: { day: number; x: number; y: number }[]): [{ day: number; x: number; y: number }[], { day: number; x: number; y: number }[]] {
    // Determine solstice days based on hemisphere
    const isNorthernHemisphere = lat >= 0;
    const summerSolsticeDay = isNorthernHemisphere ? 172 : 355;
    const winterSolsticeDay = isNorthernHemisphere ? 355 : 172;

    if (isNorthernHemisphere) {
      // Northern hemisphere: normal range, no splitting needed
      // This should not be called for northern hemisphere, but handle it gracefully
      return [points.filter(p => p.day >= summerSolsticeDay && p.day <= winterSolsticeDay), []];
    } else {
      // Southern hemisphere: summer (355) to winter (172) - needs splitting
      const seg1 = points.filter((p: { day: number; x: number; y: number }) => p.day >= summerSolsticeDay);
      const seg2 = points.filter((p: { day: number; x: number; y: number }) => p.day <= winterSolsticeDay);
      return [seg1, seg2];
    }
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
    if (style.style === 'calculated') {
      // Calculated styles are handled differently in rendering, not via dasharray
      return { linecap: undefined };
    }
    return { linecap: undefined };
  }

  // Helper to create 5/2 day dash segments for hourlines
  function create5Day2GapSegments(points: { day: number; x: number; y: number }[]): { day: number; x: number; y: number }[][] {
    if (points.length === 0) return [];
    
    // Sort points by day
    const sortedPoints = [...points].sort((a, b) => a.day - b.day);
    const segments: { day: number; x: number; y: number }[][] = [];
    
    // Create segments with 6 day-points (enclosing 5 days) followed by 2-day gaps
    // This creates 26 segments from solstice to solstice (182 days / 7 = 26)
    const startDay = sortedPoints[0].day;
    const endDay = sortedPoints[sortedPoints.length - 1].day;
    
    // Start from the first day and create 7-day cycles (6 day-points + 1 gap day, then 1 more gap day)
    for (let cycleStart = startDay; cycleStart <= endDay; cycleStart += 7) {
      const segmentPoints: { day: number; x: number; y: number }[] = [];
      
      // Collect 6 consecutive day-points starting from cycleStart (enclosing 5 days)
      for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
        const targetDay = cycleStart + dayOffset;
        if (targetDay > endDay) break;
        
        // Find the point closest to this target day
        const point = sortedPoints.find(p => Math.abs(p.day - targetDay) < 0.5);
        if (point) {
          segmentPoints.push(point);
        }
      }
      
      // Only add segments with at least 2 points to form a line
      if (segmentPoints.length >= 2) {
        segments.push(segmentPoints);
      }
    }
    return segments;
  }

  // Helper to create 2/5 day dash segments for hourlines
  function create2Day5GapSegments(points: { day: number; x: number; y: number }[]): { day: number; x: number; y: number }[][] {
    if (points.length === 0) return [];
    
    // Sort points by day
    const sortedPoints = [...points].sort((a, b) => a.day - b.day);
    const segments: { day: number; x: number; y: number }[][] = [];
    
    // Create segments with 3 day-points (enclosing 2 days) followed by 5-day gaps
    // This creates 26 segments from solstice to solstice (182 days / 7 = 26)
    const startDay = sortedPoints[0].day;
    const endDay = sortedPoints[sortedPoints.length - 1].day;
    
    // Start from the first day and create 7-day cycles (3 day-points + 4 gap days)
    for (let cycleStart = startDay; cycleStart <= endDay; cycleStart += 7) {
      const segmentPoints: { day: number; x: number; y: number }[] = [];
      
      // Collect 3 consecutive day-points starting from cycleStart (enclosing 2 days)
      for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const targetDay = cycleStart + dayOffset;
        if (targetDay > endDay) break;
        
        // Find the point closest to this target day
        const point = sortedPoints.find(p => Math.abs(p.day - targetDay) < 0.5);
        if (point) {
          segmentPoints.push(point);
        }
      }
      
      // Only add segments with at least 2 points to form a line
      if (segmentPoints.length >= 2) {
        segments.push(segmentPoints);
      }
    }
    return segments;
  }

  // Helper to create dots at 2-minute intervals for declination lines
  function create2MinuteDots(decl: number, style: LineStyle | undefined): JSX.Element[] {
    if (!style) return [];
    
    const dots: JSX.Element[] = [];
    const dotWidth = getStrokeWidth(style.width);
    
    // Account for the transform applied to the sundial content group (same as clipPathData)
    const transformY = (gnomonPosition ?? 0) - (height / 2);
    const left = -width / 2 + borderMarginMm;
    const top = -height / 2 + borderMarginMm - transformY;
    const right = width / 2 - borderMarginMm;
    const bottom = height / 2 - borderMarginMm - transformY;
    
    // Generate dots every 2 minutes from startHour to stopHour
    for (let h = startHour; h <= stopHour; h += 2/60) { // 2-minute intervals
      const latRad = degreesToRadians(lat);
      const declRad = degreesToRadians(decl);
      const hourAngle = degreesToRadians(15 * (h - 12));
      const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
      const altitude = Math.asin(sinAlt);

      // Same altitude filtering as dash segments
      if (altitude > -15 * Math.PI / 180) {
        let cosAz = (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad));
        cosAz = Math.max(-1, Math.min(1, cosAz));
        let azimuth = Math.acos(cosAz);
        if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;
        const coords = projectShadowToSurface(altitude, azimuth, gnomonHeight, 'Horizontal', lat);
        const x = scale * coords.x;
        const y = scale * coords.y;

        // Check if point is within the proper border bounds
        if (x >= left && x <= right && y >= top && y <= bottom) {
          dots.push(
            <line
              key={`declination-2min-dot-${decl}-${h}`}
              x1={x}
              y1={y}
              x2={x}
              y2={y}
              stroke={style.color || 'black'}
              strokeWidth={dotWidth}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        }
      }
    }
    
    return dots;
  }

  // Helper to create 5-minute dots for declination lines
  function create5MinuteDots(decl: number, style: LineStyle | undefined): JSX.Element[] {
    if (!style) return [];
    
    const dots: JSX.Element[] = [];
    const dotWidth = getStrokeWidth(style.width);
    
    // Account for the transform applied to the sundial content group (same as clipPathData)
    const transformY = (gnomonPosition ?? 0) - (height / 2);
    const left = -width / 2 + borderMarginMm;
    const top = -height / 2 + borderMarginMm - transformY;
    const right = width / 2 - borderMarginMm;
    const bottom = height / 2 - borderMarginMm - transformY;
    
    // Generate dots every 5 minutes from startHour to stopHour
    for (let h = startHour; h <= stopHour; h += 5/60) { // 5-minute intervals
      const latRad = degreesToRadians(lat);
      const declRad = degreesToRadians(decl);
      const hourAngle = degreesToRadians(15 * (h - 12));
      const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
      const altitude = Math.asin(sinAlt);

      // Same altitude filtering as other calculated styles
      if (altitude > -15 * Math.PI / 180) {
        let cosAz = (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad));
        cosAz = Math.max(-1, Math.min(1, cosAz));
        let azimuth = Math.acos(cosAz);
        if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;
        const coords = projectShadowToSurface(altitude, azimuth, gnomonHeight, 'Horizontal', lat);
        const x = scale * coords.x;
        const y = scale * coords.y;

        // Check if point is within the proper border bounds
        if (x >= left && x <= right && y >= top && y <= bottom) {
          dots.push(
            <line
              key={`declination-5min-dot-${decl}-${h}`}
              x1={x}
              y1={y}
              x2={x}
              y2={y}
              stroke={style.color || 'black'}
              strokeWidth={dotWidth}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        }
      }
    }
    
    return dots;
  }

  // Helper to create 2/2 minute dash segments for declination lines
  function create2MinuteDashSegments(decl: number, style: LineStyle | undefined): JSX.Element[] {
    if (!style) return [];

    const segments: JSX.Element[] = [];
    const strokeWidth = getStrokeWidth(style.width);

    // Create discrete 2-minute segments with 2-minute gaps (similar to 5/2 day dash approach)
    let segmentIndex = 0;

    // Use EXACTLY the same loop as dots but connect consecutive points
    let previousPoint: { x: number; y: number } | null = null;
    let pointIndex = 0;

    for (let h = startHour; h <= stopHour; h += 2/60) { // Same 2-minute intervals as dots
      const latRad = degreesToRadians(lat);
      const declRad = degreesToRadians(decl);
      const hourAngle = degreesToRadians(15 * (h - 12));
      const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
      const altitude = Math.asin(sinAlt);

      // Same altitude filtering as dots
      if (altitude > -15 * Math.PI / 180) {
        let cosAz = (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad));
        cosAz = Math.max(-1, Math.min(1, cosAz));
        let azimuth = Math.acos(cosAz);
        if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;
        const coords = projectShadowToSurface(altitude, azimuth, gnomonHeight, 'Horizontal', lat);

        // Same scaling as dots
        const currentPoint = { x: scale * coords.x, y: scale * coords.y };

        // Same bounds checking as dots
        const transformY = (gnomonPosition ?? 0) - (height / 2);
        const left = -width / 2 + borderMarginMm;
        const top = -height / 2 + borderMarginMm - transformY;
        const right = width / 2 - borderMarginMm;
        const bottom = height / 2 - borderMarginMm - transformY;

        if (currentPoint.x >= left && currentPoint.x <= right && currentPoint.y >= top && currentPoint.y <= bottom) {
          // Create dashes with 2-minute segments and 2-minute gaps
          // Use modulo 2 to create pattern: draw for 1 point, skip for 1 point
          const cyclePosition = pointIndex % 2;
          if (previousPoint && cyclePosition === 1) {
            // Draw dash segments for every other point (creating 2-minute dashes with 2-minute gaps)
            segments.push(
              <line
                key={`declination-2min-dash-${decl}-${segmentIndex}`}
                x1={previousPoint.x}
                y1={previousPoint.y}
                x2={currentPoint.x}
                y2={currentPoint.y}
                stroke={style.color || 'black'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
            segmentIndex++;
          }
          previousPoint = currentPoint;
          pointIndex++;
        }
      }
    }

    return segments;
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

      // Points are already scaled, so use them directly
      const x1 = p1.x;
      const y1 = p1.y;
      const x2 = p2.x;
      const y2 = p2.y;

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

  // Join clipped segments into a single closed loop when rendering Full Year paths
  function joinSegmentsForClosedLoop(segments: string[]): string {
    if (segments.length === 0) return '';
    if (segments.length === 1) return `${segments[0]} Z`;
    // Extract points in order and rebuild a single path
    const allPoints: { x: number; y: number }[] = [];
    for (const seg of segments) {
      // seg is like "M x y L x y L x y ..."; split and parse numbers
      const tokens = seg.split(/[ML\s,]+/).filter(Boolean);
      for (let i = 0; i < tokens.length; i += 2) {
        const x = parseFloat(tokens[i]);
        const y = parseFloat(tokens[i + 1]);
        if (!isNaN(x) && !isNaN(y)) allPoints.push({ x, y });
      }
    }
    if (allPoints.length < 2) return '';
    // Build single path and close
    const path = allPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    return `${path} Z`;
  }

  // Convert labelOffset from mm to px
  const labelOffsetPx = labelOffset * 3.78;

  // Convert fontSize from pt to mm for SVG (1 pt = 25.4/72 mm = 0.3528 mm)
  const fontSizeMm = fontSize * 0.3528;
  const dialTextBlockFontSizeMm = dialTextBlockFontSize * 0.3528;

  // Helper function to check if a text element is within the border bounds
  function isTextWithinBounds(x: number, y: number): boolean {
    // Account for the transform applied to the sundial content group
    const transformY = (gnomonPosition ?? 0) - (height / 2);
    
    const left = -width / 2 + borderMarginMm;
    const top = -height / 2 + borderMarginMm - transformY;
    const right = width / 2 - borderMarginMm;
    const bottom = height / 2 - borderMarginMm - transformY;
    
    // Add some padding for text size (approximate text bounds)
    const textPadding = fontSizeMm / 2;
    
    return x >= (left + textPadding) && 
           x <= (right - textPadding) && 
           y >= (top + textPadding) && 
           y <= (bottom - textPadding);
  }

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
        const isNorthernHemisphere = lat >= 0;
        const needsSplitting = (dateRange === 'WinterToSpring') ||
                              (dateRange === 'SummerToFall' && !isNorthernHemisphere);

        if (needsSplitting) {
          let segments: [{ day: number; x: number; y: number }[], { day: number; x: number; y: number }[]];

          if (dateRange === 'WinterToSpring') {
            segments = splitWinterToSpring(points);
          } else {
            // dateRange === 'SummerToFall' && !isNorthernHemisphere
            segments = splitSummerToFall(points);
          }

          const [seg1, seg2] = segments;
          // Sort segments by day
          const sortedSeg1 = [...seg1].sort((a, b) => a.day - b.day);
          const sortedSeg2 = [...seg2].sort((a, b) => a.day - b.day);
          // Determine solstice days based on hemisphere
          const summerSolsticeDay = isNorthernHemisphere ? 172 : 355;
          const winterSolsticeDay = isNorthernHemisphere ? 355 : 172;

          // Determine which segment contains which solstice
          let winterSegment: { day: number; x: number; y: number }[] = [];
          let summerSegment: { day: number; x: number; y: number }[] = [];

          if (dateRange === 'WinterToSpring') {
            // For WinterToSpring: seg1 has winter solstice, seg2 has summer solstice
            winterSegment = sortedSeg1;
            summerSegment = sortedSeg2;
          } else {
            // For SummerToFall (southern hemisphere): seg1 has summer solstice, seg2 has winter solstice
            winterSegment = sortedSeg2;
            summerSegment = sortedSeg1;
          }

          // If labelWinterSide, place at winter solstice
          if (labelWinterSide && winterSegment.length > 0) {
            // Find the point closest to winter solstice day
            let bestIdx = 0;
            let minDiff = Math.abs(winterSegment[0].day - winterSolsticeDay);
            for (let i = 1; i < winterSegment.length; i++) {
              const diff = Math.abs(winterSegment[i].day - winterSolsticeDay);
              if (diff < minDiff) {
                minDiff = diff;
                bestIdx = i;
              }
            }

            const pt = winterSegment[bestIdx];
            const { nx, ny } = getNormalAtPoint(winterSegment, bestIdx);
            // When effective latitude is negative (beyond equatorial tilt), the geometry is inverted
            const isInvertedGeometry = lat < 0;
            const offset = isInvertedGeometry ? -labelOffsetPx : labelOffsetPx;
            const x = scale * pt.x + nx * offset;
            const y = scale * pt.y + ny * offset;
            // Only add label if it's within the border bounds
            if (isTextWithinBounds(x, y)) {
              hourLabelElements.push(
                <text
                  key={`label-${h}-${winterSolsticeDay}`}
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
          }

          // If labelSummerSide, place at summer solstice
          if (labelSummerSide && summerSegment.length > 0) {
            // Find the point closest to summer solstice day
            let bestIdx = 0;
            let minDiff = Math.abs(summerSegment[0].day - summerSolsticeDay);
            for (let i = 1; i < summerSegment.length; i++) {
              const diff = Math.abs(summerSegment[i].day - summerSolsticeDay);
              if (diff < minDiff) {
                minDiff = diff;
                bestIdx = i;
              }
            }

            const pt = summerSegment[bestIdx];
            const { nx, ny } = getNormalAtPoint(summerSegment, bestIdx);
            // When effective latitude is negative (beyond equatorial tilt), the geometry is inverted
            const isInvertedGeometry = lat < 0;
            const offset = isInvertedGeometry ? labelOffsetPx : -labelOffsetPx;
            const x = scale * pt.x + nx * offset;
            const y = scale * pt.y + ny * offset;
            // Only add label if it's within the border bounds
            if (isTextWithinBounds(x, y)) {
              hourLabelElements.push(
                <text
                  key={`label-${h}-${summerSolsticeDay}`}
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
          }
        } else if (dateRange === 'SummerToFall') {
          // Only one segment: summer to winter solstice
          points = points.filter((p: { day: number }) => isDayInRange(p.day, dateRange));
          if (points.length === 0) continue;
          // Sort points by day
          const sortedPoints = [...points].sort((a, b) => a.day - b.day);

          // Determine solstice days based on hemisphere
          const isNorthernHemisphere = lat >= 0;
          const summerSolsticeDay = isNorthernHemisphere ? 172 : 355;
          const winterSolsticeDay = isNorthernHemisphere ? 355 : 172;

          // If labelSummerSide, place at start (summer solstice)
          if (labelSummerSide) {
            const pt = sortedPoints[0];
            const { nx, ny } = getNormalAtPoint(sortedPoints, 0);
            // When effective latitude is negative (beyond equatorial tilt), the geometry is inverted
            const isInvertedGeometry = lat < 0;
            const offset = isInvertedGeometry ? labelOffsetPx : -labelOffsetPx;
            const x = scale * pt.x + nx * offset;
            const y = scale * pt.y + ny * offset;
            // Only add label if it's within the border bounds
            if (isTextWithinBounds(x, y)) {
              hourLabelElements.push(
                <text
                  key={`label-${h}-${summerSolsticeDay}`}
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
          }
          // If labelWinterSide, place at end (winter solstice)
          if (labelWinterSide) {
            const lastIdx = sortedPoints.length - 1;
            const pt = sortedPoints[lastIdx];
            const { nx, ny } = getNormalAtPoint(sortedPoints, lastIdx);
            // When effective latitude is negative (beyond equatorial tilt), the geometry is inverted
            const isInvertedGeometry = lat < 0;
            const offset = isInvertedGeometry ? -labelOffsetPx : labelOffsetPx;
            const x = scale * pt.x + nx * offset;
            const y = scale * pt.y + ny * offset;
            // Only add label if it's within the border bounds
            if (isTextWithinBounds(x, y)) {
              hourLabelElements.push(
                <text
                  key={`label-${h}-${winterSolsticeDay}`}
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
          }
        } else {
          points = points.filter((p: { day: number }) => isDayInRange(p.day, dateRange));
          if (points.length === 0) continue;

          // Determine solstice days based on hemisphere
          const isNorthernHemisphere = lat >= 0;
          const summerSolsticeDay = isNorthernHemisphere ? 172 : 355;
          const winterSolsticeDay = isNorthernHemisphere ? 355 : 172;

          // Find solstice points
          const solsticeDays = [];
          if (labelSummerSide) solsticeDays.push(summerSolsticeDay); // Summer solstice
          if (labelWinterSide) solsticeDays.push(winterSolsticeDay); // Winter solstice
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
            // The direction depends on both the solstice type and the effective latitude
            const isSummer = solsticeDay === summerSolsticeDay;

            // When effective latitude is negative (beyond equatorial tilt), the geometry is inverted
            // We need to reverse the offset direction to keep labels outside the curves
            const isInvertedGeometry = lat < 0;
            let offset;
            if (isInvertedGeometry) {
              // For inverted geometry: Summer labels go below (positive offset), Winter labels go above (negative offset)
              offset = isSummer ? labelOffsetPx : -labelOffsetPx;
            } else {
              // For normal geometry: Summer labels go above (negative offset), Winter labels go below (positive offset)
              offset = isSummer ? -labelOffsetPx : labelOffsetPx;
            }

            const x = scale * pt.x + nx * offset;
            const y = scale * pt.y + ny * offset;
            // Only add label if it's within the border bounds
            if (isTextWithinBounds(x, y)) {
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
            }
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
        const isNorthernHemisphere = lat >= 0;
        const needsSplitting = (dateRange === 'WinterToSpring') ||
                              (dateRange === 'SummerToFall' && !isNorthernHemisphere);

        if (needsSplitting) {
          let segments: [{ day: number; x: number; y: number }[], { day: number; x: number; y: number }[]];

          if (dateRange === 'WinterToSpring') {
            segments = splitWinterToSpring(points);
          } else {
            // dateRange === 'SummerToFall' && !isNorthernHemisphere
            segments = splitSummerToFall(points);
          }

          const [seg1, seg2] = segments;
          [seg1, seg2].forEach((segment, idx) => {
            if (segment.length === 0) return;
            // Sort segment by day to avoid a straight line between segments
            let sortedSegment = [...segment].sort((a, b) => a.day - b.day);

            // Optimize for performance: if segment has too many points, reduce them
            // Skip optimization for calculated styles that need daily resolution
            if (sortedSegment.length > 100 && 
                !(style.style === 'calculated' && (style.calculatedType === 'hourline-5-2-day-dash' || style.calculatedType === 'hourline-2-5-day-dash'))) {
              const step = Math.ceil(sortedSegment.length / 50); // Keep ~50 points max
              sortedSegment = sortedSegment.filter((_, index) => index % step === 0);
            }

            // Handle calculated styles differently
            if (style.style === 'calculated' && style.calculatedType === 'hourline-5-2-day-dash') {
              // Create 5-day segments with 2-day gaps
              const dashSegments = create5Day2GapSegments(sortedSegment);
              dashSegments.forEach((segment, segIdx) => {
                const pathData = clipPathData(segment);
                if (pathData) {
                  elements.push(
                    <g key={`hourline-5-2-dash-${h}-${interval.id}-seg${idx}-dash-${segIdx}-${style.calculatedType}`}>
                      <path
                        d={pathData}
                        stroke={style.color || 'black'}
                        fill="none"
                        strokeWidth={getStrokeWidth(style.width)}
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                }
              });
            } else if (style.style === 'calculated' && style.calculatedType === 'hourline-2-5-day-dash') {
              // Create 2-day segments with 5-day gaps
              const dashSegments = create2Day5GapSegments(sortedSegment);
              dashSegments.forEach((segment, segIdx) => {
                const pathData = clipPathData(segment);
                if (pathData) {
                  elements.push(
                    <g key={`hourline-2-5-dash-${h}-${interval.id}-seg${idx}-dash-${segIdx}-${style.calculatedType}`}>
                      <path
                        d={pathData}
                        stroke={style.color || 'black'}
                        fill="none"
                        strokeWidth={getStrokeWidth(style.width)}
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  );
                }
              });
            } else {
              // Regular rendering for non-calculated styles
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
            }
          });
        } else {
          points = points.filter((p: { day: number }) => isDayInRange(p.day, dateRange));
          if (points.length === 0) continue;

          // Optimize for performance only for half-year views; keep full-year at 1 point/day
          // Skip optimization for calculated styles that need daily resolution
          if (dateRange !== 'FullYear' && points.length > 100 && 
              !(style.style === 'calculated' && (style.calculatedType === 'hourline-5-2-day-dash' || style.calculatedType === 'hourline-2-5-day-dash'))) {
            const step = Math.ceil(points.length / 50); // Keep ~50 points max
            points = points.filter((_, index) => index % step === 0);
          }

          // For full-year, sort strictly by day to ensure smooth loop and one vertex per day
          if (dateRange === 'FullYear') {
            points = [...points].sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
          }

          // Handle calculated styles differently
          if (style.style === 'calculated' && style.calculatedType === 'hourline-5-2-day-dash') {
            // Create 5-day segments with 2-day gaps
            const dashSegments = create5Day2GapSegments(points);
            dashSegments.forEach((segment, segIdx) => {
              const pathData = clipPathData(segment);
              if (pathData) {
                elements.push(
                  <g key={`${h}-${interval.id}-dash-${segIdx}`}>
                    <path
                      d={pathData}
                      stroke={style.color || 'black'}
                      fill="none"
                      strokeWidth={getStrokeWidth(style.width)}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              }
            });
          } else if (style.style === 'calculated' && style.calculatedType === 'hourline-2-5-day-dash') {
            // Create 2-day segments with 5-day gaps
            const dashSegments = create2Day5GapSegments(points);
            dashSegments.forEach((segment, segIdx) => {
              const pathData = clipPathData(segment);
              if (pathData) {
                elements.push(
                  <g key={`${h}-${interval.id}-2-5-dash-${segIdx}`}>
                    <path
                      d={pathData}
                      stroke={style.color || 'black'}
                      fill="none"
                      strokeWidth={getStrokeWidth(style.width)}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              }
            });
          } else {
            // Regular rendering for non-calculated styles
            const pathData = clipPathData(points);
            if (pathData) {
              let dOut = pathData;
              if (dateRange === 'FullYear') {
                const segments = pathData.split(/(?=M\s)/); // split on each 'M'
                dOut = joinSegmentsForClosedLoop(segments.filter(Boolean));
              }
              elements.push(
                <g key={`${h}-${interval.id}`}>
                  <path
                    d={dOut}
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
      }
      return elements;
    });

  // Helper to get declination for a declination line
  function getDeclinationForLine(line: DeclinationLine): number | null {
    if (line.date === 'Equinox') return 0;
    if (line.date === 'Summer Solstice') return 23.44;
    if (line.date === 'Winter Solstice') return -23.44;
    if (line.date === '1st of the Month') {
      // This is handled separately in getMonthBoundaryDeclinations
      return null;
    }
    if (line.date === '1st and 15th') {
      // This is handled separately in getFirstAndFifteenthDeclinations
      return null;
    }
    if (line.date === 'Today') {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return getSolarDeclination(dayOfYear);
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
        console.log(`User declination line: ${line.date} => day ${day}, decl ${decl}`);
      }
      return decl;
    }
    return null;
  }

  // Helper to get month boundary declinations within the date range
  // This function generates declination lines for the first day of each month
  // that falls within the selected date range (FullYear, SummerToFall, or WinterToSpring)
  function getMonthBoundaryDeclinations(): { day: number; decl: number; month: string }[] {
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

    if (dateRange === 'WinterToSpring') {
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
      // Use the new helper function for consistent filtering
      for (const monthStart of monthStarts) {
        if (isDayInRange(monthStart.day, dateRange)) {
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

  // Helper to get 1st and 15th declinations within the date range
  // This function generates declination lines for the 1st and 15th day of each month
  // that falls within the selected date range (FullYear, SummerToFall, or WinterToSpring)
  function getFirstAndFifteenthDeclinations(): { day: number; decl: number; month: string; dayOfMonth: number }[] {
    const firstAndFifteenthDays: { day: number; decl: number; month: string; dayOfMonth: number }[] = [];

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

    for (const monthStart of monthStarts) {
      // 1st of the month
      const firstDay = monthStart.day;
      // 15th of the month (14 days later)
      const fifteenthDay = monthStart.day + 14;

      // Check if 1st is in range
      if (dateRange === 'WinterToSpring') {
        if ((firstDay >= 355 && firstDay <= 365) || (firstDay >= 1 && firstDay <= 172)) {
          firstAndFifteenthDays.push({
            day: firstDay,
            decl: getSolarDeclination(firstDay),
            month: monthStart.month,
            dayOfMonth: 1
          });
        }
      } else {
        if (isDayInRange(firstDay, dateRange)) {
          firstAndFifteenthDays.push({
            day: firstDay,
            decl: getSolarDeclination(firstDay),
            month: monthStart.month,
            dayOfMonth: 1
          });
        }
      }

      // Check if 15th is in range
      if (dateRange === 'WinterToSpring') {
        if ((fifteenthDay >= 355 && fifteenthDay <= 365) || (fifteenthDay >= 1 && fifteenthDay <= 172)) {
          firstAndFifteenthDays.push({
            day: fifteenthDay,
            decl: getSolarDeclination(fifteenthDay),
            month: monthStart.month,
            dayOfMonth: 15
          });
        }
      } else {
        if (isDayInRange(fifteenthDay, dateRange)) {
          firstAndFifteenthDays.push({
            day: fifteenthDay,
            decl: getSolarDeclination(fifteenthDay),
            month: monthStart.month,
            dayOfMonth: 15
          });
        }
      }
    }

    return firstAndFifteenthDays;
  }

  // Helper function to find the best intersection point of declination line with noon analemma
  function findDeclinationAnalemmaIntersection(decl: number): { x: number; y: number } | null {
    // Get the noon analemma points (hour = 12)
    // Use the same parameters as the declination lines (original lat, Horizontal orientation)
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
    if (dateRange === 'WinterToSpring') {
      const [seg1, seg2] = splitWinterToSpring(filteredPoints);
      filteredPoints = [...seg1, ...seg2];
    } else {
      filteredPoints = filteredPoints.filter((p: { day: number }) => isDayInRange(p.day, dateRange));
    }

    console.log(`Finding intersection for declination ${decl.toFixed(2)}°, filtered points: ${filteredPoints.length}`);

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

    console.log(`Best match for declination ${decl.toFixed(2)}°: difference = ${smallestDifference.toFixed(2)}°`);

    // Only return the point if it's reasonably close (within 5 degrees)
    if (bestPoint && smallestDifference < 5.0) {
      return bestPoint;
    }

    console.log(`No suitable intersection found for declination ${decl.toFixed(2)}° (tolerance: 5.0°)`);
    return null;
  }

  // Helper function to render a single declination line
  function renderDeclinationLine(decl: number, style: LineStyle | undefined, key: string) {
    const maxRadius = Math.sqrt(width * width + height * height);

    // Handle calculated 2-minute dot style
    if (style?.style === 'calculated' && style?.calculatedType === 'declination-2min-dot') {
      return create2MinuteDots(decl, style);
    }

    // Handle calculated 5-minute dot style
    if (style?.style === 'calculated' && style?.calculatedType === 'declination-5min-dot') {
      return create5MinuteDots(decl, style);
    }

    // Handle calculated 2-minute dash style
    if (style?.style === 'calculated' && style?.calculatedType === 'declination-2min-dash') {
      return create2MinuteDashSegments(decl, style);
    }

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

    console.log('Declination lines to render:', declinationLines.map(l => ({date: l.date, active: l.active, styleId: l.styleId, id: l.id, decl: getDeclinationForLine(l)})));
  }

  const declinationLineElements = declinationLines.flatMap((line, idx) => {
    if (!line.active) return [];
    if (!isDateStringInRange(line.date)) return [];

    const style = lineStyles.find(s => s.id === line.styleId || s.name === line.styleId);


    // Handle 1st of the Month as a special case
    if (line.date === '1st of the Month') {
      const monthBoundaries = getMonthBoundaryDeclinations();
  
      return monthBoundaries.flatMap((boundary, boundaryIdx) => {
        const elements = renderDeclinationLine(boundary.decl, style, `${line.id || line.date || idx}-${boundary.month}-${boundaryIdx}`);
        return elements || [];
      });
    }

    // Handle 1st and 15th as a special case
    if (line.date === '1st and 15th') {
      const firstAndFifteenthDays = getFirstAndFifteenthDeclinations();
  
      return firstAndFifteenthDays.flatMap((day, dayIdx) => {
        const elements = renderDeclinationLine(day.decl, style, `${line.id || line.date || idx}-${day.month}-${day.dayOfMonth}-${dayIdx}`);
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
  console.log(`Declination noonmarks enabled: ${declinationNoonmarks}, scale: ${scale}, viewBoxScaleFactor: ${viewBoxScaleFactor}`);

  const declinationNoonmarkElements = declinationNoonmarks ? declinationLines.flatMap((line, idx) => {

    console.log(`Processing declination line ${idx}: ${line.date}, active: ${line.active}`);

    if (!line.active) return [];
    if (!isDateStringInRange(line.date)) return [];

    const style = lineStyles.find(s => s.id === line.styleId || s.name === line.styleId);
    if (!style) {
  
      console.log(`No style found for line ${line.date}, styleId: ${line.styleId}`);
      return [];
    }

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

    // Debug logging for declination noonmarks

    console.log(`Declination noonmark processing: ${line.date}, active: ${line.active}, style: ${style?.color}`);





    // Handle 1st of the Month as a special case
    if (line.date === '1st of the Month') {
      const monthBoundaries = getMonthBoundaryDeclinations();
  
      console.log(`Month boundaries for noonmarks:`, monthBoundaries.map(b => `${b.month} (decl ${b.decl.toFixed(2)}°)`));
      return monthBoundaries.flatMap((boundary, boundaryIdx) => {
        // Find single intersection point with noon analemma for this declination
        const intersectionPoint = findDeclinationAnalemmaIntersection(boundary.decl);
        if (!intersectionPoint) {
      
          console.log(`No intersection found for month boundary ${boundary.month} (decl ${boundary.decl.toFixed(2)}°)`);
          return [];
        }

    
        console.log(`Found intersection for ${boundary.month}: (${intersectionPoint.x.toFixed(2)}, ${intersectionPoint.y.toFixed(2)})`);
        console.log(`Rendering circle for ${boundary.month} at (${(scale * intersectionPoint.x).toFixed(2)}, ${(scale * intersectionPoint.y).toFixed(2)}) with radius ${circleRadius}`);

        return [
          <circle
            key={`noonmark-${line.id || line.date || idx}-${boundary.month}-${boundaryIdx}`}
            cx={scale * intersectionPoint.x}
            cy={scale * intersectionPoint.y}
            r={circleRadius}
            fill={style.color || 'black'}
            stroke="none"
            vectorEffect="non-scaling-stroke"
          />
        ];
      });
    }

    // Handle 1st and 15th as a special case
    if (line.date === '1st and 15th') {
      const firstAndFifteenthDays = getFirstAndFifteenthDeclinations();
  
      console.log(`1st and 15th days for noonmarks:`, firstAndFifteenthDays.map(d => `${d.month} ${d.dayOfMonth} (decl ${d.decl.toFixed(2)}°)`));
      return firstAndFifteenthDays.flatMap((day, dayIdx) => {
        // Find single intersection point with noon analemma for this declination
        const intersectionPoint = findDeclinationAnalemmaIntersection(day.decl);
        if (!intersectionPoint) {
      
          console.log(`No intersection found for ${day.month} ${day.dayOfMonth} (decl ${day.decl.toFixed(2)}°)`);
          return [];
        }

    
        console.log(`Found intersection for ${day.month} ${day.dayOfMonth}: (${intersectionPoint.x.toFixed(2)}, ${intersectionPoint.y.toFixed(2)})`);
        console.log(`Rendering circle for ${day.month} ${day.dayOfMonth} at (${(scale * intersectionPoint.x).toFixed(2)}, ${(scale * intersectionPoint.y).toFixed(2)}) with radius ${circleRadius}`);

        return [
          <circle
            key={`noonmark-${line.id || line.date || idx}-${day.month}-${day.dayOfMonth}-${dayIdx}`}
            cx={scale * intersectionPoint.x}
            cy={scale * intersectionPoint.y}
            r={circleRadius}
            fill={style.color || 'black'}
            stroke="none"
            vectorEffect="non-scaling-stroke"
          />
        ];
      });
    }

    // Handle regular declination lines
    const decl = getDeclinationForLine(line);
    if (decl === null) {
  
      console.log(`No declination found for line: ${line.date}`);
      return [];
    }

    // Find single intersection point with noon analemma for this declination
    const intersectionPoint = findDeclinationAnalemmaIntersection(decl);
    if (!intersectionPoint) {
  
      console.log(`No intersection found for declination ${decl.toFixed(2)}° (line: ${line.date})`);
      return [];
    }


    console.log(`Found intersection for ${line.date} (decl ${decl.toFixed(2)}°): (${intersectionPoint.x.toFixed(2)}, ${intersectionPoint.y.toFixed(2)})`);
    console.log(`Rendering circle at (${(scale * intersectionPoint.x).toFixed(2)}, ${(scale * intersectionPoint.y).toFixed(2)}) with radius ${circleRadius}`);

    return [
      <circle
        key={`noonmark-${line.id || line.date || idx}`}
        cx={scale * intersectionPoint.x}
        cy={scale * intersectionPoint.y}
        r={circleRadius}
        fill={style.color || 'black'}
        stroke="none"
        vectorEffect="non-scaling-stroke"
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
  if (!locationString && typeof lat === 'number' && typeof lng === 'number') {
    // Fallback if no location name is provided
    locationString = 'Lat: ' + lat.toFixed(4) + ', Lon: ' + lng.toFixed(4);
  }
  let coordinatesString = '';
  if (typeof lat === 'number' && typeof lng === 'number') {
    coordinatesString = `Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}`;
  }


  let textBlockLines: Array<Array<{ text: string; bold: boolean; italic: boolean; color?: string }>> = [];
  if (dialTextBlock) {
    // Helper functions for tropical calculations
    const getCancerIncline = (lat: number): number => {
      // Calculate tilt toward Tropic of Cancer (23.4367°)
      // This creates a dial oriented toward the summer solstice
      return Math.abs(lat - 23.4367);
    };

    const getCapricornIncline = (lat: number): number => {
      // Calculate tilt toward Tropic of Capricorn (-23.4367°)
      // This creates a dial oriented toward the winter solstice
      return Math.abs(lat - (-23.4367));
    };

      // Create incline string - show for all incline types except Horizontal
  const effectiveTiltAngle = inclineType === 'Horizontal' ? 0 :
                            inclineType === 'Cancer' ? getCancerIncline(originalLatitude || lat || 0) :
                            inclineType === 'Equatorial' ? (originalLatitude || lat || 0) :
                            inclineType === 'Capricorn' ? getCapricornIncline(originalLatitude || lat || 0) :
                            inclineType === 'Vertical' ? 90 : tiltAngle;
  const inclineString = inclineType !== 'Horizontal' ? `incline: ${effectiveTiltAngle.toFixed(1)}°` : '';

    // Check if "Today" declination line is active
    const todayLineActive = declinationLines.some(line => line.active && line.date === 'Today' && isDateStringInRange('Today'));

    // Get today's date in "Month Day" format
    const getTodayDateString = (): string => {
      const today = new Date();
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[today.getMonth()]} ${today.getDate()}`;
    };

    // Process text with placeholders, but handle {today} specially
    let processedText = dialTextBlock
      .replace(/\{location\}/gi, locationString)
      .replace(/\{coordinates\}/gi, coordinatesString)
      .replace(/\{half-year\}/gi, dateRange === 'FullYear' ? '' : dateRange === 'SummerToFall' ? 'Summer - Fall' : 'Winter - Spring')
      .replace(/\{gnomon\}/gi, `height: ${gnomonHeight} mm`)
      .replace(/\{incline\}/gi, inclineString);

    // Handle {today} placeholder specially - replace with red-colored text
    if (todayLineActive) {
      const todayDate = getTodayDateString();
      // Replace {today} with the date, preserving any surrounding asterisks
      processedText = processedText.replace(/\*?\{today\}\*?/gi, (match) => {
        // If the match includes asterisks, preserve them
        if (match.startsWith('*') && match.endsWith('*')) {
          return `*${todayDate}*`; // Preserve italic formatting
        } else if (match.startsWith('*')) {
          return `*${todayDate}`; // Preserve leading asterisk
        } else if (match.endsWith('*')) {
          return `${todayDate}*`; // Preserve trailing asterisk
        } else {
          return `*${todayDate}*`; // Add asterisks for italic
        }
      });
    } else {
      // Remove {today} and any surrounding asterisks
      processedText = processedText.replace(/\*?\{today\}\*?/gi, '');
    }

    // Custom parsing function that handles color for {today} text
    const parseTextWithColor = (text: string): Array<{ text: string; bold: boolean; italic: boolean; color?: string }> => {
      const parts: Array<{ text: string; bold: boolean; italic: boolean; color?: string }> = [];
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

        const markedText = text.slice(markerStart + markerLength, markerEnd);

        // Check if this is the today date text (italic with red color)
        // The {today} placeholder gets replaced with *${todayDate}*, so we need to check if this text
        // was generated from the {today} placeholder by checking if it matches today's date
        const isTodayText = todayLineActive && markedText === getTodayDateString();

        // Add marked text
        const part = {
          text: markedText,
          bold: markerType === 'bold',
          italic: markerType === 'italic',
          color: isTodayText ? 'red' : undefined
        };
        parts.push(part);
        currentIndex = markerEnd + markerLength;
      }

      return parts;
    };

    // Filter out lines that become empty or contain only markup after replacement
    textBlockLines = processedText.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Remove lines that are empty or contain only markup characters (*, **)
        return trimmed !== '' && !trimmed.match(/^\*+$/);
      })
      .map(line => parseTextWithColor(line));



  }
  // Calculate y position for the text block based on dial facing and incline
  const calculateTextBlockPosition = (): { x: number; y: number } => {
    // Use the same black circle positioning logic as the debug circles
    const latRad = degreesToRadians(lat);
    const hourAngle = degreesToRadians(15 * (12 - 12)); // Solar noon

    // Calculate solstice positions using the same method as debug circles
    function calculateSolsticePosition(declination: number) {
      const declRad = degreesToRadians(declination);
      const sinAlt = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
      const altitude = Math.asin(sinAlt);
      let cosAz = (Math.sin(declRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad));
      cosAz = Math.max(-1, Math.min(1, cosAz));
      let azimuth = Math.acos(cosAz);
      if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;

      return projectShadowToSurface(altitude, azimuth, gnomonHeight, 'Horizontal', lat);
    }

    const summerSolsticeDeclination = 23.44;   // June 21st
    const winterSolsticeDeclination = -23.44;  // December 21st

    const summerCoords = calculateSolsticePosition(summerSolsticeDeclination);
    const winterCoords = calculateSolsticePosition(winterSolsticeDeclination);
    const grayCoords = calculateSolsticePosition(0); // Equinox

    // Calculate black circle position using the same logic as debug circles
    const greenCoords = { x: 0, y: 0 }; // Gnomon point

    // Determine which side of gray the green circle is on
    const greenToGrayDistance = grayCoords.y - greenCoords.y;
    const redToGrayDistance = grayCoords.y - summerCoords.y;
    const isGreenOnRedSide = Math.sign(greenToGrayDistance) === Math.sign(redToGrayDistance);

    let blackCoords;
    if (isGreenOnRedSide) {
      // Green is on red side of gray: place black circle 150% of the way from red to blue
      blackCoords = {
        x: summerCoords.x + 1.5 * (winterCoords.x - summerCoords.x),
        y: summerCoords.y + 1.5 * (winterCoords.y - summerCoords.y)
      };
    } else {
      // Green is on blue side of gray: place black circle 150% of the way from blue to red
      blackCoords = {
        x: winterCoords.x + 1.5 * (summerCoords.x - winterCoords.x),
        y: winterCoords.y + 1.5 * (summerCoords.y - winterCoords.y)
      };
    }

    return { x: blackCoords.x, y: blackCoords.y };
  };

  const { x: textBlockX, y: textBlockY } = calculateTextBlockPosition();

  // Calculate center of text block for rotation
  const lineCount = textBlockLines.length;
  const lineHeight = dialTextBlockFontSizeMm * 1.2;

  // The text block position is already the centroid, so we use it directly
  // For North-facing dials, the entire SVG group is rotated 180°, so we don't need to adjust coordinates
  const adjustedTextBlockX = textBlockX;
  const adjustedTextBlockY = textBlockY;

  // Create a configuration hash to force re-render when styles change
  const configHash = JSON.stringify({
    hourlineIntervals: hourlineIntervals.map(h => ({ id: h.id, active: h.active, styleId: h.styleId })),
    declinationLines: declinationLines.map(d => ({ id: d.id, active: d.active, styleId: d.styleId })),
    lineStyles: lineStyles.map(s => ({ id: s.id, calculatedType: s.calculatedType }))
  });

  return (
    <div className="card" style={{ width: '100%', margin: 0 }}>
      <div className="card-header">
        <h3 className="card-title"><Sun color="#2563eb" size={20} style={{marginRight: 6}} /> Sundial Preview ({orientation}, {pageSize})</h3>
      </div>
      <div style={{ width: '100%', minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
        <svg
          key={configHash}
          width="100%"
          height="100%"
          viewBox={`-${viewBoxWidth / 2} -${viewBoxHeight / 2} ${viewBoxWidth} ${viewBoxHeight}`}
          style={{ display: 'block', border: '1px solid #ccc', background: showBackground ? backgroundColor : '#fff', width: '100%', height: '100%', objectFit: 'contain' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {borderRect}
          {clippingBoundary}
          {/* Main content group - rotate entire page when North facing */}
          <g transform={`scale(${viewBoxScaleFactor}) ${dialFacing === 'North' ? 'rotate(180)' : ''}`}>
            {/* Content positioned relative to gnomon */}
            <g transform={`translate(0, ${(gnomonPosition ?? 0) - (height / 2)})`}>
              {/* Gnomon mark at (0,0) */}
              <GnomonSVG
                gnomonType={gnomonType}
                gnomonHeight={gnomonHeight}
                lat={lat}
                inclineType={inclineType}
              />

              {hourlineElements.flat()}
              {declinationLineElements}
              {declinationNoonmarkElements}



              {/* Hour labels - counter-rotate text to keep readable */}
              {hourLabelElements.map((label, index) => {
                // Extract x and y from the label props
                const { x, y } = label.props;
                return React.cloneElement(label, {
                  key: `label-${index}`,
                  transform: dialFacing === 'North' ? `rotate(180 ${x} ${y})` : undefined
                });
              })}

              {/* --- Dial Text Block --- */}

              {sundialNotesMode === 'textBlock' && textBlockLines.length > 0 && (
                <text
                    x={adjustedTextBlockX}
                    y={adjustedTextBlockY}
                    fontSize={dialTextBlockFontSizeMm}
                    fill="#222"
                    textAnchor="middle"
                    fontFamily={dialTextBlockFontFamily}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                    transform={dialFacing === 'North' ? `rotate(180 ${adjustedTextBlockX} ${adjustedTextBlockY})` : undefined}
                  >
                    {textBlockLines.map((line, lineIndex) => (
                      <tspan
                        key={lineIndex}
                        x={adjustedTextBlockX}
                        dy={lineIndex === 0 ? -((lineCount - 1) * lineHeight) / 2 : dialTextBlockFontSizeMm * 1.2}
                      >
                        {line.map((part, partIndex) => {
                          return (
                            <tspan
                              key={partIndex}
                              fontWeight={part.bold ? 'bold' : 'normal'}
                              fontStyle={part.italic ? 'italic' : 'normal'}
                              fill={part.color || '#222'}
                            >
                              {part.text}
                            </tspan>
                          );
                        })}
                      </tspan>
                    ))}
                  </text>
              )}

              {/* --- Seasons Guide --- */}

              {sundialNotesMode === 'seasonsGuide' && (() => {
                // Generate noon analemma using the EXACT same logic as the main sundial hourlines
                const seasonsNoonPoints = getAnalemmaPointsProjected({
                  lat,
                  lng,
                  tzMeridian,
                  hour: 12, // Noon hour
                  gnomonHeight,
                  orientation: 'Horizontal',
                });

                // Calculate the bounding box of the original analemma for proper centering
                const calculateBoundingBox = (points: { x: number; y: number }[]) => {
                  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
                  
                  const minX = Math.min(...points.map(p => p.x));
                  const maxX = Math.max(...points.map(p => p.x));
                  const minY = Math.min(...points.map(p => p.y));
                  const maxY = Math.max(...points.map(p => p.y));
                  
                  return {
                    minX, maxX, minY, maxY,
                    centerX: (minX + maxX) / 2,
                    centerY: (minY + maxY) / 2
                  };
                };

                // Scale by 55% and center at text block position
                const seasonsGuideScale = 0.55;

                // Generate path data with simple boundary filtering to avoid clipping artifacts
                const generateSeasonsGuidePath = (points: { x: number; y: number }[]): string | null => {
                  if (points.length < 2) return null;

                  // Calculate bounding box for centering
                  const bbox = calculateBoundingBox(points);
                  
                  const transformedPoints = points.map(p => ({
                    x: adjustedTextBlockX + (scale * seasonsGuideScale * (p.x - bbox.centerX)),
                    y: adjustedTextBlockY + (scale * seasonsGuideScale * (p.y - bbox.centerY))
                  }));

                  // Simple approach: filter out points that are far outside the visible area
                  // This avoids clipping artifacts while keeping the analemma shape intact
                  const transformY = (gnomonPosition ?? 0) - (height / 2);
                  const margin = Math.max(width, height) * 0.1; // 10% margin for safety
                  const left = -width / 2 - margin;
                  const top = -height / 2 - margin - transformY;
                  const right = width / 2 + margin;
                  const bottom = height / 2 + margin - transformY;

                  // Filter points that are reasonably within the extended bounds
                  const visiblePoints = transformedPoints.filter(p => 
                    p.x >= left && p.x <= right && p.y >= top && p.y <= bottom
                  );

                  if (visiblePoints.length < 2) return null;

                  // Generate simple path without clipping - let SVG handle overflow
                  const pathData = visiblePoints
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                    .join(' ');

                  return pathData;
                };

                // Always show full-year replica for seasons guide, regardless of hourline date range
                const needsSplitting = false; // Force full-year display for seasons guide
                
                // Convert InclineType to Orientation for analemma generation
                const getOrientation = (inclineType: string): 'Horizontal' | 'Vertical' | 'Equatorial' => {
                  switch (inclineType) {
                    case 'Horizontal':
                    case 'Cancer':
                    case 'Capricorn':
                    case 'Manual':
                      return 'Horizontal';
                    case 'Vertical':
                      return 'Vertical';
                    case 'Equatorial':
                      return 'Equatorial';
                    default:
                      return 'Horizontal';
                  }
                };

                if (needsSplitting) {
                  let segments: [{ day: number; x: number; y: number }[], { day: number; x: number; y: number }[]];

                  if (dateRange === 'WinterToSpring') {
                    segments = splitWinterToSpring(seasonsNoonPoints);
                  } else {
                    segments = splitSummerToFall(seasonsNoonPoints);
                  }

                  const [seg1, seg2] = segments;
                  
                  // Calculate equinox line for segmented case too
                  const calculateEquinoxLine = () => {
                    try {
                      // Spring equinox is around day 80 (March 21)
                      const equinoxDay = 80;
                      
                      // Get equinox position at noon (hour 12) - use same orientation as main dial
                      const equinoxNoonPoint = getAnalemmaPointsProjected({
                        lat,
                        lng,
                        tzMeridian,
                        hour: 12,
                        gnomonHeight,
                        orientation: getOrientation(inclineType),
                      }).find(p => Math.abs(p.day - equinoxDay) < 1);

                      if (!equinoxNoonPoint) return null;

                      // Calculate the equinox Y position in the replica coordinate system
                      const bbox = calculateBoundingBox(seasonsNoonPoints);
                      if (!bbox || isNaN(bbox.centerY)) return null;
                      
                      const equinoxY = adjustedTextBlockY + (scale * seasonsGuideScale * (equinoxNoonPoint.y - bbox.centerY));
                      if (isNaN(equinoxY)) return null;

                      // Create horizontal line with 1-hour width
                      // 1 hour = ±30 minutes, so we need points at 11:30 and 12:30
                      const leftHourPoint = getAnalemmaPointsProjected({
                        lat,
                        lng,
                        tzMeridian,
                        hour: 11.5, // 11:30
                        gnomonHeight,
                        orientation: getOrientation(inclineType),
                      }).find(p => Math.abs(p.day - equinoxDay) < 1);

                      const rightHourPoint = getAnalemmaPointsProjected({
                        lat,
                        lng,
                        tzMeridian,
                        hour: 12.5, // 12:30
                        gnomonHeight,
                        orientation: getOrientation(inclineType),
                      }).find(p => Math.abs(p.day - equinoxDay) < 1);

                      if (!leftHourPoint || !rightHourPoint) return null;

                      // Transform the hour points to replica coordinate system
                      const leftX = adjustedTextBlockX + (scale * seasonsGuideScale * (leftHourPoint.x - bbox.centerX));
                      const rightX = adjustedTextBlockX + (scale * seasonsGuideScale * (rightHourPoint.x - bbox.centerX));
                      
                      // Center the line horizontally over the replica analemma
                      const replicaCenterX = adjustedTextBlockX; // The replica is centered at the text block position
                      const halfWidth = Math.abs(rightX - leftX) / 2;
                      const centeredLeftX = replicaCenterX - halfWidth;
                      const centeredRightX = replicaCenterX + halfWidth;

                      if (isNaN(centeredLeftX) || isNaN(centeredRightX)) return null;

                      const result = {
                        x1: centeredLeftX,
                        y1: equinoxY,
                        x2: centeredRightX,
                        y2: equinoxY
                      };
                      
                      console.log('Equinox line calculated:', result);
                      return result;
                    } catch (error) {
                      console.error('Error calculating equinox line:', error);
                      return null;
                    }
                  };

                  const equinoxLine = calculateEquinoxLine();

                  return (
                    <>
                      {[seg1, seg2].map((segment, idx) => {
                        if (segment.length === 0) return null;
                        const sortedSegment = [...segment].sort((a, b) => a.day - b.day);
                        
                        // Optimize for performance: if segment has too many points, reduce them
                        let optimizedSegment = sortedSegment;
                        if (optimizedSegment.length > 100) {
                          const step = Math.ceil(optimizedSegment.length / 50);
                          optimizedSegment = optimizedSegment.filter((_, index) => index % step === 0);
                        }
                        
                        const pathData = generateSeasonsGuidePath(optimizedSegment);
                        if (!pathData) return null;
                        
                        return (
                          <path
                            key={`seasons-guide-seg${idx}`}
                            d={pathData}
                            stroke="#2563eb"
                            fill="none"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                      {equinoxLine && (
                        <line
                          x1={equinoxLine.x1}
                          y1={equinoxLine.y1}
                          x2={equinoxLine.x2}
                          y2={equinoxLine.y2}
                          stroke="#2563eb"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </>
                  );
                } else {
                  // Always use full-year data for seasons guide (no date range filtering)
                  if (seasonsNoonPoints.length === 0) return null;

                  // Always sort by day for smooth full-year loop
                  const optimizedPoints = [...seasonsNoonPoints].sort((a, b) => (a.day ?? 0) - (b.day ?? 0));

                  const pathData = generateSeasonsGuidePath(optimizedPoints);
                  if (!pathData) return null;

                  // Always use closed loop logic for seasons guide (full year display)
                  const segments = pathData.split(/(?=M\s)/);
                  const joinSegmentsForClosedLoop = (segments: string[]): string => {
                    if (segments.length <= 1) return segments.join(' ');
                    return segments.join(' ') + ' Z';
                  };
                  const finalPathData = joinSegmentsForClosedLoop(segments.filter(Boolean));

                  // Calculate equinox line position using the same logic as the main dial
                  const calculateEquinoxLine = () => {
                    try {
                      // Spring equinox is around day 80 (March 21)
                      const equinoxDay = 80;
                      
                      // Get equinox position at noon (hour 12) - use same orientation as main dial
                      const equinoxNoonPoint = getAnalemmaPointsProjected({
                        lat,
                        lng,
                        tzMeridian,
                        hour: 12,
                        gnomonHeight,
                        orientation: getOrientation(inclineType),
                      }).find(p => Math.abs(p.day - equinoxDay) < 1);

                      if (!equinoxNoonPoint) return null;

                      // Calculate the equinox Y position in the replica coordinate system
                      const bbox = calculateBoundingBox(optimizedPoints);
                      if (!bbox || isNaN(bbox.centerY)) return null;
                      
                      const equinoxY = adjustedTextBlockY + (scale * seasonsGuideScale * (equinoxNoonPoint.y - bbox.centerY));
                      if (isNaN(equinoxY)) return null;

                      // Create horizontal line with 1-hour width
                      // 1 hour = ±30 minutes, so we need points at 11:30 and 12:30
                      const leftHourPoint = getAnalemmaPointsProjected({
                        lat,
                        lng,
                        tzMeridian,
                        hour: 11.5, // 11:30
                        gnomonHeight,
                        orientation: getOrientation(inclineType),
                      }).find(p => Math.abs(p.day - equinoxDay) < 1);

                      const rightHourPoint = getAnalemmaPointsProjected({
                        lat,
                        lng,
                        tzMeridian,
                        hour: 12.5, // 12:30
                        gnomonHeight,
                        orientation: getOrientation(inclineType),
                      }).find(p => Math.abs(p.day - equinoxDay) < 1);

                      if (!leftHourPoint || !rightHourPoint) return null;

                      // Transform the hour points to replica coordinate system
                      const leftX = adjustedTextBlockX + (scale * seasonsGuideScale * (leftHourPoint.x - bbox.centerX));
                      const rightX = adjustedTextBlockX + (scale * seasonsGuideScale * (rightHourPoint.x - bbox.centerX));
                      
                      // Center the line horizontally over the replica analemma
                      const replicaCenterX = adjustedTextBlockX; // The replica is centered at the text block position
                      const halfWidth = Math.abs(rightX - leftX) / 2;
                      const centeredLeftX = replicaCenterX - halfWidth;
                      const centeredRightX = replicaCenterX + halfWidth;

                      if (isNaN(centeredLeftX) || isNaN(centeredRightX)) return null;

                      const result = {
                        x1: centeredLeftX,
                        y1: equinoxY,
                        x2: centeredRightX,
                        y2: equinoxY
                      };
                      
                      console.log('Equinox line calculated:', result);
                      return result;
                    } catch (error) {
                      console.error('Error calculating equinox line:', error);
                      return null;
                    }
                  };

                  const equinoxLine = calculateEquinoxLine();

                  // Calculate quarter-year positions for seasonal labels
                  const getSeasonQuarterPoint = (dayOfYear: number) => {
                    const point = optimizedPoints.find(p => Math.abs(p.day - dayOfYear) < 5);
                    if (!point) return null;
                    
                    const replicaBbox = calculateBoundingBox(optimizedPoints);
                    return {
                      x: adjustedTextBlockX + (scale * seasonsGuideScale * (point.x - replicaBbox.centerX)),
                      y: adjustedTextBlockY + (scale * seasonsGuideScale * (point.y - replicaBbox.centerY))
                    };
                  };

                  // Quarter-year days (middle of each season)
                  const summerQuarter = getSeasonQuarterPoint(135); // Mid-May (middle of spring-summer)
                  const fallQuarter = getSeasonQuarterPoint(227);   // Mid-August (middle of summer-fall)  
                  const winterQuarter = getSeasonQuarterPoint(318); // Mid-November (middle of fall-winter)
                  const springQuarter = getSeasonQuarterPoint(45);  // Mid-February (middle of winter-spring)

                  return (
                    <>
                      <path
                        d={finalPathData}
                        stroke="#2563eb"
                        fill="none"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                      {equinoxLine && (
                        <line
                          x1={equinoxLine.x1}
                          y1={equinoxLine.y1}
                          x2={equinoxLine.x2}
                          y2={equinoxLine.y2}
                          stroke="#2563eb"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                      
                      {/* Seasonal Labels positioned relative to equinox line */}
                      {equinoxLine && (
                        <>
                          {/* Spring - above equinox line, left of analemma */}
                          {summerQuarter && (
                            <text
                              x={summerQuarter.x - 10}
                              y={equinoxLine.y1 - 8}
                              textAnchor="middle"
                              dominantBaseline="bottom"
                              fontSize={dialTextBlockFontSize * 0.3528 * 0.8}
                              fontFamily={dialTextBlockFontFamily}
                              fill="#2563eb"
                              transform={dialFacing === 'North' ? `rotate(180 ${summerQuarter.x - 10} ${equinoxLine.y1 - 8})` : undefined}
                            >
                              Spring
                            </text>
                          )}
                          
                          {/* Summer - above equinox line, right of analemma */}
                          {fallQuarter && (
                            <text
                              x={fallQuarter.x + 12}
                              y={equinoxLine.y1 - 8}
                              textAnchor="middle"
                              dominantBaseline="bottom"
                              fontSize={dialTextBlockFontSize * 0.3528 * 0.8}
                              fontFamily={dialTextBlockFontFamily}
                              fill="#2563eb"
                              transform={dialFacing === 'North' ? `rotate(180 ${fallQuarter.x + 12} ${equinoxLine.y1 - 8})` : undefined}
                            >
                              Summer
                            </text>
                          )}
                          
                          {/* Fall - below equinox line, left of analemma */}
                          {winterQuarter && (
                            <text
                              x={winterQuarter.x - 5}
                              y={equinoxLine.y1 + 8}
                              textAnchor="middle"
                              dominantBaseline="top"
                              fontSize={dialTextBlockFontSize * 0.3528 * 0.8}
                              fontFamily={dialTextBlockFontFamily}
                              fill="#2563eb"
                              transform={dialFacing === 'North' ? `rotate(180 ${winterQuarter.x - 5} ${equinoxLine.y1 + 8})` : undefined}
                            >
                              Fall
                            </text>
                          )}
                          
                          {/* Winter - below equinox line, right of analemma */}
                          {springQuarter && (
                            <text
                              x={springQuarter.x + 10}
                              y={equinoxLine.y1 + 8}
                              textAnchor="middle"
                              dominantBaseline="top"
                              fontSize={dialTextBlockFontSize * 0.3528 * 0.8}
                              fontFamily={dialTextBlockFontFamily}
                              fill="#2563eb"
                              transform={dialFacing === 'North' ? `rotate(180 ${springQuarter.x + 10} ${equinoxLine.y1 + 8})` : undefined}
                            >
                              Winter
                            </text>
                          )}
                        </>
                      )}
                    </>
                  );
                }
              })()}

              {/* --- North Point --- */}

              {sundialNotesMode === 'northPoint' && (() => {
                // Generate noon analemma to calculate the replica height for scaling
                const noonPoints = getAnalemmaPointsProjected({
                  lat,
                  lng,
                  tzMeridian,
                  hour: 12, // Noon hour
                  gnomonHeight,
                  orientation: 'Horizontal',
                });

                // Calculate the bounding box of the analemma
                const calculateBoundingBox = (points: { x: number; y: number }[]) => {
                  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, height: 0 };
                  
                  const minX = Math.min(...points.map(p => p.x));
                  const maxX = Math.max(...points.map(p => p.x));
                  const minY = Math.min(...points.map(p => p.y));
                  const maxY = Math.max(...points.map(p => p.y));
                  
                  return {
                    minX, maxX, minY, maxY,
                    height: maxY - minY
                  };
                };

                const bbox = calculateBoundingBox(noonPoints);
                
                // Calculate the replica analemma height (same scaling as seasons guide)
                const seasonsGuideScale = 0.55;
                const replicaAnalemmaHeight = bbox.height * scale * seasonsGuideScale;
                
                // Scale North Point SVG to 82.5% of replica analemma height (75% * 1.1 for 10% larger)
                const northPointScale = replicaAnalemmaHeight * 0.825;
                
                // North Point SVG viewBox is "0 0 920.07 1200", so original height is 1200
                const svgOriginalHeight = 1200;
                const scaleFactor = northPointScale / svgOriginalHeight;

                return (
                  <g
                    transform={`translate(${adjustedTextBlockX}, ${adjustedTextBlockY}) scale(${scaleFactor}) translate(-460.035, -600) ${dialFacing === 'North' ? 'rotate(180 460.035 600)' : ''}`}
                  >
                    {/* North Point SVG content */}
                    <g>
                      <path 
                        d="M920.07,600l-365.24-59.95,88.65-123.49-123.49,88.65-59.95-365.24-59.95,365.24-123.49-88.65,88.65,123.49L0,600l365.24,59.95-88.65,123.49,123.49-88.65,59.95,365.24,59.95-365.24,123.49,88.65-88.65-123.49,365.24-59.95ZM460.04,668.63c-37.83,0-68.6-30.8-68.6-68.63s30.77-68.63,68.6-68.63,68.6,30.8,68.6,68.63-30.77,68.63-68.6,68.63ZM460.04,280.44v228.18c-13.91,0-27.08,3.1-38.88,8.67l38.88-236.86ZM140.47,600h228.21c0,13.91,3.1,27.08,8.67,38.88l-236.89-38.88ZM460.04,919.56v-228.18c13.91,0,27.08-3.1,38.88-8.67l-38.88,236.86ZM542.71,561.12l236.89,38.88h-228.21c0-13.91-3.1-27.08-8.67-38.88Z" 
                        fill="#2563eb"
                      />
                      <path 
                        d="M460.04,552.22c-7.28,0-14.16,1.62-20.34,4.55-16.21,7.62-27.42,24.12-27.42,43.23,0,7.28,1.62,14.16,4.52,20.34,7.62,16.21,24.12,27.45,43.23,27.45,7.28,0,14.16-1.62,20.34-4.55,16.21-7.62,27.42-24.12,27.42-43.23,0-7.28-1.62-14.16-4.52-20.34-7.62-16.21-24.12-27.45-43.23-27.45Z" 
                        fill="#2563eb"
                      />
                      <path 
                        d="M523.03,313.01c111.53,24.46,199.53,112.46,223.99,223.99l45.44,7.46c-23.55-141.43-135.46-253.34-276.89-276.89l7.46,45.44Z" 
                        fill="#2563eb"
                      />
                      <path 
                        d="M173.05,537.01c24.46-111.53,112.46-199.53,223.99-223.99l7.46-45.44c-141.43,23.55-253.34,135.46-276.89,276.89l45.44-7.46Z" 
                        fill="#2563eb"
                      />
                      <path 
                        d="M397.04,886.99c-111.53-24.46-199.53-112.46-223.99-223.99l-45.44-7.46c23.55,141.43,135.46,253.34,276.89,276.89l-7.46-45.44Z" 
                        fill="#2563eb"
                      />
                      <path 
                        d="M747.02,662.99c-24.46,111.53-112.46,199.53-223.99,223.99l-7.46,45.44c141.43-23.55,253.34-135.46,276.89-276.89l-45.44,7.46Z" 
                        fill="#2563eb"
                      />
                      <path 
                        d="M502.22,95.1h-25.63l-41.37-71.94h-.59c.82,12.71,1.24,21.77,1.24,27.19v44.75h-18.02V0h25.43l41.3,71.23h.46c-.65-12.36-.98-21.1-.98-26.21V0h18.15v95.1Z" 
                        fill="#2563eb"
                      />
                      <path 
                        d="M491.03,1172.29c0,8.59-3.09,15.35-9.27,20.29-6.18,4.94-14.78,7.42-25.79,7.42-10.15,0-19.12-1.91-26.93-5.72v-18.73c6.42,2.86,11.85,4.88,16.29,6.05,4.44,1.17,8.51,1.76,12.2,1.76,4.42,0,7.82-.85,10.18-2.54,2.36-1.69,3.55-4.21,3.55-7.55,0-1.86-.52-3.52-1.56-4.98-1.04-1.45-2.57-2.85-4.59-4.2-2.02-1.34-6.13-3.49-12.33-6.44-5.81-2.73-10.17-5.36-13.07-7.87-2.91-2.51-5.23-5.44-6.96-8.78-1.73-3.34-2.6-7.24-2.6-11.71,0-8.41,2.85-15.03,8.55-19.84,5.7-4.81,13.58-7.22,23.64-7.22,4.94,0,9.66.59,14.15,1.76,4.49,1.17,9.18,2.82,14.08,4.94l-6.5,15.68c-5.07-2.08-9.27-3.53-12.59-4.36-3.32-.82-6.58-1.24-9.79-1.24-3.82,0-6.74.89-8.78,2.67-2.04,1.78-3.06,4.1-3.06,6.96,0,1.78.41,3.33,1.24,4.65.82,1.32,2.14,2.6,3.94,3.84,1.8,1.24,6.06,3.46,12.78,6.67,8.89,4.25,14.98,8.51,18.28,12.78,3.3,4.27,4.94,9.51,4.94,15.71Z" 
                        fill="#2563eb"
                      />
                    </g>
                  </g>
                );
              })()}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
});
export default SundialPreview;
