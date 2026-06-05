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
    content: "Introducing the Developer's Log — a way to surface the latest app changes directly to you. Rather than hunting through a changelog, you'll see a note here whenever something meaningful ships. I liked the idea so much I'm bringing it to all my apps. More to come! — KDG",
  },
  {
    id: 2,
    date: '2026-06-05',
    content: "NEW GREETING CARD DIAL!: in the gnomon dropdown, select 'Glued Popup'. Early Beta. Send Feedback!! Note the new preview toggle.",
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
