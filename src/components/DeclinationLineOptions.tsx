import React from 'react';
import type { LineStyle } from './LineSettings';

export type DeclinationLine = {
  active: boolean;
  date: string; // 'Solstice', 'Autumnal Equinox', 'Vernal Equinox', or a date string like 'March 12'
  styleId: string; // id or name of the line style
  fixed?: boolean; // true for built-in, non-deletable
  id: string; // unique
};

const BUILTIN_DECLINATION_LINES: DeclinationLine[] = [
  { active: true, date: 'Summer Solstice', styleId: 'default-hairline', fixed: true, id: 'summer-solstice' },
  { active: true, date: 'Equinox', styleId: 'default-hairline', fixed: true, id: 'equinox' },
  { active: true, date: 'Winter Solstice', styleId: 'default-hairline', fixed: true, id: 'winter-solstice' },
];

const LOCAL_STORAGE_KEY = 'sundial-declination-lines';

function loadDeclinationLines(): DeclinationLine[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return BUILTIN_DECLINATION_LINES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Always ensure built-ins are present at the top
      const userLines = parsed.filter((l: DeclinationLine) => !l.fixed);
      return [...BUILTIN_DECLINATION_LINES, ...userLines];
    }
    return BUILTIN_DECLINATION_LINES;
  } catch {
    return BUILTIN_DECLINATION_LINES;
  }
}

function saveDeclinationLines(lines: DeclinationLine[]) {
  // Only save user lines
  const userLines = lines.filter(l => !l.fixed);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...userLines]));
}

const emptyLine: DeclinationLine = {
  active: false,
  date: '',
  styleId: 'default-hairline',
  id: '',
};

const DeclinationLineOptions: React.FC<{
  lineStyles: LineStyle[];
  declinationLines: DeclinationLine[];
  setDeclinationLines: (lines: DeclinationLine[]) => void;
}> = ({ lineStyles, declinationLines, setDeclinationLines }) => {
  // Handle editing
  const handleChange = (idx: number, field: keyof DeclinationLine, value: string | boolean) => {
    const updated = [...declinationLines];
    updated[idx] = { ...updated[idx], [field]: value };
    
    // Check if this is the blank row (last row with no id)
    const isBlankRow = idx === declinationLines.length - 1 && updated[idx].id === '';
    
    if (isBlankRow) {
      // If editing the date field and it's not empty, make it active and create a new blank row
      if (field === 'date' && value && value !== '') {
        updated[idx].active = true;
        updated[idx].id = `user-${Date.now()}`;
        updated.push({ ...emptyLine });
      }
      // If editing the active field, don't allow the blank row to be checked
      else if (field === 'active') {
        updated[idx].active = false;
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
        <h3 className="card-title">📅 Declination Lines</h3>
      </div>
      <div className="card-content">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Line Style</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Active</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}></th>
              </tr>
            </thead>
            <tbody>
              {(declinationLines[declinationLines.length - 1]?.id === '' ? declinationLines : [...declinationLines, { ...emptyLine }]).map((line, idx) => {
                const isBlank = !line.id && !line.date;
                const isFixed = line.fixed;
                const showDelete = !isFixed && !isBlank && line.date;
                return (
                  <tr key={line.id || `blank-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={line.date}
                        onChange={e => handleChange(idx, 'date', e.target.value)}
                        disabled={!!isFixed}
                        style={{ width: '140px', fontSize: '0.9rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <select
                        className="form-select"
                        value={line.styleId}
                        onChange={e => handleChange(idx, 'styleId', e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      >
                        {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
                          <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={!!line.active}
                        onChange={e => handleChange(idx, 'active', e.target.checked)}
                        disabled={isBlank}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {showDelete && (
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => handleDelete(idx)} 
                          title="Delete"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          ✕
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

export { loadDeclinationLines, saveDeclinationLines };
export default DeclinationLineOptions; 