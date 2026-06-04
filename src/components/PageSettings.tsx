// src/components/PageSettings.tsx
import { getDisplayTiltAngle, getWallDeclinationForPreset } from '../utils/sundialMath';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StickyNote } from 'lucide-react';
import type { LineStyle } from './LineSettings';

import type { PageSize, PageOrientation as Orientation, InclineType, DeclinationType } from '../types';
export type { InclineType, DeclinationType };

/** Compass bearing in degrees (N=0, E=90, S=180, W=270). */
const DECLINATION_COMPASS_DEG: Record<Exclude<DeclinationType, 'Manual'>, number> = {
  North: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  East: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  South: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  West: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

function shortestAngularDiffDeg(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/** Presets within ±90° of default wall normal: NH → South (180°), SH → North (0°), plus Manual. */
function declinationOptionsForLatitude(latitude: number): DeclinationType[] {
  const defaultBearing = latitude >= 0 ? 180 : 0;
  const keys = Object.keys(DECLINATION_COMPASS_DEG) as Exclude<DeclinationType, 'Manual'>[];
  const allowed = keys.filter(
    (k) => shortestAngularDiffDeg(DECLINATION_COMPASS_DEG[k], defaultBearing) <= 90 + 1e-6
  );
  allowed.sort((a, b) => {
    const da = DECLINATION_COMPASS_DEG[a];
    const db = DECLINATION_COMPASS_DEG[b];
    if (defaultBearing === 180) {
      return da - db;
    }
    const sortKey = (d: number) => (d >= 270 ? d - 270 : d + 90);
    return sortKey(da) - sortKey(db);
  });
  return [...allowed, 'Manual'];
}

// Utility to convert named color to hex
function colorToHex(color: string): string {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return '#fff8dc';
  ctx.fillStyle = '#fff8dc'; // fallback
  ctx.fillStyle = color;
  // If the browser accepts the color, ctx.fillStyle will be a hex string
  const computed = ctx.fillStyle;
  // If the color is not valid, fallback to cornsilk
  if (computed === '' || computed === undefined) return '#fff8dc';
  // If already hex, return as is
  if (computed.startsWith('#')) return computed;
  // Otherwise, fallback
  return '#fff8dc';
}

export type DialShape = 'Rectangle' | 'Oval';

interface PageSettingsProps {
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  inclineType: InclineType;
  setInclineType: (type: InclineType) => void;
  tiltAngle: number;
  setTiltAngle: (angle: number) => void;
  declinationType: DeclinationType;
  setDeclinationType: (type: DeclinationType) => void;
  declinationDegrees: number;
  setDeclinationDegrees: (degrees: number) => void;
  latitude: number;
  dialOrientation: 'North' | 'South';
  setDialOrientation: (orientation: 'North' | 'South') => void;
  customWidth?: number;
  setCustomWidth?: (width: number) => void;
  customHeight?: number;
  setCustomHeight?: (height: number) => void;
  customUnits?: 'in' | 'cm';
  setCustomUnits?: (units: 'in' | 'cm') => void;
  onBorderChange: (dialShape: DialShape, borderStyle: string, margin: number) => void;
  onBackgroundChange: (showBackground: boolean, backgroundColor: string) => void;
  lineStyles: LineStyle[];
  // Props for syncing with saved/restored state
  dialShape?: DialShape;
  borderStyle?: string;
  borderMargin?: number; // in inches
  showBackground?: boolean;
  backgroundColor?: string;
  // Callback when incline type changes
  onInclineTypeChange?: () => void;
  /** When true, the inclination row is grayed out and non-interactive */
  disableInclination?: boolean;
}

const PageSettings: React.FC<PageSettingsProps> = ({
  pageSize,
  setPageSize,
  orientation,
  setOrientation,
  inclineType,
  setInclineType,
  tiltAngle,
  setTiltAngle,
  declinationType,
  setDeclinationType,
  declinationDegrees,
  setDeclinationDegrees,
  latitude,
  dialOrientation,
  setDialOrientation,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  customUnits,
  setCustomUnits,
  onBorderChange,
  onBackgroundChange,
  lineStyles,
  dialShape: dialShapeProp,
  borderStyle: borderStyleProp,
  borderMargin: borderMarginProp, // in inches
  showBackground: showBackgroundProp,
  backgroundColor: backgroundColorProp,
  onInclineTypeChange,
  disableInclination = false,
}) => {
  // State for dial shape, border and background controls
  const [dialShape, setDialShape] = useState<DialShape>(dialShapeProp ?? 'Rectangle');
  const [borderStyle, setBorderStyle] = useState<string>(borderStyleProp ?? 'default-hairline');
  const [margin, setMargin] = useState<number>(borderMarginProp ? borderMarginProp * 25.4 : 6); // Convert inches to mm
  const [showBackground, setShowBackground] = useState<boolean>(showBackgroundProp ?? true);
  const [backgroundColor, setBackgroundColor] = useState<string>(backgroundColorProp ?? 'Cornsilk');

  // Sync internal state when props change (for restore functionality)
  // Consolidate multiple useEffect hooks into a single one for better performance
  useEffect(() => {
    if (dialShapeProp !== undefined) {
      setDialShape(dialShapeProp);
    }
    if (borderStyleProp !== undefined) {
      setBorderStyle(borderStyleProp);
    }
    if (borderMarginProp !== undefined) {
      setMargin(borderMarginProp * 25.4); // Convert inches to mm
    }
    if (showBackgroundProp !== undefined) {
      setShowBackground(showBackgroundProp);
    }
    if (backgroundColorProp !== undefined) {
      setBackgroundColor(backgroundColorProp);
    }
  }, [dialShapeProp, borderStyleProp, borderMarginProp, showBackgroundProp, backgroundColorProp]);

  // Note: customWidth, customHeight, and customUnits are used directly from props
  // via getDisplayWidth() and getDisplayHeight(), so they don't need useEffect hooks.
  // However, we need to ensure the component re-renders when these props change.
  // React will handle this automatically since they're used in the render.

  // State for increment/decrement step values
  const [inclinationStep, setInclinationStep] = useState<number>(1.0);
  const [declinationStep, setDeclinationStep] = useState<number>(1.0);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;

  // Dial Facing (North/South) is only for flat horizontal dials — same ~0.05° threshold as incline labeling
  const dialFacingEnabled = inclineType === 'Horizontal' && Math.abs(tiltAngle) < 0.05;

  /** Wall / dial-plane declination is undefined for a horizontal dial (0° inclination). */
  const declinationControlsDisabled =
    inclineType === 'Horizontal' || Math.abs(tiltAngle) < 0.05;
  const declinationDisabledTitle = 'Inclined Dials Only';

  const defaultDeclinationType: DeclinationType = latitude >= 0 ? 'South' : 'North';
  const declinationOffDefault = declinationType !== defaultDeclinationType;

  const declinationSelectOptions = useMemo(
    () => declinationOptionsForLatitude(latitude),
    [latitude]
  );

  useEffect(() => {
    if (declinationType === 'Manual') return;
    if (!declinationSelectOptions.includes(declinationType)) {
      setDeclinationType(defaultDeclinationType);
    }
  }, [declinationType, declinationSelectOptions, defaultDeclinationType, setDeclinationType]);

  /** Preset/auto inclines track declination; switching decline should freeze tilt as Manual.
   *  Cancer and Capricorn are excluded — they re-adjust tilt automatically via App useEffect. */
  const switchInclineToManualWhenDeclinationChanges = useCallback(() => {
    if (inclineType === 'Cancer' || inclineType === 'Capricorn') return;
    if (inclineType !== 'Manual') {
      setInclineType('Manual');
      onInclineTypeChange?.();
    }
  }, [inclineType, setInclineType, onInclineTypeChange]);

  // Create reordered incline options for Southern hemisphere
  const inclineOptions = useMemo(() => {
    if (latitude < 0) {
      // Southern hemisphere
      return [
        { value: 'Horizontal', label: 'Horizontal' },
        { value: 'Capricorn', label: 'Capricorn' },
        { value: 'Polar', label: 'Polar' },
        { value: 'Cancer', label: 'Cancer' },
        { value: 'Vertical', label: 'Vertical' },
        { value: 'Manual', label: 'Manual' },
      ];
    }
    // Northern hemisphere: original order
    return [
      { value: 'Horizontal', label: 'Horizontal' },
      { value: 'Cancer', label: 'Cancer' },
      { value: 'Polar', label: 'Polar' },
      { value: 'Capricorn', label: 'Capricorn' },
      { value: 'Vertical', label: 'Vertical' },
      { value: 'Manual', label: 'Manual' },
    ];
  }, [latitude]);

  const handleInclineTypeChange = (newType: InclineType) => {
    setInclineType(newType);
    // Preset horizontal dial is 0°; other presets derive angle from latitude / type
    if (newType === 'Horizontal') {
      setTiltAngle(0);
      // Dial-plane declination is not used on a horizontal dial; snap back to hemisphere default
      setDeclinationType(defaultDeclinationType);
      setDeclinationDegrees(
        getWallDeclinationForPreset(defaultDeclinationType, 0, latitude)
      );
    } else if (newType !== 'Manual') {
      const newAngle = getDisplayTiltAngle(newType, latitude, tiltAngle);
      setTiltAngle(newAngle);
    }
    // Trigger callback to reset gnomon position mode to auto
    if (onInclineTypeChange) {
      onInclineTypeChange();
    }
  };

  /** Preset canonical tilt (degrees, 0–90); tiltAngle argument ignored for fixed presets. */
  const presetInclineDegrees = (type: InclineType): number =>
    getDisplayTiltAngle(type, latitude, 0);

  const handleInclineDegreesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(90, Math.max(0, parseFloat(e.target.value) || 0));
    setTiltAngle(val);
    // Same ~0° threshold as declination disable: flat dial → default declination for when tilt increases again
    if (Math.abs(val) < 0.05) {
      setDeclinationType(defaultDeclinationType);
      setDeclinationDegrees(
        getWallDeclinationForPreset(defaultDeclinationType, 0, latitude)
      );
    }
    if (inclineType === 'Manual') return;
    // Cancer/Capricorn: compare against current tiltAngle (already declination-adjusted);
    // any genuine change switches to Manual.
    if (inclineType === 'Cancer' || inclineType === 'Capricorn') {
      if (Math.abs(val - tiltAngle) > 0.01) {
        setInclineType('Manual');
        if (onInclineTypeChange) onInclineTypeChange();
      }
      return;
    }
    if (Math.abs(val - presetInclineDegrees(inclineType)) > 0.01) {
      setInclineType('Manual');
      if (onInclineTypeChange) onInclineTypeChange();
    }
  };

  // Handler functions for dial shape and border controls
  const handleDialShapeChange = (newShape: DialShape) => {
    setDialShape(newShape);
    onBorderChange(newShape, borderStyle, margin);
  };

  const handleMarginChange = (newMargin: number) => {
    setMargin(newMargin);
    onBorderChange(dialShape, borderStyle, newMargin);
  };

  const handleBorderStyleChange = (newStyle: string) => {
    setBorderStyle(newStyle);
    onBorderChange(dialShape, newStyle, margin);
  };

  const handleBackgroundChange = (checked: boolean) => {
    setShowBackground(checked);
    onBackgroundChange(checked, backgroundColor);
  };

  const handleBackgroundColorChange = (newColor: string) => {
    setBackgroundColor(newColor);
    onBackgroundChange(showBackground, newColor);
  };



  // Generic unit conversion helpers (consolidated from duplicate functions)
  const toMillimeters = (value: number, units: 'in' | 'cm'): number => {
    return units === 'in' ? value * 25.4 : value * 10; // inches to mm OR cm to mm
  };

  const fromMillimeters = (value: number, units: 'in' | 'cm'): number => {
    return units === 'in' ? value / 25.4 : value / 10; // mm to inches OR mm to cm
  };

  // Handle dimension change with unit conversion
  const handleDimensionChange = (value: number, setter: ((width: number) => void) | undefined) => {
    if (!setter) return;
    setter(toMillimeters(value, customUnits ?? 'in'));
  };

  // Get display value in current units
  const getDisplayValue = (value: number | undefined): number => {
    if (!value) return 0;
    return fromMillimeters(value, customUnits ?? 'in');
  };

  // Handle units toggle with conversion
  const handleUnitsToggle = (newUnits: 'in' | 'cm') => {
    if (!setCustomUnits || customUnits === newUnits) return;

    // Only change the display units, don't modify the stored millimeter values
    setCustomUnits(newUnits);
  };

  // Note: getDisplayValue() helper is defined above (replaces getDisplayWidth/getDisplayHeight)

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><StickyNote color="#2563eb" size={20} style={{ marginRight: 6 }} /> Page Settings</h3>
      </div>
      <div className="card-content">
        {/* First row: Page Size and Orientation */}
        <div
          className="form-row"
          style={{
            display: 'flex',
            alignItems: 'end',
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: 'row'
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Page Size</label>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              style={{ minWidth: isMobile ? '80px' : 'auto' }}
            >
              <option value="Letter">Letter</option>
              <option value="A4">A4</option>
              <option value="11x17">11x17 inch</option>
              <option value="10x15cm Postcard">4x6 Post.</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Orientation</label>
            <select
              className="form-select"
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as Orientation)}
              style={{ minWidth: isMobile ? '80px' : 'auto' }}
            >
              <option value="Landscape">Landscape</option>
              <option value="Portrait">Portrait</option>
            </select>
          </div>
        </div>

        {/* Custom size controls - only show when Custom is selected */}
        {pageSize === 'Custom' && (
          <div
            className="form-row"
            style={{
              display: 'flex',
              alignItems: 'end',
              gap: isMobile ? '0.5rem' : '1rem',
              flexDirection: 'row',
              marginTop: isMobile ? '8px' : '0'
            }}
          >
            <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
              <label className="form-label">Width</label>
              <input
                type="number"
                className="form-input"
                value={getDisplayValue(customWidth)}
                onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 0, setCustomWidth)}
                min={0.1}
                step={0.1}
                style={{ width: isMobile ? '60px' : '80px' }}
              />
            </div>
            <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
              <label className="form-label">Height</label>
              <input
                type="number"
                className="form-input"
                value={getDisplayValue(customHeight)}
                onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 0, setCustomHeight)}
                min={0.1}
                step={0.1}
                style={{ width: isMobile ? '60px' : '80px' }}
              />
            </div>
            <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : 'auto' }}>
              <label className="form-label">Units</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleUnitsToggle('in')}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: customUnits === 'in' ? '#2563eb' : '#ffffff',
                    color: customUnits === 'in' ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: customUnits === 'in' ? 'bold' : 'normal'
                  }}
                >
                  in
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitsToggle('cm')}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: customUnits === 'cm' ? '#2563eb' : '#ffffff',
                    color: customUnits === 'cm' ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: customUnits === 'cm' ? 'bold' : 'normal'
                  }}
                >
                  cm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Second row: Inclination and Degrees */}
        <div style={disableInclination ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
        <div
          className="form-row"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: 'row',
            marginTop: isMobile ? '8px' : '0'
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Inclination</label>
            <select
              className="form-select"
              value={inclineType}
              onChange={(e) => handleInclineTypeChange(e.target.value as InclineType)}
              style={{
                minWidth: isMobile ? '80px' : 'auto',
                backgroundColor: inclineType !== 'Horizontal' ? '#dbeafe' : undefined,
              }}
            >
              {inclineOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Degrees</label>
            <input
              type="number"
              className="form-input"
              value={tiltAngle.toFixed(1)}
              onChange={handleInclineDegreesChange}
              min={0}
              max={90}
              step={inclinationStep}
              style={{
                width: isMobile ? '70px' : '80px',
              }}
            />
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Inc/Dec</label>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: isMobile ? '0.75rem' : '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="inclinationStep"
                  value="1.0"
                  checked={inclinationStep === 1.0}
                  onChange={() => setInclinationStep(1.0)}
                  style={{ cursor: 'pointer' }}
                />
                1.0
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: isMobile ? '0.75rem' : '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="inclinationStep"
                  value="0.1"
                  checked={inclinationStep === 0.1}
                  onChange={() => setInclinationStep(0.1)}
                  style={{ cursor: 'pointer' }}
                />
                0.1
              </label>
            </div>
          </div>
        </div>
        </div>

        {/* Third row: Declination and Degrees (disabled when dial is horizontal / 0° inclination) */}
        <div
          className="form-row"
          title={declinationControlsDisabled ? declinationDisabledTitle : undefined}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: 'row',
            marginTop: isMobile ? '8px' : '0',
            opacity: declinationControlsDisabled ? 0.55 : 1,
            cursor: declinationControlsDisabled ? 'not-allowed' : undefined,
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label
              className="form-label"
              title={declinationControlsDisabled ? declinationDisabledTitle : undefined}
            >
              Declination
            </label>
            <select
              className="form-select"
              disabled={declinationControlsDisabled}
              value={declinationType}
              onChange={(e) => {
                setDeclinationType(e.target.value as DeclinationType);
                switchInclineToManualWhenDeclinationChanges();
              }}
              style={{
                minWidth: isMobile ? '80px' : 'auto',
                backgroundColor: declinationControlsDisabled
                  ? undefined
                  : declinationOffDefault
                    ? '#dbeafe'
                    : undefined,
                cursor: declinationControlsDisabled ? 'not-allowed' : undefined,
              }}
            >
              {declinationSelectOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label
              className="form-label"
              title={declinationControlsDisabled ? declinationDisabledTitle : undefined}
            >
              Degrees
            </label>
            <input
              type="number"
              className="form-input"
              disabled={declinationControlsDisabled}
              value={declinationDegrees.toFixed(1)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  setDeclinationDegrees(val);
                  if (declinationType !== 'Manual') setDeclinationType('Manual');
                  switchInclineToManualWhenDeclinationChanges();
                }
              }}
              min={-180}
              max={180}
              step={declinationStep}
              style={{
                width: isMobile ? '70px' : '80px',
                cursor: declinationControlsDisabled ? 'not-allowed' : undefined,
              }}
            />
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label
              className="form-label"
              style={{ marginBottom: '0.5rem' }}
              title={declinationControlsDisabled ? declinationDisabledTitle : undefined}
            >
              Inc/Dec
            </label>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <label
                title={declinationControlsDisabled ? declinationDisabledTitle : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  whiteSpace: 'nowrap',
                  cursor: declinationControlsDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="declinationStep"
                  value="1.0"
                  disabled={declinationControlsDisabled}
                  checked={declinationStep === 1.0}
                  onChange={() => setDeclinationStep(1.0)}
                  style={{ cursor: declinationControlsDisabled ? 'not-allowed' : 'pointer' }}
                />
                1.0
              </label>
              <label
                title={declinationControlsDisabled ? declinationDisabledTitle : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  whiteSpace: 'nowrap',
                  cursor: declinationControlsDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="declinationStep"
                  value="0.1"
                  disabled={declinationControlsDisabled}
                  checked={declinationStep === 0.1}
                  onChange={() => setDeclinationStep(0.1)}
                  style={{ cursor: declinationControlsDisabled ? 'not-allowed' : 'pointer' }}
                />
                0.1
              </label>
            </div>
          </div>
        </div>

        {/* Dial Orientation row */}
        <div
          className="form-row"
          style={{
            display: 'flex',
            alignItems: 'end',
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: 'row',
            marginTop: '0.5rem'
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : 'auto' }}>
            <label className="form-label">Dial Facing</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: !dialFacingEnabled ? '#9ca3af' : (dialOrientation === 'North' ? '#2563eb' : '#6b7280') }}>North</span>
              <button
                type="button"
                onClick={() => dialFacingEnabled && setDialOrientation(dialOrientation === 'North' ? 'South' : 'North')}
                disabled={!dialFacingEnabled}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: !dialFacingEnabled ? '#d1d5db' : (dialOrientation === 'South' ? '#2563eb' : '#d1d5db'),
                  cursor: !dialFacingEnabled ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  opacity: !dialFacingEnabled ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: dialOrientation === 'South' ? '23px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}
                />
              </button>
              <span style={{ fontSize: '14px', color: !dialFacingEnabled ? '#9ca3af' : (dialOrientation === 'South' ? '#2563eb' : '#6b7280') }}>South</span>
              {!dialFacingEnabled && (
                <span style={{ fontSize: '12px', color: '#dc2626', marginLeft: '8px' }}>
                  Horizontal dials only.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* New combined row: Dial Shape, Border Style, and Margin */}
        <div
          className="form-row"
          style={{
            display: 'flex',
            alignItems: 'end',
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: 'row',
            marginTop: '0.5rem'
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : 'auto' }}>
            <label className="form-label">Dial Shape</label>
            <select
              className="form-select"
              value={dialShape}
              onChange={(e) => handleDialShapeChange(e.target.value as DialShape)}
              style={{ minWidth: isMobile ? '80px' : 'auto' }}
            >
              <option value="Rectangle">Rectangle</option>
              <option value="Oval">Oval</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '1' : 'auto' }}>
            <label className="form-label">Border Style</label>
            <select
              className="form-select"
              value={borderStyle}
              onChange={(e) => handleBorderStyleChange(e.target.value)}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <option value="none">None</option>
              {lineStyles.filter(s => s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('border'))).map(style => (
                <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : 'auto' }}>
            <label className="form-label">Margin (mm)</label>
            <input
              type="number"
              className="form-input"
              min={1}
              max={50}
              step={1}
              value={margin}
              onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 6)}
              style={{ width: isMobile ? '60px' : '60px' }}
            />
          </div>
        </div>

        {/* Page Background row - responsive layout */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-checkbox" style={{
              display: 'flex',
              gap: '0.5rem',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={showBackground}
                  onChange={(e) => handleBackgroundChange(e.target.checked)}
                />
                <span>Page Background</span>
              </div>
              {showBackground && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: isMobile ? '0.5rem' : '0',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <input
                    type="text"
                    className="form-input"
                    value={backgroundColor}
                    onChange={(e) => handleBackgroundColorChange(e.target.value)}
                    style={{
                      width: isMobile ? '100%' : '80px',
                      fontSize: '0.9rem',
                      flex: isMobile ? 1 : 'auto'
                    }}
                    placeholder="Cornsilk"
                    title="Enter color name or hex value"
                  />
                  <input
                    type="color"
                    value={colorToHex(backgroundColor)}
                    onChange={(e) => handleBackgroundColorChange(e.target.value)}
                    style={{
                      width: '30px',
                      height: '30px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title="Click to pick color"
                  />
                </div>
              )}
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PageSettings;
