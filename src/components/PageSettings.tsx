// src/components/PageSettings.tsx
import React from 'react';
import { Layout } from 'lucide-react';

type PageSize = 'A4' | 'Letter' | 'Custom';
type Orientation = 'Landscape' | 'Portrait';
export type InclineType = 'Horizontal' | 'Equatorial' | 'Vertical' | 'Manual';

interface PageSettingsProps {
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  inclineType: InclineType;
  setInclineType: (type: InclineType) => void;
  tiltAngle: number;
  setTiltAngle: (angle: number) => void;
  latitude: number;
}

const PageSettings: React.FC<PageSettingsProps> = ({
  pageSize,
  setPageSize,
  orientation,
  setOrientation,
  inclineType,
  setInclineType,
  tiltAngle,
  setTiltAngle,
  latitude,
}) => {
  // Calculate effective tilt angle
  const getEffectiveTiltAngle = () => {
    switch (inclineType) {
      case 'Horizontal': return 0;
      case 'Equatorial': return latitude;
      case 'Vertical': return 90;
      case 'Manual': return tiltAngle;
      default: return 0;
    }
  };

  const handleInclineTypeChange = (newType: InclineType) => {
    setInclineType(newType);
    // Update tilt angle when changing from Manual to another type
    if (newType !== 'Manual') {
      const newAngle = newType === 'Horizontal' ? 0 : 
                      newType === 'Equatorial' ? latitude :
                      newType === 'Vertical' ? 90 : tiltAngle;
      setTiltAngle(newAngle);
    }
  };
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Layout color="#2563eb" size={20} style={{marginRight: 6}} /> Page Settings</h3>
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
          <div className="form-group">
            <label className="form-label">Incline</label>
            <select
              className="form-select"
              value={inclineType}
              onChange={(e) => handleInclineTypeChange(e.target.value as InclineType)}
            >
              <option value="Horizontal">Horizontal</option>
              <option value="Equatorial">Equatorial</option>
              <option value="Vertical">Vertical</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Degrees</label>
            <input
              type="number"
              className="form-input"
              value={getEffectiveTiltAngle().toFixed(1)}
              onChange={(e) => setTiltAngle(parseFloat(e.target.value) || 0)}
              disabled={inclineType !== 'Manual'}
              min={0}
              max={90}
              step={0.1}
              style={{ 
                width: '40px',
                backgroundColor: inclineType !== 'Manual' ? '#f7fafc' : undefined,
                color: inclineType !== 'Manual' ? '#a0aec0' : undefined
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSettings;