export type HourlineInterval = {
  active: boolean;
  name: string;
  styleId: string;
  id: string;
  fixed?: boolean;
};

const BUILTIN_HOURLINE_INTERVALS: HourlineInterval[] = [
  { active: true, name: 'Hour', styleId: '0.5mm-black', fixed: true, id: 'hour' },
  { active: true, name: 'Half-hour', styleId: 'hourline-5-2-day-dash', fixed: true, id: 'half-hour' },
  { active: false, name: 'Quarter-hour', styleId: 'hourline-5-2-day-dash', fixed: true, id: 'quarter-hour' },
  { active: false, name: '5-minute', styleId: 'dotted-hairline', fixed: true, id: '5-minute' },
  { active: false, name: '2-minute', styleId: 'dotted-hairline', fixed: true, id: '2-minute' },
];

const LOCAL_STORAGE_KEY = 'sundial-hourline-intervals';
const OVERRIDES_KEY = 'sundial-hourline-overrides';

type HourlineOverride = Partial<Pick<HourlineInterval, 'active' | 'styleId'>>;

type OverrideMap = { [id: string]: HourlineOverride };

function loadOverrides(): OverrideMap {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as OverrideMap : {};
  } catch {
    return {};
  }
}

function applyOverrides(builtins: HourlineInterval[], overrides: OverrideMap): HourlineInterval[] {
  return builtins.map(i => overrides[i.id] ? { ...i, ...overrides[i.id] } : i);
}

export function saveHourlineOverrides(overrides: OverrideMap) {
  const existing = loadOverrides();
  const merged: OverrideMap = { ...existing, ...overrides };
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(merged));
}

export function loadHourlineIntervals(): HourlineInterval[] {
  const overrides = loadOverrides();
  const builtIns = applyOverrides(BUILTIN_HOURLINE_INTERVALS, overrides);

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return builtIns;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Only keep user intervals; merge with built-ins (with overrides applied)
      const userIntervals = parsed.filter((i: HourlineInterval) => !i.fixed);
      return [...builtIns, ...userIntervals];
    }
    return builtIns;
  } catch {
    return builtIns;
  }
}

export function saveHourlineIntervals(intervals: HourlineInterval[]) {
  // Only save user intervals
  const userIntervals = intervals.filter(i => !i.fixed);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...userIntervals]));
}
