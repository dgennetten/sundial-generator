// src/components/PageSettings.tsx
import React, { useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';
import type { LineStyle } from './LineSettings';

type PageSize = 'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom';
type Orientation = 'Landscape' | 'Portrait';
export type InclineType = 'Horizontal' | 'Cancer' | 'Polar' | 'Capricorn' | 'Vertical' | 'Manual';
export type DeclinationType = 'North' | 'Northeast' | 'Northwest' | 'East' | 'West' | 'Southeast' | 'Southwest' | 'South' | 'Manual';
type DialFacing = 'North' | 'South';

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
  dialFacing: DialFacing;
  setDialFacing: (facing: DialFacing) => void;
  customWidth?: number;
  setCustomWidth?: (width: number) => void;
  customHeight?: number;
  setCustomHeight?: (height: number) => void;
  customUnits?: 'in' | 'cm';
  setCustomUnits?: (units: 'in' | 'cm') => void;
  onBorderChange: (dialShape: DialShape, borderStyle: string, margin: number) => void;
  onBackgroundChange: (showBackground: boolean, backgroundColor: string) => void;
  lineStyles: LineStyle[];
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
  dialFacing,
  setDialFacing,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  customUnits,
  setCustomUnits,
  onBorderChange,
  onBackgroundChange,
  lineStyles,
}) => {
  // State for dial shape, border and background controls
  const [dialShape, setDialShape] = useState<DialShape>('Rectangle');
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');
  const [margin, setMargin] = useState<number>(6); // in mm
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('Cornsilk');

  // State for increment/decrement step values
  const [inclinationStep, setInclinationStep] = useState<number>(1.0);
  const [declinationStep, setDeclinationStep] = useState<number>(1.0);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  // Helper functions for tropical calculations
  const isInTropics = (lat: number): boolean => {
    return Math.abs(lat) <= 23.4367; // Tropic of Cancer/Capricorn
  };

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

  // Calculate effective tilt angle
  const getEffectiveTiltAngle = () => {
    const result = (() => {
      switch (inclineType) {
        case 'Horizontal': return 0;
        case 'Cancer': return getCancerIncline(latitude);
        case 'Polar': return Math.abs(latitude);
        case 'Capricorn': return getCapricornIncline(latitude);
        case 'Vertical': return 90;
        case 'Manual': return tiltAngle;
        default: return 0;
      }
    })();

    // Ensure we return a valid number
    return isNaN(result) ? 0 : result;
  };

  const handleInclineTypeChange = (newType: InclineType) => {
    setInclineType(newType);
    // Update tilt angle when changing from Manual to another type
    if (newType !== 'Manual') {
      const newAngle = newType === 'Horizontal' ? 0 :
        newType === 'Cancer' ? getCancerIncline(latitude) :
          newType === 'Polar' ? latitude :
            newType === 'Capricorn' ? getCapricornIncline(latitude) :
              newType === 'Vertical' ? 90 : tiltAngle;
      setTiltAngle(newAngle);
    }
  };

  const handleDialFacingToggle = () => {
    setDialFacing(dialFacing === 'North' ? 'South' : 'North');
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



  // Handle width change with unit conversion
  const handleWidthChange = (value: number) => {
    if (!setCustomWidth) return;

    // Convert the input value to millimeters (internal storage)
    let widthInMm: number;
    if (customUnits === 'in') {
      widthInMm = value * 25.4; // inches to mm
    } else {
      widthInMm = value * 10; // cm to mm
    }

    // Store the value in mm internally, but display in the current units
    setCustomWidth(widthInMm);
  };

  // Handle height change with unit conversion
  const handleHeightChange = (value: number) => {
    if (!setCustomHeight) return;

    // Convert the input value to millimeters (internal storage)
    let heightInMm: number;
    if (customUnits === 'in') {
      heightInMm = value * 25.4; // inches to mm
    } else {
      heightInMm = value * 10; // cm to mm
    }

    // Store the value in mm internally, but display in the current units
    setCustomHeight(heightInMm);
  };

  // Handle units toggle with conversion
  const handleUnitsToggle = (newUnits: 'in' | 'cm') => {
    if (!setCustomUnits || customUnits === newUnits) return;

    // Only change the display units, don't modify the stored millimeter values
    setCustomUnits(newUnits);
  };

  // Get display values in current units
  const getDisplayWidth = (): number => {
    if (!customWidth) return 0;
    if (customUnits === 'in') {
      return customWidth / 25.4; // mm to inches
    } else {
      return customWidth / 10; // mm to cm
    }
  };

  const getDisplayHeight = (): number => {
    if (!customHeight) return 0;
    if (customUnits === 'in') {
      return customHeight / 25.4; // mm to inches
    } else {
      return customHeight / 10; // mm to cm
    }
  };

  // Determine if dial facing should be locked and what direction it should be
  const getDialFacingLockInfo = () => {
    const isOutsideTropics = !isInTropics(latitude);
    const isNotHorizontal = inclineType !== 'Horizontal';

    if (isOutsideTropics && isNotHorizontal) {
      return {
        isLocked: true,
        // Northern hemisphere: sun is in southern sky, so dial must face South
        // Southern hemisphere: sun is in northern sky, so dial must face North
        requiredDirection: latitude > 0 ? 'South' : 'North',
        showNotice: true
      };
    }

    return {
      isLocked: false,
      requiredDirection: dialFacing,
      showNotice: false
    };
  };

  const dialFacingLockInfo = getDialFacingLockInfo();

  // Auto-set dial facing when outside tropics and not horizontal
  useEffect(() => {
    const isOutsideTropics = !isInTropics(latitude);
    const isNotHorizontal = inclineType !== 'Horizontal';

    if (isOutsideTropics && isNotHorizontal) {
      // Northern hemisphere: sun is in southern sky, so dial must face South
      // Southern hemisphere: sun is in northern sky, so dial must face North
      const requiredDirection = latitude > 0 ? 'South' : 'North';
      if (dialFacing !== requiredDirection) {
        setDialFacing(requiredDirection);
      }
    }
  }, [latitude, inclineType, dialFacing, setDialFacing]);

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
                value={getDisplayWidth()}
                onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
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
                value={getDisplayHeight()}
                onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
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
              style={{ minWidth: isMobile ? '80px' : 'auto' }}
            >
              <option value="Horizontal">Horizontal</option>
              <option value="Cancer">Cancer</option>
              <option value="Polar">Polar</option>
              <option value="Capricorn">Capricorn</option>
              <option value="Vertical">Vertical</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Degrees</label>
            <input
              type="number"
              className="form-input"
              value={inclineType === 'Manual' ? tiltAngle.toFixed(1) : getEffectiveTiltAngle().toFixed(1)}
              onChange={(e) => setTiltAngle(parseFloat(e.target.value) || 0)}
              disabled={inclineType !== 'Manual'}
              min={0}
              max={90}
              step={inclinationStep}
              style={{
                width: isMobile ? '70px' : '80px',
                backgroundColor: inclineType !== 'Manual' ? '#f7fafc' : undefined,
                color: inclineType !== 'Manual' ? '#a0aec0' : undefined
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

        {/* Third row: Declination and Degrees */}
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
            <label className="form-label">Declination</label>
            <select
              className="form-select"
              value={declinationType}
              onChange={(e) => setDeclinationType(e.target.value as DeclinationType)}
              style={{ minWidth: isMobile ? '80px' : 'auto' }}
            >
              <option value="North">North</option>
              <option value="Northeast">Northeast</option>
              <option value="Northwest">Northwest</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Southeast">Southeast</option>
              <option value="Southwest">Southwest</option>
              <option value="South">South</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Degrees</label>
            <input
              type="number"
              className="form-input"
              value={declinationDegrees.toFixed(1)}
              onChange={(e) => setDeclinationDegrees(parseFloat(e.target.value) || 0)}
              disabled={declinationType !== 'Manual'}
              min={0}
              max={90}
              step={declinationStep}
              style={{
                width: isMobile ? '70px' : '80px',
                backgroundColor: declinationType !== 'Manual' ? '#f7fafc' : undefined,
                color: declinationType !== 'Manual' ? '#a0aec0' : undefined
              }}
            />
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Inc/Dec</label>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: isMobile ? '0.75rem' : '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="declinationStep"
                  value="1.0"
                  checked={declinationStep === 1.0}
                  onChange={() => setDeclinationStep(1.0)}
                  style={{ cursor: 'pointer' }}
                />
                1.0
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: isMobile ? '0.75rem' : '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="declinationStep"
                  value="0.1"
                  checked={declinationStep === 0.1}
                  onChange={() => setDeclinationStep(0.1)}
                  style={{ cursor: 'pointer' }}
                />
                0.1
              </label>
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

        <div
          className="form-row"
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '1rem'
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : 'auto' }}>
            <label className="form-label">Dial Facing (NOTE: will be removed when Declination is implemented above!)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px' }}>
              <span style={{
                fontSize: '14px',
                color: dialFacingLockInfo.showNotice ? '#9ca3af' : (dialFacingLockInfo.requiredDirection === 'North' ? '#2563eb' : '#6b7280')
              }}>North</span>
              <button
                type="button"
                onClick={handleDialFacingToggle}
                disabled={dialFacingLockInfo.isLocked}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: dialFacingLockInfo.showNotice ? '#e5e7eb' : (dialFacingLockInfo.requiredDirection === 'South' ? '#2563eb' : '#d1d5db'),
                  cursor: dialFacingLockInfo.isLocked ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  opacity: dialFacingLockInfo.isLocked ? 0.6 : 1
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
                    left: dialFacingLockInfo.requiredDirection === 'South' ? '23px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}
                />
              </button>
              <span style={{
                fontSize: '14px',
                color: dialFacingLockInfo.showNotice ? '#9ca3af' : (dialFacingLockInfo.requiredDirection === 'South' ? '#2563eb' : '#6b7280')
              }}>South</span>
              {dialFacingLockInfo.showNotice && (
                <span style={{ fontSize: '12px', color: '#dc2626', marginLeft: '8px' }}>
                  Inclined dials must face toward solar path.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSettings;
