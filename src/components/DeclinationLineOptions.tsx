import React from 'react';
import type { LineStyle } from './LineSettings';
import { Calendar } from 'lucide-react';
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
  const lastInputRef = React.useRef<HTMLInputElement | null>(null);
  const shouldRestoreFocusRef = React.useRef(false);
  const promotionTimerRef = React.useRef<number | null>(null);
  const promotionTokenRef = React.useRef(0);
  const pendingSyntheticDateRef = React.useRef<string>('');
  const pendingSyntheticStyleRef = React.useRef<string>(draftStyle);

  React.useEffect(() => {
    pendingSyntheticStyleRef.current = draftStyle;
  }, [draftStyle]);

  React.useEffect(() => {
    return () => {
      if (promotionTimerRef.current) window.clearTimeout(promotionTimerRef.current);
    };
  }, []);
  
  // Restore focus to the last input after a new row is created
  React.useEffect(() => {
    if (shouldRestoreFocusRef.current && lastInputRef.current) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        lastInputRef.current?.focus();
        shouldRestoreFocusRef.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [declinationLines.length]);
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
    // Range support: Month Day-Day (e.g. "July 1-8")
    const rangeRe = /^([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2})$/;
    const rangeMatch = rangeRe.exec(dateStr.trim());
    if (rangeMatch) {
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const mShort = rangeMatch[1].slice(0, 3).toLowerCase();
      const mi = months.indexOf(mShort);
      const startDay = parseInt(rangeMatch[2], 10);
      const endDay = parseInt(rangeMatch[3], 10);
      if (mi >= 0 && startDay >= 1 && startDay <= 31 && endDay >= 1 && endDay <= 31 && endDay >= startDay) {
        // Consider the range valid only if *all* dates are within the selected dateRange
        for (let d = startDay; d <= endDay; d++) {
          const date = new Date(2000, mi, d);
          if (isNaN(date.getTime())) return true; // unknown -> don't block
          const start = new Date(date.getFullYear(), 0, 0);
          const day = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (!isDayInRange(day)) return false;
        }
        return true;
      }
      return false;
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
    let didPromote = false;

    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const normalizeMonthShort = (rawToken: string): string | null => {
      const token = String(rawToken).trim();
      // Avoid partial inputs like "J" or "Ju" from being treated as valid dates.
      if (token.length < 3) return null;
      const key = token.slice(0, 3).toLowerCase();
      if (!months.includes(key)) return null;
      return key.charAt(0).toUpperCase() + key.slice(1);
    };

    const parseDateInput = (
      input: string,
    ):
      | { type: 'single'; date: string; dayTokenLen: number }
      | { type: 'range'; startDay: number; endDay: number; monthShort: string }
      | null => {
      const s = String(input || '').trim();
      if (!s) return null;

      if (s.toLowerCase() === 'today') {
        return { type: 'single', date: 'Today', dayTokenLen: 2 };
      }

      // Accept "July 1" or "Jul 1" (exact, complete input only).
      const singleRe = /^([A-Za-z]+)\s+(\d{1,2})$/;
      const mSingle = singleRe.exec(s);
      if (mSingle) {
        const monthShort = normalizeMonthShort(mSingle[1]);
        if (!monthShort) return null;
        const day = parseInt(mSingle[2], 10);
        if (day < 1 || day > 31) return null;
        const dayTokenLen = mSingle[2].length;
        return { type: 'single', date: `${monthShort} ${day}`, dayTokenLen };
      }

      // Accept "July 1-5" (range, inclusive).
      const rangeRe = /^([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2})$/;
      const mRange = rangeRe.exec(s);
      if (mRange) {
        const monthShort = normalizeMonthShort(mRange[1]);
        if (!monthShort) return null;
        const startDay = parseInt(mRange[2], 10);
        const endDay = parseInt(mRange[3], 10);
        if (startDay < 1 || startDay > 31) return null;
        if (endDay < 1 || endDay > 31) return null;
        if (endDay < startDay) return null;
        return { type: 'range', startDay, endDay, monthShort };
      }

      return null;
    };

    const isSyntheticBlankRow = idx === declinationLines.length && (declinationLines[declinationLines.length - 1]?.id !== '');
    const isRealBlankRow = idx === declinationLines.length - 1 && updated[idx]?.id === '';

    if (isSyntheticBlankRow) {
      // Editing the extra blank row that is not yet in state
      const str = field === 'date' ? String(value || '').trim() : '';
      // Update draft states to keep input controlled without creating a row yet
      if (field === 'date') setDraftDate(String(value));
      if (field === 'styleId') setDraftStyle(String(value));
      // Only promote and append new lines when we have a complete, parseable date/range.
      if (field === 'date') {
        const parsed = parseDateInput(str);

        // Cancel any in-flight promotion when user changes the input.
        if (promotionTimerRef.current) window.clearTimeout(promotionTimerRef.current);
        promotionTimerRef.current = null;
        promotionTokenRef.current += 1;

        if (!parsed) {
          return;
        }

        if (parsed.type === 'range') {
          // If the user has completed a range, promote immediately as a *single* row.
          // Rendering expands it later (in App.tsx) so the UI doesn't create 8 separate inputs.
          const baseId = `user-${Date.now()}`;
          didPromote = true;
          updated.push({
            ...emptyLine,
            active: true,
            styleId: pendingSyntheticStyleRef.current,
            date: `${parsed.monthShort} ${parsed.startDay}-${parsed.endDay}`,
            id: `${baseId}-0`,
          } as DeclinationLine);
          setDraftDate('');
          setDraftStyle('red-dashed-hairline');
          shouldRestoreFocusRef.current = true;
        } else {
          // For single dates: debounce promotion so users can continue typing a range
          // (e.g. "July 1-10" should not immediately create a new row after "July 1").
          const delayMs = parsed.type === 'single' && parsed.dayTokenLen === 1 ? 1500 : 600;
          pendingSyntheticDateRef.current = str;
          const token = promotionTokenRef.current;
          promotionTimerRef.current = window.setTimeout(() => {
            // If user has typed more since scheduling, don't promote.
            if (promotionTokenRef.current !== token) return;

            const current = String(pendingSyntheticDateRef.current || '').trim();
            const parsedNow = parseDateInput(current);
            if (!parsedNow || parsedNow.type !== 'single') return;

            const baseId = `user-${Date.now()}`;
            const newLine: DeclinationLine = {
              ...emptyLine,
              active: true,
              styleId: pendingSyntheticStyleRef.current,
              date: parsedNow.date,
              id: `${baseId}-0`,
            };

            const next = [...declinationLines, newLine];
            setDeclinationLines(next);
            saveDeclinationLines(next.filter(l => l.id));

            setDraftDate('');
            setDraftStyle('red-dashed-hairline');
            shouldRestoreFocusRef.current = true;
          }, delayMs);
        }
      }
    } else {
      // Safe to update existing row
      updated[idx] = { ...updated[idx], [field]: value } as DeclinationLine;

      if (isRealBlankRow) {
        if (field === 'date') {
          const str = String(value || '').trim();
          const parsed = parseDateInput(str);
          if (parsed) {
            // Range expansion on a "real" blank row: replace the blank row with multiple date rows.
            if (parsed.type === 'range') {
              // Keep as a single row; rendering will expand to per-day marks.
              updated[idx].active = true;
              updated[idx].styleId = draftStyle;
              updated[idx].date = `${parsed.monthShort} ${parsed.startDay}-${parsed.endDay}`;
              updated[idx].id = `user-${Date.now()}`;
            } else {
              updated[idx].active = true;
              updated[idx].styleId = draftStyle;
              updated[idx].date = parsed.date;
              updated[idx].id = `user-${Date.now()}`;
            }
          } else {
            updated[idx].active = false;
            updated[idx].id = '';
            updated[idx].date = '';
          }
        } else if (field === 'active') {
          updated[idx].active = false;
        }
      }
    }

    // If we only updated draft values for the synthetic row and did not promote, avoid touching state
    if (isSyntheticBlankRow) {
      if (!didPromote) return;
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
        <h3 className="card-title"><Calendar color="#2563eb" size={20} style={{marginRight: 6}} /> Date Lines (declination)</h3>
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
                const isLastRow = idx === (declinationLines[declinationLines.length - 1]?.id === '' ? declinationLines : [...declinationLines, { ...emptyLine }]).length - 1;
                const isBlankRow = line.id === '';
                const rangeHelp = 'Month Day or Month Day-Day (e.g. July 1-5)';
                return (
                  <tr key={`decl-${idx}`}>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <input
                          ref={isLastRow && isBlankRow ? lastInputRef : null}
                          type="text"
                          className="form-input"
                          value={line.id === '' ? draftDate : (line.date)}
                          onChange={e => handleChange(idx, 'date', e.target.value)}
                          disabled={!!isFixed}
                            placeholder="Month Day or Month Day-Day (e.g. July 1-5)"
                          style={{ width: '130px', fontSize: '0.9rem', paddingRight: '20px' }}
                          title={
                            !isDateStringInRange(line.date)
                              ? `${rangeHelp}. Date not within selected date range.`
                              : rangeHelp
                          }
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