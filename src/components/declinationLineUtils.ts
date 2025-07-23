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
      // Always ensure built-ins are present at the top
      const userLines = parsed.filter((l: DeclinationLine) => !l.fixed);
      return [...BUILTIN_DECLINATION_LINES, ...userLines];
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
  styleId: 'default-hairline',
  id: '',
}; 