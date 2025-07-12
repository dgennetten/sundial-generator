// src/components/GnomonSettings.tsx
import React, { useEffect, useState } from 'react';

type Mode = 'auto' | 'manual';
type GnomonType = 'crosshair' | 'sized-base-triangle';

interface Props {
  mode: Mode;
  height: number;
  latitude: number;
  gnomonType: GnomonType;
  onChange: (values: { mode: Mode; height: number; gnomonType: GnomonType }) => void;
}

const GnomonSettings: React.FC<Props> = ({
  mode,
  height,
  latitude,
  gnomonType,
  onChange,
}) => {
  const [autoHeight, setAutoHeight] = useState<number>(0);

  useEffect(() => {
    if (mode === 'auto') {
      const computed = Math.tan((latitude * Math.PI) / 180) * 100;

      setAutoHeight(parseFloat(computed.toFixed(2)));
      onChange({ mode, height: computed, gnomonType });
    } else {
      onChange({ mode, height, gnomonType });
    }
  }, [mode, height, latitude, gnomonType]);

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