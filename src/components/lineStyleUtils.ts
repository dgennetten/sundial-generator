import type { LineStyle } from './LineSettings';

export const DEFAULT_LINE_STYLES: LineStyle[] = [
  {
    width: 'hairline',
    color: 'black',
    style: 'solid',
    name: 'default hairline',
    id: 'default-hairline',
    fixed: true,
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'dashed',
    name: 'dashed hairline',
    id: 'dashed-hairline',
    fixed: true,
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'dotted',
    name: 'dotted hairline',
    id: 'dotted-hairline',
    fixed: true,
  },
  {
    width: '0.5mm',
    color: 'black',
    style: 'solid',
    name: '.5mm black',
    id: '0.5mm-black',
  },
  {
    width: '1mm',
    color: 'black',
    style: 'solid',
    name: 'Fat Black',
    id: 'fat-black',
    fixed: true,
  },
  {
    width: '0.5mm',
    color: 'red',
    style: 'solid',
    name: 'Fat Red',
    id: 'red-dashed-hairline',
    fixed: true,
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'calculated',
    name: 'D: 2min dot',
    id: 'declination-2min-dot',
    fixed: true,
    calculatedType: 'declination-2min-dot',
    applicableToLines: ['declination'],
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'calculated',
    name: 'D: 5min dot',
    id: 'declination-5min-dot',
    fixed: true,
    calculatedType: 'declination-5min-dot',
    applicableToLines: ['declination'],
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'calculated',
    name: 'D: 2min dash',
    id: 'declination-2min-dash',
    fixed: true,
    calculatedType: 'declination-2min-dash',
    applicableToLines: ['declination'],
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'calculated',
    name: 'H: 5/2 day dash',
    id: 'hourline-5-2-day-dash',
    fixed: true,
    calculatedType: 'hourline-5-2-day-dash',
    applicableToLines: ['hourline'],
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'calculated',
    name: 'H: 2/5 day dash',
    id: 'hourline-2-5-day-dash',
    fixed: true,
    calculatedType: 'hourline-2-5-day-dash',
    applicableToLines: ['hourline'],
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'calculated',
    name: 'H: 2/2 day dash',
    id: 'hourline-2-2-day-dash',
    fixed: true,
    calculatedType: 'hourline-2-2-day-dash',
    applicableToLines: ['hourline'],
  }
];

export const LOCAL_STORAGE_KEY = 'sundial-line-styles';

export function loadLineStyles(): LineStyle[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return DEFAULT_LINE_STYLES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge defaults with stored, ensuring all built-ins exist (including red-dashed-hairline)
      const byId = new Map<string, LineStyle>();
      DEFAULT_LINE_STYLES.forEach(d => byId.set(d.id, d));
      parsed.forEach((p: LineStyle) => byId.set(p.id, p));
      return Array.from(byId.values());
    }
    return DEFAULT_LINE_STYLES;
  } catch {
    return DEFAULT_LINE_STYLES;
  }
}

export function saveLineStyles(styles: LineStyle[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(styles));
}

export function isValidCssColor(str: string) {
  if (!str) return false;
  const s = new Option().style;
  s.color = '';
  s.color = str;
  return !!s.color;
}

export const emptyLine: LineStyle = {
  width: 'hairline',
  color: 'black',
  style: 'solid',
  name: '',
  id: '',
  calculatedType: undefined,
  applicableToLines: undefined,
}; 