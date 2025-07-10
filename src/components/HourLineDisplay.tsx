// src/components/HourLineDisplay.tsx
import React, { useState } from 'react';

const HourLineDisplay: React.FC = () => {
  const [interval, setInterval] = useState<number>(1); // 1-hour default
  const [lineStyle, setLineStyle] = useState<'solid' | 'dotted' | 'curved'>('solid');
  const [showLabels, setShowLabels] = useState<boolean>(true);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Hour Line Display</strong></legend>

      <label>
        Hour Interval (hrs):&nbsp;
        <input
          type="number"
          min={0.25}
          max={2}
          step={0.25}
          value={interval}
          onChange={(e) => setInterval(parseFloat(e.target.value))}
        />
      </label>
      <br /><br />

      <label>
        Line Style:&nbsp;
        <select value={lineStyle} onChange={(e) => setLineStyle(e.target.value as 'solid' | 'dotted' | 'curved')}>
          <option value="solid">Solid</option>
          <option value="dotted">Dotted</option>
          <option value="curved">Curved</option>
        </select>
      </label>
      <br /><br />

      <label>
        Show Analemma Labels:&nbsp;
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(e) => setShowLabels(e.target.checked)}
        />
      </label>
    </fieldset>
  );
};

export default HourLineDisplay;