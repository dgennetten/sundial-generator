// src/components/PageSettings.tsx
import React from 'react';

type PageSize = 'A4' | 'Letter' | 'Custom';
type Orientation = 'Landscape' | 'Portrait';

interface PageSettingsProps {
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  scaleFactor: number;
  setScaleFactor: (factor: number) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
}

const PageSettings: React.FC<PageSettingsProps> = ({
  pageSize,
  setPageSize,
  scaleFactor,
  setScaleFactor,
  orientation,
  setOrientation,
}) => {
  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Page Settings</strong></legend>

      <label>
        Page Size:&nbsp;
        <select
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value as PageSize)}
        >
          <option value="Letter">Letter</option>
          <option value="A4">A4</option>
          <option value="Custom">Custom</option>
        </select>
      </label>
      <br /><br />

      <label>
        Scale Factor:&nbsp;
        <input
          type="number"
          min={0.1}
          max={10}
          step={0.1}
          value={scaleFactor}
          onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
        />
      </label>
      <br /><br />

      <label>
        Orientation:&nbsp;
        <select
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as Orientation)}
        >
          <option value="Landscape">Landscape</option>
          <option value="Portrait">Portrait</option>
        </select>
      </label>
    </fieldset>
  );
};

export default PageSettings;