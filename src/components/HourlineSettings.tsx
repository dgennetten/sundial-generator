import React from 'react';
import type { LineStyle } from './LineSettings';
import { Clock } from 'lucide-react';
import { saveHourlineIntervals, type HourlineInterval } from './hourlineUtils';

type DateRange = 'FullYear' | 'SummerToFall' | 'WinterToSpring';

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

const HourlineSettings: React.FC<HourlineSettingsProps> = React.memo(({
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

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;


  const handleChange = (idx: number, field: keyof HourlineInterval, value: string | boolean) => {
    const updated = [...hourlineIntervals];
    updated[idx] = { ...updated[idx], [field]: value };
    setHourlineIntervals(updated);
    saveHourlineIntervals(updated);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Clock color="#2563eb" size={20} style={{marginRight: 6}} /> Hour Lines</h3>
      </div>
      <div className="card-content">
        <div 
          className="form-row" 
          style={{ 
            display: 'flex', 
            alignItems: 'end', 
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: isMobile ? 'row' : 'row' // Keep as row for mobile since they can fit
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Date Range</label>
            <select
              className="form-select form-select-primary"
              value={dateRange}
              onChange={e => setDateRange(e.target.value as DateRange)}
              style={{ minWidth: isMobile ? '100px' : 'auto', padding: '0.5rem 0.6rem' }}
            >
              <option value="FullYear">Full Year</option>
              <option value="SummerToFall">Summer - Fall</option>
              <option value="WinterToSpring">Winter - Spring</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '1' }}>
            <label className="form-label">Hour Range</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                className="form-input"
                min={0}
                max={23}
                value={startHour}
                onChange={(e) => onUpdate(parseInt(e.target.value), stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
                style={{ width: isMobile ? '40px' : '60px' }}
              />
              <span>to</span>
              <input
                type="number"
                className="form-input"
                min={startHour + 1}
                max={24}
                value={stopHour}
                onChange={(e) => onUpdate(startHour, parseInt(e.target.value), use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
                style={{ width: isMobile ? '40px' : '60px' }}
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
                      {lineStyles.filter(s => s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('hourline'))).map(style => (
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
            Noon Date Marks
          </label>
        </div>

        <div
          className="form-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.75rem' : '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: isMobile ? '0.75rem' : '1.25rem',
              flexWrap: 'nowrap',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={labelWinterSide}
                  onChange={e => onUpdate(startHour, stopHour, use24Hour, e.target.checked, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
                />
                Winter label
              </label>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={labelSummerSide}
                  onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, e.target.checked, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
                />
                Summer label
              </label>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={useDST}
                disabled={!labelSummerSide}
                onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, e.target.checked, declinationNoonmarks)}
                title="Automatically controlled by location timezone"
              />
              Daylight/Summer Time (Auto)
            </label>
          </div>
        </div>

        <div 
          className="form-row" 
          style={{ 
            display: 'flex', 
            alignItems: 'end', 
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: isMobile ? 'row' : 'row' // Keep as row for mobile since they can fit
          }}
        >
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '0 0 auto' }}>
            <label className="form-label">Label offset (mm)</label>
            <input
              type="number"
              className="form-input"
              min={0}
              max={100}
              step={1}
              value={labelOffset}
              onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, parseInt(e.target.value) || 0, fontFamily, fontSize, useDST, declinationNoonmarks)}
              style={{ width: isMobile ? '50px' : '60px' }}
            />
          </div>
          <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : '0 0 auto' }}>
            <label className="form-label">Font size (pt)</label>
            <input
              type="number"
              className="form-input"
              min={6}
              max={48}
              step={1}
              value={fontSize}
              onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, parseInt(e.target.value) || 10, useDST, declinationNoonmarks)}
              style={{ width: isMobile ? '60px' : '80px' }}
            />
          </div>
          <div className="form-group" style={{ flex: isMobile ? '1 1 auto' : '0 0 auto' }}>
            <label className="form-label">Font family</label>
            <select
              className="form-select"
              value={fontFamily}
              onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, e.target.value, fontSize, useDST, declinationNoonmarks)}
              style={{ width: isMobile ? '100%' : '140px' }}
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
});

export default HourlineSettings;