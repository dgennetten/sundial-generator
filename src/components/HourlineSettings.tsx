import React, { useState } from 'react';
import type { LineStyle } from './LineSettings';

type DateRange = 'FullYear' | 'SummerToWinter' | 'WinterToSummer';

export type HourlineInterval = {
  active: boolean;
  name: string;
  styleId: string;
  id: string;
  fixed?: boolean;
};

const BUILTIN_HOURLINE_INTERVALS: HourlineInterval[] = [
  { active: true, name: 'Hour', styleId: '0.5mm-black', fixed: true, id: 'hour' },
  { active: true, name: 'Half-hour', styleId: 'default-hairline', fixed: true, id: 'half-hour' },
  { active: false, name: 'Quarter-hour', styleId: 'dashed-hairline', fixed: true, id: 'quarter-hour' },
  { active: false, name: '5-minute', styleId: 'dotted-hairline', fixed: true, id: '5-minute' },
  { active: false, name: '2-minute', styleId: 'dotted-hairline', fixed: true, id: '2-minute' },
];

const LOCAL_STORAGE_KEY = 'sundial-hourline-intervals';

function loadHourlineIntervals(): HourlineInterval[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return BUILTIN_HOURLINE_INTERVALS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Always ensure built-ins are present
      const userIntervals = parsed.filter((i: HourlineInterval) => !i.fixed);
      return [...BUILTIN_HOURLINE_INTERVALS, ...userIntervals];
    }
    return BUILTIN_HOURLINE_INTERVALS;
  } catch {
    return BUILTIN_HOURLINE_INTERVALS;
  }
}

function saveHourlineIntervals(intervals: HourlineInterval[]) {
  // Only save user intervals
  const userIntervals = intervals.filter(i => !i.fixed);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...userIntervals]));
}

interface HourlineSettingsProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  lineStyles: LineStyle[];
  hourlineIntervals: HourlineInterval[];
  setHourlineIntervals: (intervals: HourlineInterval[]) => void;
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

const HourlineSettings: React.FC<HourlineSettingsProps> = ({
  dateRange,
  setDateRange,
  lineStyles,
  hourlineIntervals,
  setHourlineIntervals,
  onUpdate,
}) => {
  const [startHour, setStartHour] = useState<number>(6);
  const [stopHour, setStopHour] = useState<number>(18);
  const [use24Hour, setUse24Hour] = useState<boolean>(true);
  const [labelWinterSide, setLabelWinterSide] = useState<boolean>(true);
  const [labelSummerSide, setLabelSummerSide] = useState<boolean>(true);
  const [labelOffset, setLabelOffset] = useState<number>(1.5);
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(6);

  // Update preview automatically when any hour-related setting changes
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
  const handleChange = (idx: number, field: keyof HourlineInterval, value: string | boolean) => {
    const updated = [...hourlineIntervals];
    updated[idx] = { ...updated[idx], [field]: value };
    setHourlineIntervals(updated);
    saveHourlineIntervals(updated);
  };

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Hour Line Options</strong></legend>
      
      <label>
        Date Range:&nbsp;
        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateRange)}
        >
          <option value="FullYear">Full Year</option>
          <option value="SummerToWinter">Summer to Winter</option>
          <option value="WinterToSummer">Winter to Summer</option>
        </select>
      </label>
      <br /><br />

      <label>
        Hour Range:&nbsp;
        <input
          type="number"
          min={0}
          max={23}
          value={startHour}
          onChange={(e) => setStartHour(parseInt(e.target.value))}
          style={{ width: 60 }}
        />
        &nbsp;to&nbsp;
        <input
          type="number"
          min={startHour + 1}
          max={24}
          value={stopHour}
          onChange={(e) => setStopHour(parseInt(e.target.value))}
          style={{ width: 60 }}
        />
      </label>
      <br /><br />

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Interval</th>
            <th style={{ textAlign: 'left' }}>Line Style</th>
            <th style={{ textAlign: 'left' }}>Active</th>
          </tr>
        </thead>
        <tbody>
          {hourlineIntervals.map((interval, idx) => (
            <tr key={interval.id}>
              <td>
                <span>{interval.name}</span>
              </td>
              <td>
                <select
                  value={interval.styleId}
                  onChange={e => handleChange(idx, 'styleId', e.target.value)}
                >
                  {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
                    <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!interval.active}
                  onChange={e => handleChange(idx, 'active', e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

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

export { loadHourlineIntervals, saveHourlineIntervals };
export default HourlineSettings; 