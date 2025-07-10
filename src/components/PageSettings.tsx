// src/components/PageSettings.tsx
import React, { useState } from 'react';

type PageSize = 'A4' | 'Letter' | 'Custom';
type Orientation = 'Horizontal' | 'Vertical' | 'Equatorial';

const PageSettings: React.FC = () => {
  const [pageSize, setPageSize] = useState<PageSize>('Letter');
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [orientation, setOrientation] = useState<Orientation>('Horizontal');

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
          <option value="Horizontal">Horizontal</option>
          <option value="Vertical">Vertical</option>
          <option value="Equatorial">Equatorial</option>
        </select>
      </label>
    </fieldset>
  );
};

export default PageSettings;