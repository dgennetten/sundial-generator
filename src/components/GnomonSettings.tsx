// src/components/GnomonSettings.tsx
import React, { useEffect, useState } from 'react';
import { getSolarPosition, projectShadowToSurface } from '../utils/analemmaGenerator';

type Mode = 'auto' | 'manual';
type GnomonType = 'crosshair' | 'sized-base-triangle';

interface Props {
  mode: Mode;
  height: number;
  latitude: number;
  longitude: number;
  tzMeridian: number;
  pageHeight: number;
  gnomonType: GnomonType;
  onChange: (values: { mode: Mode; height: number; gnomonType: GnomonType }) => void;
}

const GnomonSettings: React.FC<Props> = ({
  mode,
  height,
  latitude,
  longitude,
  tzMeridian,
  pageHeight,
  gnomonType,
  onChange,
}) => {
  const [autoHeight, setAutoHeight] = useState<number>(0);

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
      return parseFloat((Math.tan((lat * Math.PI) / 180) * 100 * 3.7 / 8).toFixed(2));
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
    
    return parseFloat(requiredGnomonHeight.toFixed(2));
  };

  useEffect(() => {
    if (mode === 'auto') {
      const computed = calculateAutoGnomonHeight(latitude, longitude, tzMeridian, pageHeight);

      setAutoHeight(computed);
      onChange({ mode, height: computed, gnomonType });
    } else {
      onChange({ mode, height, gnomonType });
    }
  }, [mode, height, latitude, longitude, tzMeridian, pageHeight, gnomonType]);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Gnomon Options</strong></legend>

      <label>
        Gnomon Type:&nbsp;
        <select
          value={gnomonType}
          onChange={(e) =>
            onChange({
              mode,
              height,
              gnomonType: e.target.value as GnomonType,
            })
          }
          style={{ width: 150 }}
        >
          <option value="crosshair">Crosshair</option>
          <option value="sized-base-triangle">Sized Base Triangle</option>
        </select>
      </label>
      <br /><br />

      <label>
        Height Mode:&nbsp;
        <select
          value={mode}
          onChange={(e) =>
            onChange({
              mode: e.target.value as Mode,
              height,
              gnomonType,
            })
          }
        >
          <option value="auto">Auto</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      <br /><br />

      {mode === 'manual' && (
        <label>
          Gnomon Height (mm):&nbsp;
          <input
            type="number"
            min={1}
            max={300}
            step={1}
            value={height}
            onChange={(e) =>
                          onChange({
              mode,
              height: parseFloat(e.target.value),
              gnomonType,
            })
            }
          />
        </label>
      )}

      {mode === 'auto' && (
        <p style={{ fontSize: '0.9em', color: '#555' }}>
          Auto-calculated height: <strong>{autoHeight} mm</strong> (based on latitude: {latitude}°)
        </p>
      )}
    </fieldset>
  );
};

export default GnomonSettings;