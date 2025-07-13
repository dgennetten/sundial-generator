// src/components/PageSettings.tsx
import React from 'react';

type PageSize = 'A4' | 'Letter' | 'Custom';
type Orientation = 'Landscape' | 'Portrait';

interface PageSettingsProps {
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
}

const PageSettings: React.FC<PageSettingsProps> = ({
  pageSize,
  setPageSize,
  orientation,
  setOrientation,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📄 Page Settings</h3>
      </div>
      <div className="card-content">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Page Size</label>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
            >
              <option value="Letter">Letter</option>
              <option value="A4">A4</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Orientation</label>
            <select
              className="form-select"
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as Orientation)}
            >
              <option value="Landscape">Landscape</option>
              <option value="Portrait">Portrait</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSettings;