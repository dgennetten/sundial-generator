// src/components/DesignExport.tsx
import React, { useState } from 'react';

type ExportFormat = 'SVG' | 'PNG' | 'PDF';

const DesignExport: React.FC = () => {
  const [format, setFormat] = useState<ExportFormat>('SVG');
  const [includeMotif, setIncludeMotif] = useState<boolean>(false);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Design & Export</strong></legend>

      <label>
        Overlay Motif:&nbsp;
        <input
          type="checkbox"
          checked={includeMotif}
          onChange={(e) => setIncludeMotif(e.target.checked)}
        />
        <span style={{ marginLeft: '0.5rem', fontSize: '0.9em', color: '#666' }}>
          (adds custom graphic layer)
        </span>
      </label>
      <br /><br />

      <label>
        Export Format:&nbsp;
        <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
          <option value="SVG">SVG</option>
          <option value="PNG">PNG</option>
          <option value="PDF">PDF</option>
        </select>
      </label>

      <p style={{ fontSize: '0.9em', color: '#666' }}>
        Export functionality coming soon – for now, right-click the preview to save.
      </p>
    </fieldset>
  );
};

export default DesignExport;