// src/components/GnomonSettings.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getAnalemmaPointsProjected } from '../utils/analemmaGenerator';
import { calculateAutoGnomonHeight as calcAutoHeight } from '../utils/sundialMath';
import { MoveUpRight } from 'lucide-react';

type Mode = 'auto' | 'manual';
type GnomonType = 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north' | 'crosshair-with-height' | 'glued-popup-base';
type PositionMode = 'auto' | 'manual';

interface Props {
  mode: Mode;
  height: number;
  latitude: number;
  longitude: number;
  tzMeridian: number;
  pageHeight: number;
  pageWidth: number;
  gnomonType: GnomonType;
  positionMode?: PositionMode;
  position?: number;
  horizontalPosition?: number;
  dialInclination?: number;
  dialDeclination?: number;
  /** When true (declination preset / grayed or declination zero), auto horizontal stays at center */
  lockHorizontalToCenter?: boolean;
  onChange: (values: { mode: Mode; height: number; gnomonType: GnomonType; positionMode?: PositionMode; position?: number; horizontalPosition?: number }) => void;
}

const GnomonSettings: React.FC<Props> = ({
  mode,
  height,
  latitude,
  longitude,
  tzMeridian,
  pageHeight,
  pageWidth,
  gnomonType,
  positionMode: propPositionMode,
  position: propPosition,
  horizontalPosition: propHorizontalPosition,
  dialInclination = 0,
  dialDeclination = 0,
  lockHorizontalToCenter = false,
  onChange,
}) => {

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  const [autoHeight, setAutoHeight] = useState<number>(0);
  const [positionMode, setPositionMode] = useState<PositionMode>(propPositionMode || 'auto');
  const [manualPosition, setManualPosition] = useState<number>(propPosition || 0);
  const [manualHorizontalPosition, setManualHorizontalPosition] = useState<number>(propHorizontalPosition ?? Math.round(pageWidth / 2));
  const [autoPosition, setAutoPosition] = useState<number>(0);
  const userInitiatedChangeRef = useRef<boolean>(false);

  // Function to calculate gnomon height based on winter-to-summer solstice distance
  const calculateAutoGnomonHeight = (lat: number, lng: number, tz: number, pageH: number): number =>
    calcAutoHeight(lat, lng, tz, pageH, dialInclination, dialDeclination);

  // Calculate gnomon position so the noon analemma is centered on the page (vertical and horizontal)
  const calculateAutoGnomonPosition = useCallback((pageW: number, pageH: number): { vertical: number; horizontal: number } => {
    const noonPoints = getAnalemmaPointsProjected({
      lat: latitude,
      lng: longitude,
      tzMeridian: tzMeridian,
      hour: 12,
      styleHeight: autoHeight || height,
      dialInclination,
      dialDeclination,
    });
    if (!noonPoints.length) {
      return { vertical: Math.round(pageH * 0.2), horizontal: Math.round(pageW / 2) };
    }
    const xVals = noonPoints.map(p => p.x);
    const yVals = noonPoints.map(p => p.y);
    const centerX = (Math.min(...xVals) + Math.max(...xVals)) / 2;
    const centerY = (Math.min(...yVals) + Math.max(...yVals)) / 2;
    return {
      vertical: Math.round(pageH / 2 - centerY),
      horizontal: Math.round(pageW / 2 - centerX),
    };
  }, [latitude, longitude, tzMeridian, autoHeight, height, dialInclination, dialDeclination]);

  // Restore effect for autoHeight calculation
  useEffect(() => {
    if (mode === 'auto') {
      const computed = calculateAutoGnomonHeight(latitude, longitude, tzMeridian, pageHeight);
      setAutoHeight(computed);
    }
  }, [mode, latitude, longitude, tzMeridian, pageHeight, gnomonType, dialInclination, dialDeclination]);

  useEffect(() => {
    const { vertical: autoPos, horizontal: autoHPos } = calculateAutoGnomonPosition(pageWidth, pageHeight);
    setAutoPosition(autoPos);
    const horizontalForAuto = lockHorizontalToCenter ? Math.round(pageWidth / 2) : autoHPos;
    if (positionMode === 'auto') {
      setManualPosition(autoPos);
      setManualHorizontalPosition(horizontalForAuto);
    }
    if (propPositionMode === undefined || positionMode === propPositionMode) {
      if (positionMode === 'auto') {
        onChange({ mode, height, gnomonType, positionMode, position: autoPos, horizontalPosition: horizontalForAuto });
      } else {
        onChange({ mode, height, gnomonType, positionMode, position: manualPosition, horizontalPosition: manualHorizontalPosition });
      }
    }
  }, [mode, height, latitude, longitude, tzMeridian, pageHeight, pageWidth, gnomonType, positionMode, manualPosition, manualHorizontalPosition, propPositionMode, lockHorizontalToCenter, calculateAutoGnomonPosition, onChange]);

  // Sync local positionMode state with prop when it changes (only if different)
  // Skip sync if user just made a change (to prevent reverting user's selection)
  useEffect(() => {
    if (userInitiatedChangeRef.current) {
      userInitiatedChangeRef.current = false;
      return;
    }
    if (propPositionMode !== undefined && propPositionMode !== positionMode) {
      setPositionMode(propPositionMode);
    }
  }, [propPositionMode, positionMode]);

  // Sync local manualPosition state with prop when it changes (e.g. during restore)
  useEffect(() => {
    if (propPosition !== undefined && propPosition !== manualPosition) {
      setManualPosition(propPosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propPosition]);

  useEffect(() => {
    if (propHorizontalPosition !== undefined && propHorizontalPosition !== manualHorizontalPosition) {
      setManualHorizontalPosition(propHorizontalPosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propHorizontalPosition]);

  // No effect needed for auto->manual height initialization.
  // The toggle handler (below) passes autoHeight when switching to manual.

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><MoveUpRight color="#2563eb" size={20} style={{marginRight: 6}} /> Gnomon Settings</h3>
      </div>
      <div className="card-content">
        {/* Type dropdown on its own line */}
        <div className="form-row">
          <div className="form-group" style={{ width: isMobile ? '100%' : 'auto' }}>
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={gnomonType}
              onChange={(e) =>
                onChange({
                  mode,
                  height,
                  gnomonType: e.target.value as GnomonType,
                  positionMode,
                  position: manualPosition,
                  horizontalPosition: positionMode === 'manual' ? manualHorizontalPosition : undefined,
                })
              }
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <option value="crosshair">Crosshair</option>
              <option value="crosshair-with-north">Crosshair + North Pt</option>
              <option value="crosshair-with-height">Crosshair + Height</option>
              <option value="popup">Popup</option>
              <option value="popup-with-brace">Popup with Brace</option>
              <option value="glued-popup-base">Glued Popup Base</option>
            </select>
          </div>
        </div>

        {/* Height and Position toggles on one line */}
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
            <label className="form-label">Height</label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              marginTop: '0.25rem'
            }}>
              <span style={{ 
                fontSize: '0.875rem', 
                color: mode === 'auto' ? '#2563eb' : '#9ca3af',
                fontWeight: mode === 'auto' ? '600' : '400',
                transition: 'all 0.2s'
              }}>Auto</span>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '44px',
                height: '24px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={mode === 'manual'}
                  onChange={(e) => {
                    const newMode = e.target.checked ? 'manual' : 'auto';
                    onChange({
                      mode: newMode,
                      height: newMode === 'manual' ? (autoHeight || height) : height,
                      gnomonType,
                      positionMode,
                      position: manualPosition,
                      horizontalPosition: positionMode === 'manual' ? manualHorizontalPosition : undefined,
                    });
                  }}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: mode === 'manual' ? '#2563eb' : '#cbd5e0',
                  borderRadius: '24px',
                  transition: 'background-color 0.3s',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: mode === 'manual' ? '22px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
              <span style={{ 
                fontSize: '0.875rem', 
                color: mode === 'manual' ? '#2563eb' : '#9ca3af',
                fontWeight: mode === 'manual' ? '600' : '400',
                transition: 'all 0.2s'
              }}>Manual</span>
            </div>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Position</label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              marginTop: '0.25rem'
            }}>
              <span style={{ 
                fontSize: '0.875rem', 
                color: positionMode === 'auto' ? '#2563eb' : '#9ca3af',
                fontWeight: positionMode === 'auto' ? '600' : '400',
                transition: 'all 0.2s'
              }}>Auto</span>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '44px',
                height: '24px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={positionMode === 'manual'}
                  onChange={e => {
                    const newPositionMode = e.target.checked ? 'manual' : 'auto';
                    userInitiatedChangeRef.current = true;
                    setPositionMode(newPositionMode);
                    // Immediately update parent to prevent sync useEffect from reverting
                    onChange({
                      mode,
                      height,
                      gnomonType,
                      positionMode: newPositionMode,
                      position: manualPosition,
                      horizontalPosition: newPositionMode === 'manual' ? manualHorizontalPosition : undefined,
                    });
                  }}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: positionMode === 'manual' ? '#2563eb' : '#cbd5e0',
                  borderRadius: '24px',
                  transition: 'background-color 0.3s',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: positionMode === 'manual' ? '22px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
              <span style={{ 
                fontSize: '0.875rem', 
                color: positionMode === 'manual' ? '#2563eb' : '#9ca3af',
                fontWeight: positionMode === 'manual' ? '600' : '400',
                transition: 'all 0.2s'
              }}>Manual</span>
            </div>
          </div>
        </div>

        {/* Manual controls: when both Height and Position are manual, all three on one line; otherwise separate rows */}
        {mode === 'manual' && positionMode === 'manual' && (
          <div
            className="form-row"
            style={{
              display: 'flex',
              alignItems: 'end',
              gap: isMobile ? '0.35rem' : '0.75rem',
              flexWrap: 'nowrap',
            }}
          >
            <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
              <label className="form-label">Height (mm)</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={300}
                step={1}
                value={height}
                onChange={(e) =>
                  onChange({
                    mode,
                    height: parseFloat(e.target.value),
                    gnomonType,
                    positionMode,
                    position: manualPosition,
                    horizontalPosition: manualHorizontalPosition,
                  })
                }
                style={{ width: '100%', minWidth: 0 }}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
              <label className="form-label">Vertical Pos. (mm)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={pageHeight}
                step={1}
                value={manualPosition}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setManualPosition(val);
                  onChange({
                    mode,
                    height,
                    gnomonType,
                    positionMode,
                    position: val,
                    horizontalPosition: manualHorizontalPosition,
                  });
                }}
                style={{ width: '100%', minWidth: 0 }}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
              <label className="form-label">Horizontal Pos. (mm)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={pageWidth}
                step={1}
                value={manualHorizontalPosition}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setManualHorizontalPosition(val);
                  onChange({
                    mode,
                    height,
                    gnomonType,
                    positionMode,
                    position: manualPosition,
                    horizontalPosition: val,
                  });
                }}
                style={{ width: '100%', minWidth: 0 }}
              />
            </div>
          </div>
        )}
        {mode === 'manual' && positionMode !== 'manual' && (
          <div className="form-group">
            <label className="form-label">Height (mm)</label>
            <input
              type="number"
              className="form-input"
              min={1}
              max={300}
              step={1}
              value={height}
              onChange={(e) =>
                onChange({
                  mode,
                  height: parseFloat(e.target.value),
                  gnomonType,
                  positionMode,
                  position: manualPosition,
                  horizontalPosition: undefined,
                })
              }
            />
          </div>
        )}
        {positionMode === 'manual' && mode !== 'manual' && (
          <div
            className="form-row"
            style={{
              display: 'flex',
              alignItems: 'end',
              gap: isMobile ? '0.35rem' : '0.75rem',
              flexWrap: 'nowrap',
            }}
          >
            <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
              <label className="form-label">Vertical Pos. (mm)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={pageHeight}
                step={1}
                value={manualPosition}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setManualPosition(val);
                  onChange({
                    mode,
                    height,
                    gnomonType,
                    positionMode,
                    position: val,
                    horizontalPosition: manualHorizontalPosition,
                  });
                }}
                style={{ width: '100%', minWidth: 0 }}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
              <label className="form-label">Horizontal Pos. (mm)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={pageWidth}
                step={1}
                value={manualHorizontalPosition}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setManualHorizontalPosition(val);
                  onChange({
                    mode,
                    height,
                    gnomonType,
                    positionMode,
                    position: manualPosition,
                    horizontalPosition: val,
                  });
                }}
                style={{ width: '100%', minWidth: 0 }}
              />
            </div>
          </div>
        )}

        {mode === 'auto' && (
          <div className="form-group">
            <p style={{ fontSize: '0.9em', color: '#718096', margin: 0 }}>
              Auto-calculated height: <strong>{autoHeight} mm</strong>
            </p>
          </div>
        )}
        {positionMode === 'auto' && (
          <div className="form-group">
            <p style={{ fontSize: '0.9em', color: '#718096', margin: 0 }}>
              Auto-calculated Position: <strong>{autoPosition} mm</strong> from edge 
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GnomonSettings;