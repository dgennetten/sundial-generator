// src/components/HourRangeControls.tsx
import React, { useState } from 'react';

interface Props {
  onUpdate: (start: number, stop: number) => void;
}

const HourRangeControls: React.FC<Props> = ({ onUpdate }) => {
  const [startHour, setStartHour] = useState<number>(6);
  const [stopHour, setStopHour] = useState<number>(18);

  // Update preview automatically when startHour or stopHour changes
  React.useEffect(() => {
    if (startHour < stopHour) {
      onUpdate(startHour, stopHour);
    }
  }, [startHour, stopHour, onUpdate]);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Hour Range</strong></legend>

      <label>
        Start Hour:&nbsp;
        <input
          type="number"
          min={0}
          max={23}
          value={startHour}
          onChange={(e) => setStartHour(parseInt(e.target.value))}
        />
      </label>
      <br /><br />

      <label>
        Stop Hour:&nbsp;
        <input
          type="number"
          min={startHour + 1}
          max={24}
          value={stopHour}
          onChange={(e) => setStopHour(parseInt(e.target.value))}
        />
      </label>
      <br /><br />

    </fieldset>
  );
};

export default HourRangeControls;