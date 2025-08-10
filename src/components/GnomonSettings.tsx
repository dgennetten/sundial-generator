// src/components/GnomonSettings.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { getSolarPosition, projectShadowToSurface, getAnalemmaPointsProjected } from '../utils/analemmaGenerator';
import { MoveUpRight } from 'lucide-react';

type Mode = 'auto' | 'manual';
type GnomonType = 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north';
type PositionMode = 'auto' | 'manual';

interface Props {
  mode: Mode;
  height: number;
  latitude: number;
  longitude: number;
  tzMeridian: number;
  pageHeight: number;
  gnomonType: GnomonType;
  positionMode?: PositionMode;
  position?: number;
  onChange: (values: { mode: Mode; height: number; gnomonType: GnomonType; positionMode?: PositionMode; position?: number }) => void;
}

const GnomonSettings: React.FC<Props> = ({
  mode,
  height,
  latitude,
  longitude,
  tzMeridian,
  pageHeight,
  gnomonType,
  positionMode: propPositionMode,
  position: propPosition,
  onChange,
}) => {

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  const [autoHeight, setAutoHeight] = useState<number>(0);
  const [positionMode, setPositionMode] = useState<PositionMode>(propPositionMode || 'auto');
  const [manualPosition, setManualPosition] = useState<number>(propPosition || 0);
  const [autoPosition, setAutoPosition] = useState<number>(0);

  // Function to calculate gnomon height based on winter-to-summer solstice distance
  const calculateAutoGnomonHeight = (lat: number, lng: number, tz: number, pageH: number): number => {
    // Winter solstice is around day 355, Summer solstice is around day 172
    const winterSolsticeDay = 355;
    const summerSolsticeDay = 172;
    const noonHour = 12;
    
    // Calculate shadow positions for winter and summer solstices at noon
    const winterPos = getSolarPosition(winterSolsticeDay, lat, lng, tz, noonHour);
    const summerPos = getSolarPosition(summerSolsticeDay, lat, lng, tz, noonHour);
    
    if (winterPos.altitude <= 0 || summerPos.altitude <= 0) {
      // Fallback to original calculation if sun is below horizon
      return Math.round(Math.tan((lat * Math.PI) / 180) * 100 * 3.7 / 8);
    }
    
    // Project shadows to surface (using a temporary gnomon height of 1)
    const tempGnomonHeight = 1;
    const winterShadow = projectShadowToSurface(winterPos.altitude, winterPos.azimuth, tempGnomonHeight, 'Horizontal', lat);
    const summerShadow = projectShadowToSurface(summerPos.altitude, summerPos.azimuth, tempGnomonHeight, 'Horizontal', lat);
    
    // Calculate the distance between winter and summer shadows
    const shadowDistance = Math.abs(winterShadow.y - summerShadow.y);
    
    // Calculate required gnomon height to make this distance 40% of page height
    const targetDistance = pageH * 0.4;
    const requiredGnomonHeight = targetDistance / shadowDistance;
    // Reduce to 66% of previous value, then increase by factor of 55/40
    return Math.round(requiredGnomonHeight * 0.66 * (55/40));
  };

  // Function to calculate gnomon position from top so that noon analemma is vertically centered
  const calculateAutoGnomonPosition = useCallback((pageH: number): number => {
    // Get noon analemma points for current latitude, longitude, tzMeridian, and autoHeight
    const noonPoints = getAnalemmaPointsProjected({
      lat: latitude,
      lng: longitude,
      tzMeridian: tzMeridian,
      hour: 12,
      gnomonHeight: autoHeight || height,
      orientation: 'Horizontal',
    });
    if (!noonPoints.length) return Math.round(pageH * 0.2);
    const yVals = noonPoints.map(p => p.y);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    const analemmaCenterY = (minY + maxY) / 2;
    // Position so that analemma center is at pageH/2
    const gnomonPos = pageH / 2 - analemmaCenterY;
    return Math.round(gnomonPos);
  }, [latitude, longitude, tzMeridian, autoHeight, height]);

  // Restore effect for autoHeight calculation
  useEffect(() => {
    if (mode === 'auto') {
      const computed = calculateAutoGnomonHeight(latitude, longitude, tzMeridian, pageHeight);
      setAutoHeight(computed);
    }
  }, [mode, latitude, longitude, tzMeridian, pageHeight, gnomonType]);

  useEffect(() => {
    const autoPos = calculateAutoGnomonPosition(pageHeight);
    setAutoPosition(autoPos);
    if (positionMode === 'auto') {
      setManualPosition(autoPos);
      onChange({ mode, height, gnomonType, positionMode, position: autoPos });
    } else {
      onChange({ mode, height, gnomonType, positionMode, position: manualPosition });
    }
  }, [mode, height, latitude, longitude, tzMeridian, pageHeight, gnomonType, positionMode, manualPosition, calculateAutoGnomonPosition, onChange]);

  // When switching from auto to manual height mode, set manual height to autoHeight
  useEffect(() => {
    if (mode === 'manual' && autoHeight && height !== autoHeight) {
      onChange({ mode, height: autoHeight, gnomonType, positionMode, position: manualPosition });
    }
    // Only run this effect when mode changes to manual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
                })
              }
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <option value="crosshair">Crosshair</option>
              <option value="crosshair-with-north">Crosshair + North Pt</option>
              <option value="popup">Popup</option>
              <option value="popup-with-brace">Popup with Brace</option>
            </select>
          </div>
        </div>

        {/* Height and Position dropdowns on one line */}
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
            <select
              className="form-select"
              value={mode}
              onChange={(e) =>
                onChange({
                  mode: e.target.value as Mode,
                  height,
                  gnomonType,
                  positionMode,
                  position: manualPosition,
                })
              }
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Position</label>
            <select
              className="form-select"
              value={positionMode}
              onChange={e => setPositionMode(e.target.value as PositionMode)}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        {/* Manual controls row: show both height and position inputs side by side if both are manual */}
        {mode === 'manual' && positionMode === 'manual' && (
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
                  })
                }
                style={{ width: isMobile ? '60px' : 'auto' }}
              />
            </div>
            <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
              <label className="form-label">Position (mm from edge)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={pageHeight}
                step={1}
                value={manualPosition}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setManualPosition(val);
                  onChange({
                    mode,
                    height,
                    gnomonType,
                    positionMode,
                    position: val,
                  });
                }}
                style={{ width: isMobile ? '60px' : '120px' }}
              />
            </div>
          </div>
        )}
        {/* Fallback: show height or position input individually if only one is manual */}
        {mode === 'manual' && positionMode !== 'manual' && (
          <div className="form-group">
            <label className="form-label">Gnomon Height (mm)</label>
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
                })
              }
            />
          </div>
        )}
        {positionMode === 'manual' && mode !== 'manual' && (
          <div className="form-group">
            <label className="form-label">Gnomon Position (mm from top)</label>
            <input
              type="number"
              className="form-input"
              min={0}
              max={pageHeight}
              step={1}
              value={manualPosition}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setManualPosition(val);
                onChange({
                  mode,
                  height,
                  gnomonType,
                  positionMode,
                  position: val,
                });
              }}
              style={{ width: '120px' }}
            />
          </div>
        )}

        {mode === 'auto' && (
          <div className="form-group">
            <p style={{ fontSize: '0.9em', color: '#718096', margin: 0 }}>
              Auto-calculated height: <strong>{autoHeight} mm</strong> (based on latitude: {latitude.toFixed(2)}°)
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