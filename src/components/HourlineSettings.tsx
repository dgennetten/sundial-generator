import React from 'react';
import type { LineStyle } from './LineSettings';
import { Clock } from 'lucide-react';
import { saveHourlineIntervals, saveHourlineOverrides, type HourlineInterval } from './hourlineUtils';

type DateRange = 'FullYear' | 'SummerToFall' | 'WinterToSpring' | 'DualHalf';

interface HourlineSettingsProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  /** When true, the Date Range is fixed to "Dual-Half" and the control is disabled. */
  dateRangeLocked?: boolean;
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
  showFullYearOnNoon: boolean;
  setShowFullYearOnNoon: (v: boolean) => void;
  // Equation-of-Time correction — same flag as in About → Components of Correction
  equationOfTimeCorrection: boolean;
  setEquationOfTimeCorrection: (v: boolean) => void;
  showBelowHorizonHourLines: boolean;
  setShowBelowHorizonHourLines: (v: boolean) => void;
  syncBelowHorizon: boolean;
  setSyncBelowHorizon: (v: boolean) => void;
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
  dateRangeLocked = false,
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
  showFullYearOnNoon,
  setShowFullYearOnNoon,
  equationOfTimeCorrection,
  setEquationOfTimeCorrection,
  showBelowHorizonHourLines,
  setShowBelowHorizonHourLines,
  syncBelowHorizon,
  setSyncBelowHorizon,
  onUpdate,
}) => {

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;


  const handleChange = (idx: number, field: keyof HourlineInterval, value: string | boolean) => {
    const updated = [...hourlineIntervals];
    updated[idx] = { ...updated[idx], [field]: value };
    setHourlineIntervals(updated);
    saveHourlineIntervals(updated);
    const it = updated[idx];
    if (it.fixed && (field === 'active' || field === 'styleId')) {
      if (field === 'active') {
        saveHourlineOverrides({ [it.id]: { active: !!value } });
      } else {
        saveHourlineOverrides({ [it.id]: { styleId: value as string } });
      }
    }
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
              disabled={dateRangeLocked}
              title={dateRangeLocked ? 'Dual-Dial Pop-up uses a fixed summer + winter split' : undefined}
              style={{ minWidth: isMobile ? '100px' : 'auto', padding: '0.5rem 0.6rem' }}
            >
              <option value="FullYear">Full Year</option>
              <option value="SummerToFall">Summer - Fall</option>
              <option value="WinterToSpring">Winter - Spring</option>
              <option value="DualHalf" disabled>Dual-Half Year</option>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={declinationNoonmarks}
                onChange={(e) => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, e.target.checked)}
              />
              Noon Date Marks
            </label>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={equationOfTimeCorrection}
                onChange={(e) => setEquationOfTimeCorrection(e.target.checked)}
              />
              EoT Correction
            </label>
            {dateRange !== 'FullYear' && (
              <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={showFullYearOnNoon}
                  onChange={(e) => setShowFullYearOnNoon(e.target.checked)}
                />
                Full Year Noon
              </label>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={labelWinterSide}
                onChange={e => onUpdate(startHour, stopHour, use24Hour, e.target.checked, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
              />
              Winter
            </label>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={labelSummerSide}
                onChange={e => onUpdate(startHour, stopHour, use24Hour, labelWinterSide, e.target.checked, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
              />
              Summer
            </label>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={use24Hour}
                onChange={(e) => onUpdate(startHour, stopHour, e.target.checked, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks)}
              />
              24 hr
            </label>
          </div>
          <div>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
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
          <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={showBelowHorizonHourLines}
                onChange={e => setShowBelowHorizonHourLines(e.target.checked)}
              />
              Show below-horizon hour lines
            </label>
            <label className="form-checkbox" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={syncBelowHorizon}
                onChange={e => setSyncBelowHorizon(e.target.checked)}
              />
              Sync date lines
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