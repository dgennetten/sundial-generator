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
  active: true,
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
    // Always set required fields for the blank row
    if (idx === declinationLines.length - 1 && updated[idx].id === '') {
      if (!updated[idx].id) updated[idx].id = `user-${Date.now()}`;
      if (!updated[idx].styleId) updated[idx].styleId = 'default-hairline';
      // Only set active: true if the user is not editing the 'active' field
      if (field !== 'active') updated[idx].active = true;
    }
    // If editing the blank row, add a new blank row
    if (idx === declinationLines.length - 1 && declinationLines[idx].id === '') {
      // If any field is non-empty, create a new user line
      const isNonEmpty = Object.entries(updated[idx]).some(([k, v]) => k !== 'id' && v && v !== '');
      if (isNonEmpty) {
        updated.push({ ...emptyLine });
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
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Declination Line Options</strong></legend>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Active</th>
            <th>Date</th>
            <th>Line Style</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(declinationLines[declinationLines.length - 1]?.id === '' ? declinationLines : [...declinationLines, { ...emptyLine }]).map((line, idx) => {
            const isBlank = !line.id && !line.date;
            const isFixed = line.fixed;
            const showDelete = !isFixed && !isBlank && line.date;
            return (
              <tr key={line.id || `blank-${idx}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!line.active}
                    onChange={e => handleChange(idx, 'active', e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.date}
                    onChange={e => handleChange(idx, 'date', e.target.value)}
                    disabled={!!isFixed}
                    style={{ width: '140px' }}
                  />
                </td>
                <td>
                  <select
                    value={line.styleId}
                    onChange={e => handleChange(idx, 'styleId', e.target.value)}
                    disabled={!!isFixed}
                  >
                    {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
                      <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {showDelete && (
                    <button type="button" onClick={() => handleDelete(idx)} title="Delete">X</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );
};

export { loadDeclinationLines, saveDeclinationLines };
export default DeclinationLineOptions; 