// src/components/GnomonSettings.tsx
import React, { useEffect, useState } from 'react';

type Mode = 'auto' | 'manual';

interface Props {
  mode: Mode;
  height: number;
  latitude: number;
  onChange: (values: { mode: Mode; height: number }) => void;
}

const GnomonSettings: React.FC<Props> = ({
  mode,
  height,
  latitude,
  onChange,
}) => {
  const [autoHeight, setAutoHeight] = useState<number>(0);

  useEffect(() => {
    if (mode === 'auto') {
      const computed = Math.tan((latitude * Math.PI) / 180) * 100;

      setAutoHeight(parseFloat(computed.toFixed(2)));
      onChange({ mode, height: computed });
    } else {
      onChange({ mode, height });
    }
  }, [mode, height, latitude]);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Gnomon Options</strong></legend>

      <label>
        Mode:&nbsp;
        <select
          value={mode}
          onChange={(e) =>
            onChange({
              mode: e.target.value as Mode,
              height,
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