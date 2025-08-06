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
    width: 'hairline',
    color: 'red',
    style: 'dashed',
    name: 'red dash hairline',
    id: 'red-dashed-hairline',
  }
];

export const LOCAL_STORAGE_KEY = 'sundial-line-styles';

export function loadLineStyles(): LineStyle[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return DEFAULT_LINE_STYLES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Always ensure the default is present
      const hasDefault = parsed.some((s: LineStyle) => s.id === 'default-hairline');
      if (!hasDefault) return [DEFAULT_LINE_STYLES[0], ...parsed];
      return parsed;
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
  width: '',
  color: '',
  style: 'solid',
  name: '',
  id: '',
}; 