import React from 'react';
import type { LineStyle } from './LineSettings';
import { Sunrise } from 'lucide-react';
import { saveDeclinationLines, emptyLine } from './declinationLineUtils';

export type DeclinationLine = {
  active: boolean;
  date: string; // 'Solstice', 'Autumnal Equinox', 'Vernal Equinox', or a date string like 'March 12'
  styleId: string; // id or name of the line style
  fixed?: boolean; // true for built-in, non-deletable
  id: string; // unique
};

const DeclinationLineOptions: React.FC<{
  lineStyles: LineStyle[];
  declinationLines: DeclinationLine[];
  setDeclinationLines: (lines: DeclinationLine[]) => void;
  dateRange?: 'FullYear' | 'SummerToFall' | 'WinterToSpring';
  lat?: number;
}> = ({ lineStyles, declinationLines, setDeclinationLines, dateRange = 'FullYear', lat = 0 }) => {
  const [draftDate, setDraftDate] = React.useState('');
  const [draftStyle, setDraftStyle] = React.useState('red-dashed-hairline');
  const isDayInRange = (day: number): boolean => {
    if (dateRange === 'FullYear') return true;
    const isNorthern = lat >= 0;
    const summerSolstice = isNorthern ? 172 : 355;
    const winterSolstice = isNorthern ? 355 : 172;
    if (dateRange === 'SummerToFall') {
      return isNorthern ? (day >= summerSolstice && day <= winterSolstice)
                        : (day >= summerSolstice || day <= winterSolstice);
    }
    // WinterToSpring
    return isNorthern ? (day >= winterSolstice || day <= summerSolstice)
                      : (day >= winterSolstice && day <= summerSolstice);
  };

  const isDateStringInRange = (dateStr: string): boolean => {
    if (!dateStr || dateStr === '1st of the Month' || dateStr === '1st and 15th' || dateStr === 'Equinox' || dateStr === 'Summer Solstice' || dateStr === 'Winter Solstice') return true;
    if (dateStr === 'Today') {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return isDayInRange(dayOfYear);
    }
    // Robust parse for 'Month Day' with short or long month names
    const m = /^(\w+)\s+(\d{1,2})$/i.exec(dateStr.trim());
    let date: Date;
    if (m) {
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const mi = months.indexOf(m[1].slice(0,3).toLowerCase());
      const day = parseInt(m[2], 10);
      if (mi >= 0 && day >= 1 && day <= 31) {
        date = new Date(2000, mi, day);
      } else {
        date = new Date(dateStr + ' 2000');
      }
    } else {
      date = new Date(dateStr + ' 2000');
    }
    if (isNaN(date.getTime())) return true; // unknown format, don't block
    const start = new Date(date.getFullYear(), 0, 0);
    const day = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return isDayInRange(day);
  };

  // Handle editing
  const handleChange = (idx: number, field: keyof DeclinationLine, value: string | boolean) => {
    const updated = [...declinationLines];

    // Robust validator for 'Month Day' (short/long month) or 'Today'
    const isValidDateStr = (s: string): boolean => {
      if (!s) return false;
      if (s === 'Today') return true;
      const m = /^(\w+)\s+(\d{1,2})$/i.exec(String(s).trim());
      if (m) {
        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const mi = months.indexOf(m[1].slice(0,3).toLowerCase());
        const day = parseInt(m[2], 10);
        return mi >= 0 && day >= 1 && day <= 31;
      }
      const d = new Date(String(s) + ' 2000');
      return !isNaN(d.getTime());
    };

    const isSyntheticBlankRow = idx === declinationLines.length && (declinationLines[declinationLines.length - 1]?.id !== '');
    const isRealBlankRow = idx === declinationLines.length - 1 && updated[idx]?.id === '';

    if (isSyntheticBlankRow) {
      // Editing the extra blank row that is not yet in state
      const str = field === 'date' ? String(value || '').trim() : '';
      // Update draft states to keep input controlled without creating a row yet
      if (field === 'date') setDraftDate(String(value));
      if (field === 'styleId') setDraftStyle(String(value));
      // Only promote and append a new blank when we have a valid full date
      if (field === 'date' && isValidDateStr(str)) {
        const newLine = {
          ...emptyLine,
          active: true,
          styleId: 'red-dashed-hairline',
          date: String(value),
          id: `user-${Date.now()}`,
        } as DeclinationLine;
        updated.push(newLine);
        // Reset drafts for a fresh blank row
        setDraftDate('');
        setDraftStyle('red-dashed-hairline');
      }
    } else {
      // Safe to update existing row
      updated[idx] = { ...updated[idx], [field]: value } as DeclinationLine;

      if (isRealBlankRow) {
        if (field === 'date') {
          const str = String(value || '').trim();
          if (isValidDateStr(str)) {
            updated[idx].active = true;
            updated[idx].styleId = 'red-dashed-hairline';
            updated[idx].id = `user-${Date.now()}`;
          } else {
            updated[idx].active = false;
            updated[idx].id = '';
          }
        } else if (field === 'active') {
          updated[idx].active = false;
        }
      }
    }

    // If we only updated draft values for the synthetic row and did not promote, avoid touching state
    if (isSyntheticBlankRow) {
      const str = field === 'date' ? String(value || '').trim() : '';
      if (!(field === 'date' && isValidDateStr(str))) {
        return;
      }
    }

    setDeclinationLines(updated);
    saveDeclinationLines(updated.filter((l) => l.id));
  };

  // Handle delete
  const handleDelete = (idx: number) => {
    const updated = declinationLines.filter((_, i) => i !== idx);
    setDeclinationLines(updated);
    saveDeclinationLines(updated.filter((l) => l.id));
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Sunrise color="#2563eb" size={20} style={{marginRight: 6}} /> Declination Lines</h3>
      </div>
      <div className="card-content">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Line Style</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Active</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}></th>
              </tr>
            </thead>
            <tbody>
              {(declinationLines[declinationLines.length - 1]?.id === '' ? declinationLines : [...declinationLines, { ...emptyLine }]).map((line, idx) => {
                const isBlank = !line.id && !line.date;
                const isFixed = line.fixed;
                const showDelete = !isFixed && !isBlank && line.date;
                return (
                  <tr key={`decl-${idx}`}>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={line.id === '' ? draftDate : (line.date)}
                          onChange={e => handleChange(idx, 'date', e.target.value)}
                          disabled={!!isFixed}
                          placeholder="Month Day"
                          style={{ width: '130px', fontSize: '0.9rem', paddingRight: '20px' }}
                          title={!isDateStringInRange(line.date) ? 'date not within selected date range' : undefined}
                        />
                        {!isDateStringInRange(line.date) && (
                          <span
                            title="date not within selected date range"
                            style={{
                              position: 'absolute',
                              right: 4,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#f59e0b',
                              fontSize: '14px',
                              pointerEvents: 'none',
                            }}
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <select
                        className="form-select"
                        value={line.id === '' ? draftStyle : ((line.styleId && lineStyles.some(s => s.id === line.styleId || s.name === line.styleId)) ? line.styleId : 'red-dashed-hairline')}
                        onChange={e => handleChange(idx, 'styleId', e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      >
                        {lineStyles.filter(s => s.name && s.name.trim() && (!s.applicableToLines || s.applicableToLines.includes('declination'))).map(style => (
                          <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={!!line.active}
                        onChange={e => handleChange(idx, 'active', e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem', textAlign: 'center' }}>
                      {showDelete && (
                        <button
                          className="btn btn-xs"
                          onClick={() => handleDelete(idx)}
                          title="Delete"
                          style={{
                            fontSize: '0.8rem',
                            width: 18,
                            height: 18,
                            minWidth: 0,
                            padding: 0,
                            lineHeight: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeclinationLineOptions;