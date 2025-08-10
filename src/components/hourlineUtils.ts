export type HourlineInterval = {
  active: boolean;
  name: string;
  styleId: string;
  id: string;
  fixed?: boolean;
};

const BUILTIN_HOURLINE_INTERVALS: HourlineInterval[] = [
  { active: true, name: 'Hour', styleId: '0.5mm-black', fixed: true, id: 'hour' },
  { active: true, name: 'Half-hour', styleId: 'default-hairline', fixed: true, id: 'half-hour' },
  { active: true, name: 'Quarter-hour', styleId: 'dashed-hairline', fixed: true, id: 'quarter-hour' },
  { active: false, name: '5-minute', styleId: 'dotted-hairline', fixed: true, id: '5-minute' },
  { active: false, name: '2-minute', styleId: 'dotted-hairline', fixed: true, id: '2-minute' },
];

const LOCAL_STORAGE_KEY = 'sundial-hourline-intervals';

export function loadHourlineIntervals(): HourlineInterval[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return BUILTIN_HOURLINE_INTERVALS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Always ensure built-ins are present
      const userIntervals = parsed.filter((i: HourlineInterval) => !i.fixed);
      return [...BUILTIN_HOURLINE_INTERVALS, ...userIntervals];
    }
    return BUILTIN_HOURLINE_INTERVALS;
  } catch {
    return BUILTIN_HOURLINE_INTERVALS;
  }
}

export function saveHourlineIntervals(intervals: HourlineInterval[]) {
  // Only save user intervals
  const userIntervals = intervals.filter(i => !i.fixed);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...userIntervals]));
}
