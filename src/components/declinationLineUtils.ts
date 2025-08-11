import type { DeclinationLine } from './DeclinationLineOptions';

export const BUILTIN_DECLINATION_LINES: DeclinationLine[] = [
  { active: true, date: 'Summer Solstice', styleId: 'default-hairline', fixed: true, id: 'summer-solstice' },
  { active: true, date: 'Equinox', styleId: 'default-hairline', fixed: true, id: 'equinox' },
  { active: true, date: 'Winter Solstice', styleId: 'default-hairline', fixed: true, id: 'winter-solstice' },
  { active: true, date: 'Month Boundaries', styleId: 'dashed-hairline', fixed: true, id: 'month-boundaries' },
  { active: true, date: 'Today', styleId: 'red-dashed-hairline', fixed: false, id: 'today' },
];

export const LOCAL_STORAGE_KEY = 'sundial-declination-lines';

export function loadDeclinationLines(): DeclinationLine[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return BUILTIN_DECLINATION_LINES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Start with built-ins
      const result = [...BUILTIN_DECLINATION_LINES];
      
      // Get user lines (non-fixed lines from localStorage)
      const userLines = parsed.filter((l: DeclinationLine) => !l.fixed);
      
      // For each user line, check if it's an override of a built-in
      userLines.forEach(userLine => {
        const builtinIndex = result.findIndex(builtin => builtin.id === userLine.id);
        if (builtinIndex !== -1) {
          // Replace the built-in with the user's version
          result[builtinIndex] = userLine;
        } else {
          // Add as a new user line
          result.push(userLine);
        }
      });
      
      return result;
    }
    return BUILTIN_DECLINATION_LINES;
  } catch {
    return BUILTIN_DECLINATION_LINES;
  }
}

export function saveDeclinationLines(lines: DeclinationLine[]) {
  // Only save user lines
  const userLines = lines.filter(l => !l.fixed);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...userLines]));
}

export const emptyLine: DeclinationLine = {
  active: false,
  date: '',
  styleId: 'red-dashed-hairline',
  id: '',
};