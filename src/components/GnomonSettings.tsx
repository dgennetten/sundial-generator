// src/components/GnomonSettings.tsx
import React, { useEffect, useState } from 'react';

type Mode = 'auto' | 'manual';
type Orientation = 'Horizontal' | 'Vertical' | 'Equatorial';

interface Props {
  mode: Mode;
  height: number;
  latitude: number;
  orientation?: Orientation;
  onChange: (values: { mode: Mode; height: number; orientation: Orientation }) => void;
}

const GnomonSettings: React.FC<Props> = ({
  mode,
  height,
  latitude,
  orientation = 'Horizontal',
  onChange,
}) => {
  const [autoHeight, setAutoHeight] = useState<number>(0);

  useEffect(() => {
    if (mode === 'auto') {
      const computed = orientation === 'Equatorial'
        ? 100 // placeholder for equatorial calculation
        : Math.tan((latitude * Math.PI) / 180) * 100;

      setAutoHeight(parseFloat(computed.toFixed(2)));
      onChange({ mode, height: computed, orientation });
    } else {
      onChange({ mode, height, orientation });
    }
  }, [mode, height, latitude, orientation]);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Gnomon Settings</strong></legend>

      <label>
        Mode:&nbsp;
        <select
          value={mode}
          onChange={(e) =>
            onChange({
              mode: e.target.value as Mode,
              height,
              orientation,
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
                orientation,
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

      <br />

      <label>
        Orientation:&nbsp;
        <select
          value={orientation}
          onChange={(e) =>
            onChange({
              mode,
              height,
              orientation: e.target.value as Orientation,
            })
          }
        >
          <option value="Horizontal">Horizontal</option>
          <option value="Vertical">Vertical</option>
          <option value="Equatorial">Equatorial</option>
        </select>
      </label>
    </fieldset>
  );
};

export default GnomonSettings;