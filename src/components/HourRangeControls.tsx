// src/components/HourRangeControls.tsx
import React, { useState } from 'react';

interface Props {
  onUpdate: (
    start: number,
    stop: number,
    use24Hour: boolean,
    labelWinterSide: boolean,
    labelSummerSide: boolean,
    labelOffset: number,
    fontFamily: string,
    fontSize: number
  ) => void;
}

const HourRangeControls: React.FC<Props> = ({ onUpdate }) => {
  const [startHour, setStartHour] = useState<number>(6);
  const [stopHour, setStopHour] = useState<number>(18);
  const [use24Hour, setUse24Hour] = useState<boolean>(true);
  const [labelWinterSide, setLabelWinterSide] = useState<boolean>(true);
  const [labelSummerSide, setLabelSummerSide] = useState<boolean>(true);
  const [labelOffset, setLabelOffset] = useState<number>(2); // default 2mm
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(6); // default 6pt

  // Update preview automatically when startHour or stopHour changes
  React.useEffect(() => {
    if (startHour < stopHour) {
      onUpdate(
        startHour,
        stopHour,
        use24Hour,
        labelWinterSide,
        labelSummerSide,
        labelOffset,
        fontFamily,
        fontSize
      );
    }
  }, [startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, onUpdate]);

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Hour Lines</strong></legend>

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

      <label>
        <input
          type="checkbox"
          checked={use24Hour}
          onChange={(e) => setUse24Hour(e.target.checked)}
        />
        &nbsp;24-hour time
      </label>
      <br /><br />
      <label>
        <input
          type="checkbox"
          checked={labelWinterSide}
          onChange={e => setLabelWinterSide(e.target.checked)}
        />
        &nbsp;Label on winter side
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={labelSummerSide}
          onChange={e => setLabelSummerSide(e.target.checked)}
        />
        &nbsp;Label on summer side
      </label>
      <br /><br />
      <label>
        Label offset (mm):&nbsp;
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={labelOffset}
          onChange={e => setLabelOffset(parseInt(e.target.value) || 0)}
          style={{ width: 60 }}
        />
      </label>
      <label>
        Font family:&nbsp;
        <input
          type="text"
          value={fontFamily}
          onChange={e => setFontFamily(e.target.value)}
          style={{ width: 120 }}
        />
      </label>
      <br /><br />
      <label>
        Font size (pt):&nbsp;
        <input
          type="number"
          min={6}
          max={48}
          step={1}
          value={fontSize}
          onChange={e => setFontSize(parseInt(e.target.value) || 10)}
          style={{ width: 60 }}
        />
      </label>
    </fieldset>
  );
};

export default HourRangeControls;