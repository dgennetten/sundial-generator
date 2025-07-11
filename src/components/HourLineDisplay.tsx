// src/components/HourLineDisplay.tsx
import React, { useState } from 'react';

const HourLineSettings: React.FC = () => {
  const [startHour, setStartHour] = useState<number>(6);
  const [stopHour, setStopHour] = useState<number>(18);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Hour Line Settings</strong></legend>
      {/* Date Range controls would be here */}
      <div style={{ marginBottom: 8 }}>
        <em>Date Range controls go here</em>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 8 }}>
        <label style={{ marginRight: 8 }}>Hour Range:</label>
        <input
          type="number"
          min={0}
          max={23}
          value={startHour}
          onChange={e => setStartHour(Number(e.target.value))}
          style={{ width: 50 }}
        />
        <span>to</span>
        <input
          type="number"
          min={startHour + 1}
          max={24}
          value={stopHour}
          onChange={e => setStopHour(Number(e.target.value))}
          style={{ width: 50 }}
        />
      </div>
    </fieldset>
  );
};

export default HourLineSettings;