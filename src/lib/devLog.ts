export interface LogEntry {
  id: number
  date: string  // YYYY-MM-DD
  content: string
}

// Add new entries at the END with a higher id — the modal shows the latest first.
export const LOG_ENTRIES: LogEntry[] = [
  {
    id: 1,
    date: '2026-06-05',
    content: "Introducing the Developer's Log — a way to surface the latest app changes directly to you. Rather than hunting through a changelog, you'll see a note here whenever something meaningful ships. I liked the idea so much I'm bringing it to all my apps. More to come! — KDG (v2.12.0)",
  },
  {
    id: 2,
    date: '2026-06-05',
    content: "NEW GREETING CARD DIAL!: in the gnomon dropdown, select 'Glued Popup'. Early Beta. Send Feedback!! Note the new **Preview** toggle. — KDG (v2.13.0)",
  },
  {
    id: 3,
    date: '2026-06-13',
    content: "Cut-and-Fold gnomon nets are now always printed at full scale — if the gnomon is too large to fit three on a page, the count drops to two or one rather than shrinking them. — KDG (v2.15.0)",
  },
  {
    id: 4,
    date: '2026-06-13',
    content: "Text block color prefixes: start any line with [red], [blue], [teal], etc. to color that line. Works with bold and italic too — e.g. [red]**{today}**. — KDG (v2.16.0)",
  },
  {
    id: 5,
    date: '2026-06-20',
    content: "Date lines now show labels! Look for the **Date line labels** checkbox in the Date Lines section. Each label is rotated parallel to its date line and tucked just inside the right border. If Noon Date Marks are enabled, a toggle lets you move the labels next to the noon marks instead. Labels are translated to your chosen language. — KDG (v2.14.3)",
  },
  {
    id: 6,
    date: '2026-06-25',
    content: "**Atmospheric Refraction** is now a live correction you can toggle. Earth's atmosphere bends sunlight near the horizon — making the sun appear slightly higher than it truly is. On a sundial this shifts the shadow position, most noticeably at low solar altitudes (early morning, late evening, and winter hours at higher latitudes). The correction uses **Bennett's formula** (R = 1.02 / tan(h + 10.3/(h + 5.11))), accurate to ~0.07 arcminutes. Open **Components of Correction** in the About card to experiment. Dial decoration text is now language-localized. — KDG (v2.18.2)",
  },
]

export type LogPref =
  | { mode: 'never' }
  | { mode: 'until-new'; lastSeenId: number }

const STORAGE_KEY = 'sundial_dev_log_pref'

export function getLogPref(): LogPref | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LogPref
  } catch {
    return null
  }
}

export function setLogPref(pref: LogPref): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pref)) } catch { /* ignore */ }
}

export function clearLogPref(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

export function shouldShowLog(): boolean {
  const pref = getLogPref()
  if (!pref) return true
  if (pref.mode === 'never') return false
  const latest = LOG_ENTRIES[LOG_ENTRIES.length - 1]
  return latest.id > pref.lastSeenId
}
