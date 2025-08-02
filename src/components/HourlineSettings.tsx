import React from 'react';
import type { LineStyle } from './LineSettings';
import { Timer } from 'lucide-react';

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
  // Current values from parent
  startHour: number;
  stopHour: number;
  use24Hour: boolean;
  labelWinterSide: boolean;
  labelSummerSide: boolean;
  labelOffset: number;
  fontFamily: string;
  fontSize: number;
  useDST: boolean;
  declinationNoonmarks: boolean;
  onUpdate: (
    start: number,
    stop: number,
    use24Hour: boolean,
    labelWinterSide: boolean,
    labelSummerSide: boolean,
    labelOffset: number,
    fontFamily: string,
    fontSize: number,
    useDST: boolean,
    declinationNoonmarks: boolean
  ) => void;
}

const HourlineSettings: React.FC<HourlineSettingsProps> = ({
  dateRange,
  setDateRange,
  lineStyles,
  hourlineIntervals,
  setHourlineIntervals,
  startHour,
  stopHour,
  use24Hour,
  labelWinterSide,
  labelSummerSide,
  labelOffset,
  fontFamily,
  fontSize,
  useDST,
  declinationNoonmarks,
  onUpdate,
}) => {


  const handleChange = (idx: number, field: keyof HourlineInterval, value: string | boolean) => {
    const updated = [...hourlineIntervals];
    updated[idx] = { ...updated[idx], [field]: value };
    setHourlineIntervals(updated);
    saveHourlineIntervals(updated);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Timer color="#2563eb" size={20} style={{marginRight: 6}} /> Hour Line Settings</h3>
      </div>
      <div className="card-content">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date Range</label>
            <select
              className="form-select"
              value={dateRange}
              onChange={e => setDateRange(e.target.value as DateRange)}
            >
              <option value="FullYear">Full Year</option>
              <option value="SummerToWinter">Summer to Winter</option>
              <option value="WinterToSummer">Winter to Summer</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Hour Range</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                className="form-input"
                min={0}
                max={23}
                value={startHour}
                onChange={(e) => onUpdate(parseInt(e.target.value), stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
                style={{ width: '60px' }}
              />
              <span>to</span>
              <input
                type="number"
                className="form-input"
                min={startHour + 1}
                max={24}
                value={stopHour}
                onChange={(e) => onUpdate(startHour, parseInt(e.target.value), use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
                style={{ width: '60px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Interval</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Line Style</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {hourlineIntervals.map((interval, idx) => (
                <tr key={interval.id}>
                  <td style={{ padding: '0.3rem 0.3rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>{interval.name}</span>
                  </td>
                  <td style={{ padding: '0.3rem 0.3rem' }}>
                    <select
                      className="form-select"
                      value={interval.styleId}
                      onChange={e => handleChange(idx, 'styleId', e.target.value)}
                      style={{ fontSize: '0.9rem' }}
                    >
                      {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
                        <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.3rem 0.3rem' }}>
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={!!interval.active}
                      onChange={e => handleChange(idx, 'active', e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={use24Hour}
              onChange={(e) => onUpdate(startHour, stopHour, e.target.checked, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
            />
            24-hour time
          </label>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={declinationNoonmarks}
              onChange={(e) => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, e.target.checked)}
            />
            Declination Noonmarks
          </label>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={labelWinterSide}
              onChange={e => onUpdate(startHour, stopHour, use24Hour, e.target.checked, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
            />
            Winter label 
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={labelSummerSide}
                onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, e.target.checked, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
              />
             Summer label
            </label>
          </div>
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={useDST}
                disabled={!labelSummerSide}
                onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, e.target.checked, declinationNoonmarks)}
              />
              Daylight/Summer Time
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Label offset (mm)</label>
            <input
              type="number"
              className="form-input"
              min={0}
              max={100}
              step={1}
              value={labelOffset}
              onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, parseInt(e.target.value) || 0, fontFamily, fontSize, useDST, declinationNoonmarks)}
              style={{ width: '60px' }} // reduced width
            />
          </div>
          <div className="form-group">
            <label className="form-label">Font size (pt)</label>
            <input
              type="number"
              className="form-input"
              min={6}
              max={48}
              step={1}
              value={fontSize}
              onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, parseInt(e.target.value) || 10, useDST, declinationNoonmarks)}
              style={{ width: '80px' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Font family</label>
            <select
              className="form-select"
              value={fontFamily}
              onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, e.target.value, fontSize, useDST, declinationNoonmarks)}
              style={{ width: '140px' }}
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="Arial, Helvetica, sans-serif">Arial</option>
              <option value="Times New Roman, Times, serif">Times New Roman</option>
              <option value="Courier New, Courier, monospace">Courier New</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Verdana, Geneva, sans-serif">Verdana</option>
              <option value="Tahoma, Geneva, sans-serif">Tahoma</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export { loadHourlineIntervals, saveHourlineIntervals };
export default HourlineSettings; 