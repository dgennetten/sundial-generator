// src/components/GnomonSettings.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getAnalemmaPointsProjected } from '../utils/sundialMath';
import { calculateAutoGnomonHeight as calcAutoHeight } from '../utils/sundialMath';
import { MoveUpRight, Pause, Play } from 'lucide-react';

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
  /** Preview toggle for Glued Popup Base: 'Gnomon' shows the cut-and-fold net, 'Dial' shows normal preview */
  gnomonPreviewMode?: 'Dial' | 'Gnomon';
  onGnomonPreviewModeChange?: (mode: 'Dial' | 'Gnomon') => void;
  locationShadowPreview?: boolean;
  onLocationShadowPreviewChange?: (enabled: boolean) => void;
  locationShadowAnimation?: boolean;
  onLocationShadowAnimationChange?: (enabled: boolean) => void;
  locationShadowAnimationPaused?: boolean;
  onLocationShadowAnimationPausedChange?: (paused: boolean) => void;
  locationShadowAnimationMode?: 'Day' | 'Hour';
  onLocationShadowAnimationModeChange?: (mode: 'Day' | 'Hour') => void;
  locationShadowDateTimeLabel?: string;
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
  gnomonPreviewMode = 'Dial',
  onGnomonPreviewModeChange,
  locationShadowPreview = true,
  onLocationShadowPreviewChange,
  locationShadowAnimation = false,
  onLocationShadowAnimationChange,
  locationShadowAnimationPaused = false,
  onLocationShadowAnimationPausedChange,
  locationShadowAnimationMode = 'Day',
  onLocationShadowAnimationModeChange,
  locationShadowDateTimeLabel = '',
  onChange,
}) => {

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  // Crosshair gnomons have no popup body to cast a shadow, so animation is not applicable
  const isCrosshair = gnomonType.startsWith('crosshair');
  // Initialize autoHeight synchronously so the auto gnomon position is correct on the
  // very first render. Starting at 0 caused a post-mount effect cascade (autoHeight 0 →
  // computed → recompute position → onChange) that visibly shifted the dial on load.
  const [autoHeight, setAutoHeight] = useState<number>(() =>
    mode === 'auto'
      ? calcAutoHeight(latitude, longitude, tzMeridian, pageHeight, dialInclination, dialDeclination)
      : 0
  );
  const [positionMode, setPositionMode] = useState<PositionMode>(propPositionMode || 'auto');
  const [manualPosition, setManualPosition] = useState<number>(propPosition || 0);
  const [manualHorizontalPosition, setManualHorizontalPosition] = useState<number>(propHorizontalPosition ?? Math.round(pageWidth / 2));
  const [autoPosition, setAutoPosition] = useState<number>(0);
  const userInitiatedChangeRef = useRef<boolean>(false);

  // Crosshair gnomons cast no popup-body shadow, so the location-shadow preview is turned
  // off and disabled while a crosshair type is selected, then restored to its prior state
  // when a non-crosshair type is chosen again.
  const prevShadowPreviewRef = useRef<boolean>(locationShadowPreview);
  const wasCrosshairRef = useRef<boolean>(isCrosshair);
  useEffect(() => {
    if (isCrosshair && !wasCrosshairRef.current) {
      // Entering crosshair: remember the current state and turn the preview off.
      prevShadowPreviewRef.current = locationShadowPreview;
      if (locationShadowPreview) {
        onLocationShadowPreviewChange?.(false);
        onLocationShadowAnimationPausedChange?.(false);
      }
    } else if (!isCrosshair && wasCrosshairRef.current) {
      // Leaving crosshair: restore the previous preview state.
      onLocationShadowPreviewChange?.(prevShadowPreviewRef.current);
    }
    wasCrosshairRef.current = isCrosshair;
  }, [isCrosshair, locationShadowPreview, onLocationShadowPreviewChange, onLocationShadowAnimationPausedChange]);

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
        {/* Type dropdown + optional Gnomon/Dial preview toggle.
            Uses the same gap and flex weights as the Height/Position row so the
            Preview toggle column aligns with the Position toggle column. */}
        <div className="form-row" style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: isMobile ? '0.5rem' : '1rem',
          flexDirection: 'row',
        }}>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1', minWidth: 0 }}>
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
              <option value="popup">Cut-n-Fold Popup</option>
              <option value="popup-with-brace">Popup with Brace</option>
              <option value="glued-popup-base">Glued Popup - 2 pages</option>
            </select>
          </div>

          {/* Preview toggle — only visible for Glued Popup Base.
              flex: 1 matches the Position column in the row below. */}
          {gnomonType === 'glued-popup-base' && onGnomonPreviewModeChange && (
            <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1', minWidth: 0 }}>
              <label className="form-label">Preview</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: gnomonPreviewMode === 'Gnomon' ? '#2563eb' : '#9ca3af',
                  fontWeight: gnomonPreviewMode === 'Gnomon' ? '600' : '400',
                  transition: 'all 0.2s',
                }}>Gnomon</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={gnomonPreviewMode === 'Dial'}
                    onChange={(e) => onGnomonPreviewModeChange(e.target.checked ? 'Dial' : 'Gnomon')}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: gnomonPreviewMode === 'Dial' ? '#2563eb' : '#cbd5e0',
                    borderRadius: '24px',
                    transition: 'background-color 0.3s',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px', width: '18px',
                      left: gnomonPreviewMode === 'Dial' ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.3s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }} />
                  </span>
                </label>
                <span style={{
                  fontSize: '0.875rem',
                  color: gnomonPreviewMode === 'Dial' ? '#2563eb' : '#9ca3af',
                  fontWeight: gnomonPreviewMode === 'Dial' ? '600' : '400',
                  transition: 'all 0.2s',
                }}>Dial</span>
              </div>
            </div>
          )}
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

        {onLocationShadowPreviewChange && (
          <div className="form-group" style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              cursor: isCrosshair ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              color: isCrosshair ? '#9ca3af' : undefined,
            }}>
              <input
                type="checkbox"
                checked={locationShadowPreview && !isCrosshair}
                disabled={isCrosshair}
                onChange={(e) => {
                  onLocationShadowPreviewChange(e.target.checked);
                  if (!e.target.checked) {
                    onLocationShadowAnimationPausedChange?.(false);
                  }
                }}
              />
              Live preview of on-location shadow
            </label>

            {locationShadowPreview && onLocationShadowAnimationChange && (
              <div style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={locationShadowAnimation}
                      onChange={(e) => {
                        onLocationShadowAnimationChange(e.target.checked);
                        if (!e.target.checked) {
                          onLocationShadowAnimationPausedChange?.(false);
                        }
                      }}
                    />
                    Animation:
                  </label>
                  {onLocationShadowAnimationModeChange && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.875rem',
                        color: locationShadowAnimationMode === 'Day' ? '#2563eb' : '#9ca3af',
                        fontWeight: locationShadowAnimationMode === 'Day' ? '600' : '400',
                      }}>Day</span>
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={locationShadowAnimationMode === 'Hour'}
                          onChange={(e) => onLocationShadowAnimationModeChange(e.target.checked ? 'Hour' : 'Day')}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: locationShadowAnimationMode === 'Hour' ? '#2563eb' : '#cbd5e0',
                          borderRadius: '24px',
                          transition: 'background-color 0.3s',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                        }}>
                          <span style={{
                            position: 'absolute',
                            height: '18px', width: '18px',
                            left: locationShadowAnimationMode === 'Hour' ? '22px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }} />
                        </span>
                      </label>
                      <span style={{
                        fontSize: '0.875rem',
                        color: locationShadowAnimationMode === 'Hour' ? '#2563eb' : '#9ca3af',
                        fontWeight: locationShadowAnimationMode === 'Hour' ? '600' : '400',
                      }}>Hour</span>
                    </div>
                  )}
                  {locationShadowAnimation && onLocationShadowAnimationPausedChange && (
                    <button
                      type="button"
                      onClick={() => onLocationShadowAnimationPausedChange(!locationShadowAnimationPaused)}
                      title={locationShadowAnimationPaused ? 'Resume animation' : 'Pause animation'}
                      aria-label={locationShadowAnimationPaused ? 'Resume animation' : 'Pause animation'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        border: '1px solid #cbd5e0',
                        borderRadius: '6px',
                        background: locationShadowAnimationPaused ? '#edf2f7' : 'white',
                        color: '#2563eb',
                        cursor: 'pointer',
                      }}
                    >
                      {locationShadowAnimationPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                  )}
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={locationShadowDateTimeLabel}
                    style={{ fontSize: '0.8rem', color: '#4a5568', width: '8.5rem', padding: '0.25rem 0.4rem' }}
                    aria-label="Shadow preview date and time"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GnomonSettings;