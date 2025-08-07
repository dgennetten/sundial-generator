// src/components/PageSettings.tsx
import React, { useEffect } from 'react';
import { StickyNote } from 'lucide-react';

type PageSize = 'A4' | 'Letter' | '11x17' | '10x15cm Postcard';
type Orientation = 'Landscape' | 'Portrait';
export type InclineType = 'Horizontal' | 'Cancer' | 'Equatorial' | 'Capricorn' | 'Vertical' | 'Manual';
type DialFacing = 'North' | 'South';

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
  dialFacing: DialFacing;
  setDialFacing: (facing: DialFacing) => void;
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
  dialFacing,
  setDialFacing,
}) => {
  // Helper functions for tropical calculations
  const isInTropics = (lat: number): boolean => {
    return Math.abs(lat) <= 23.4367; // Tropic of Cancer/Capricorn
  };

  const getCancerIncline = (lat: number): number => {
    // Calculate tilt toward Tropic of Cancer (23.4367°)
    // This creates a dial oriented toward the summer solstice
    return Math.abs(lat - 23.4367);
  };

  const getCapricornIncline = (lat: number): number => {
    // Calculate tilt toward Tropic of Capricorn (-23.4367°)
    // This creates a dial oriented toward the winter solstice
    return Math.abs(lat - (-23.4367));
  };

  // Calculate effective tilt angle
  const getEffectiveTiltAngle = () => {
    switch (inclineType) {
      case 'Horizontal': return 0;
      case 'Cancer': return getCancerIncline(latitude);
      case 'Equatorial': return latitude;
      case 'Capricorn': return getCapricornIncline(latitude);
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
                      newType === 'Cancer' ? getCancerIncline(latitude) :
                      newType === 'Equatorial' ? latitude :
                      newType === 'Capricorn' ? getCapricornIncline(latitude) :
                      newType === 'Vertical' ? 90 : tiltAngle;
      setTiltAngle(newAngle);
    }
  };

  const handleDialFacingToggle = () => {
    setDialFacing(dialFacing === 'North' ? 'South' : 'North');
  };

  // Determine if dial facing should be locked and what direction it should be
  const getDialFacingLockInfo = () => {
    const isOutsideTropics = !isInTropics(latitude);
    const isNotHorizontal = inclineType !== 'Horizontal';
    
    if (isOutsideTropics && isNotHorizontal) {
      return {
        isLocked: true,
        requiredDirection: latitude > 0 ? 'North' : 'South',
        showNotice: true
      };
    }
    
    return {
      isLocked: false,
      requiredDirection: dialFacing,
      showNotice: false
    };
  };

  const dialFacingLockInfo = getDialFacingLockInfo();

  // Auto-set dial facing when outside tropics and not horizontal
  useEffect(() => {
    const isOutsideTropics = !isInTropics(latitude);
    const isNotHorizontal = inclineType !== 'Horizontal';
    
    if (isOutsideTropics && isNotHorizontal) {
      const requiredDirection = latitude > 0 ? 'North' : 'South';
      if (dialFacing !== requiredDirection) {
        setDialFacing(requiredDirection);
      }
    }
  }, [latitude, inclineType, dialFacing, setDialFacing]);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><StickyNote color="#2563eb" size={20} style={{marginRight: 6}} /> Page Settings</h3>
      </div>
      <div className="card-content">
        <div className="form-row">
          <div className="form-group" style={{ marginRight: 6 }}>
            <label className="form-label">Page Size</label>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
            >
              <option value="Letter">Letter</option>
              <option value="A4">A4</option>
              <option value="11x17">11x17 inch</option>
              <option value="10x15cm Postcard">4x6 Post.</option>
            </select>
          </div>
          <div className="form-group" style={{ marginRight: 8 }}>
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
              <option value="Cancer">Cancer</option>
              <option value="Equatorial">Equatorial</option>
              <option value="Capricorn">Capricorn</option>
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
              step={1.0}
              style={{ 
                width: '40px',
                backgroundColor: inclineType !== 'Manual' ? '#f7fafc' : undefined,
                color: inclineType !== 'Manual' ? '#a0aec0' : undefined
              }}
            />
          </div>
        </div>
                 <div className="form-row" style={{ marginTop: '12px' }}>
           <div className="form-group">
             <label className="form-label">Dial Facing</label>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span style={{ 
                 fontSize: '14px', 
                 color: dialFacingLockInfo.showNotice ? '#9ca3af' : (dialFacingLockInfo.requiredDirection === 'North' ? '#2563eb' : '#6b7280') 
               }}>North</span>
               <button
                 type="button"
                 onClick={handleDialFacingToggle}
                 disabled={dialFacingLockInfo.isLocked}
                 style={{
                   width: '44px',
                   height: '24px',
                   borderRadius: '12px',
                   border: 'none',
                   backgroundColor: dialFacingLockInfo.showNotice ? '#e5e7eb' : (dialFacingLockInfo.requiredDirection === 'South' ? '#2563eb' : '#d1d5db'),
                   cursor: dialFacingLockInfo.isLocked ? 'not-allowed' : 'pointer',
                   position: 'relative',
                   transition: 'background-color 0.2s',
                   opacity: dialFacingLockInfo.isLocked ? 0.6 : 1
                 }}
               >
                 <div
                   style={{
                     width: '18px',
                     height: '18px',
                     borderRadius: '50%',
                     backgroundColor: 'white',
                     position: 'absolute',
                     top: '3px',
                     left: dialFacingLockInfo.requiredDirection === 'South' ? '23px' : '3px',
                     transition: 'left 0.2s',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                   }}
                 />
               </button>
               <span style={{ 
                 fontSize: '14px', 
                 color: dialFacingLockInfo.showNotice ? '#9ca3af' : (dialFacingLockInfo.requiredDirection === 'South' ? '#2563eb' : '#6b7280') 
               }}>South</span>
               {dialFacingLockInfo.showNotice && (
                 <span style={{ fontSize: '12px', color: '#dc2626', marginLeft: '8px' }}>
                   Inclinded dials must face toward solar path.
                 </span>
               )}
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default PageSettings;