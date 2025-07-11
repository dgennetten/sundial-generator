import React from 'react';
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
}

const HourlineSettings: React.FC<HourlineSettingsProps> = ({
  dateRange,
  setDateRange,
  lineStyles,
  hourlineIntervals,
  setHourlineIntervals,
}) => {
  const handleChange = (idx: number, field: keyof HourlineInterval, value: string | boolean) => {
    const updated = [...hourlineIntervals];
    updated[idx] = { ...updated[idx], [field]: value };
    setHourlineIntervals(updated);
    saveHourlineIntervals(updated);
  };

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Hourline Settings</strong></legend>
      
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

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Active</th>
            <th style={{ textAlign: 'left' }}>Interval</th>
            <th style={{ textAlign: 'left' }}>Line Style</th>
          </tr>
        </thead>
        <tbody>
          {hourlineIntervals.map((interval, idx) => (
            <tr key={interval.id}>
              <td>
                <input
                  type="checkbox"
                  checked={!!interval.active}
                  onChange={e => handleChange(idx, 'active', e.target.checked)}
                />
              </td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </fieldset>
  );
};

export { loadHourlineIntervals, saveHourlineIntervals };
export default HourlineSettings; 