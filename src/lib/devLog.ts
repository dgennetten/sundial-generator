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
    content: "NEW GREETING CARD DIAL!: in the gnomon dropdown, select 'Greeting Popup'. Early Beta. Send Feedback!! Note the new **Preview** toggle. — KDG (v2.13.0)",
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
    content: "**Atmospheric Refraction** is now a live correction you can toggle. Earth's atmosphere bends sunlight near the horizon — making the sun appear slightly higher than it truly is. On a sundial this shifts the shadow position, most noticeably at low solar altitudes (early morning, late evening, and winter hours at higher latitudes). The correction uses **Bennett's formula** (R = 1.02 / tan(h + 10.3/(h + 5.11))), accurate to ~0.07 arcminutes. Open **Components of Correction** in the About card to experiment. Dial decoration text is now language-localized. On desktop, click the expand icon in the preview header to go full screen — the controls float in a draggable panel you can reposition or dismiss. — KDG (v2.19.0)",
  },
  {
    id: 7,
    date: '2026-07-01',
    content: "**Live on-location shadow preview** for popup gnomons. In Gnomon Settings, enable **Live preview of on-location shadow** to see a gray shadow on the dial for your chosen location and time. The umbra is a rubber-band convex hull around the popup triangle and the mean-sun shadow point. The penumbra (soft fringe at the tip) comes from the finite solar disc — eight limb positions projected through the same 3D dial geometry as hour lines, built into three nested envelope hulls with stacked opacity (no SVG blur). **Animate** sweeps a 30-second cycle: **Day** mode moves civil time across your hour-line range at today's date; **Hour** mode holds clock time fixed and sweeps the year so you can watch solstice and equinox shadow length change. Pause/resume is supported. DST transitions use regional Sunday rules as days animate. Preview only — shadow is omitted from export. New **Full Screen** mode. — KDG (v2.20.0)",
  },
  {
    id: 8,
    date: '2026-07-15',
    content: "HUGE BUG FIX: I'm surprized no one complained about this sooner! On iPhone 15 the Location map picker's Cancel/Confirm buttons — and the How-to popup's Got it button — were completely unreachable, clipped below the fold under Safari chrome. Sticky action bars + a map that shrinks to fit, so those buttons stay tappable. — KDG (v2.21.1)",
  },
  {
    id: 9,
    date: '2026-07-17',
    content: "**New Photo Gallery — share your sundial!** Click **Photos** (in the How-to-Build popup, or right next to the Print button) to open a full-screen gallery of dials built by fellow makers. Want to add yours? Sign in with a one-time code emailed to you — no password or account needed — then upload a photo with a caption. Submissions appear once approved. — KDG (v2.22.0)",
  },
  {
    id: 10,
    date: '2026-08-09',
    content: "**NEW — Dual-Dial Pop-up!** Two dials on one folding card: a **Summer** dial and a **Winter** dial, each a true horizontal dial rotated to fill its half. Splitting the year in two gives each dial superior hour line interpolation and readability, while the pair together keeps the **full-year convenience** of a single dial without the crowding. Fold it into a **greeting card**, or lay it flat as a **permanent horizontal dial** (see gallery photos). Pick **Dual-Dial Pop-up** in the gnomon dropdown. Still refining the cut-and-fold gnomon paper engineering — ideas welcome! — KDG (v2.23.1)\n\n📖 New illustrated overview of both pop-up dials: [precisionsundial.com/overview](https://precisionsundial.com/overview/)",
  },
  {
    id: 11,
    date: '2026-08-27',
    content: "**Cross-Quarter Days** — a new checkbox in the Date Lines section (on by default) draws the four cross-quarter days as black hairline date lines: **Imbolc** (Groundhog Day / Candlemas), **Beltane** (May Day), **Lughnasadh** (Lammas) and **Samhain** (Halloween). These are the dates midway between each solstice and equinox. Rather than a fixed nominal date, each line is placed at the Sun's exact declination on the day it truly falls in the upcoming year. — KDG (v2.23.17)",
  },
  {
    id: 12,
    date: '2026-08-27',
    content: "**New correction — Declination Drift.** The Sun's declination keeps changing *through* the day (fastest at the equinoxes, near zero at the solstices), so a date line isn't really a single fixed-declination snapshot. Toggle **Declination Drift** in **Components of Correction** (About card) to redraw every date line as its true morning-to-evening trace. The most striking result: the equinox — long drawn as one straight line — splits into **two curves that cross at noon** (the vernal trace rising through zero, the autumnal falling), and each cross-quarter pair (Imbolc/Samhain, Beltane/Lughnasadh) separates in the same way. Defaults **on for half-year dials** (where the split is most relevant) and **off for full-year dials**. — KDG (v2.24.0)",
  },
  {
    id: 13,
    date: '2026-08-29',
    content: "**Declination Drift — now timed to your longitude.** A sharp-eyed report from a Waikiki dial exposed two bugs. First, toggling Drift shifted every plotted date after February by a full day (a leap-year off-by-one in how a \"Month Day\" was dated). Second, and bigger: Drift sampled the Sun's declination as if your dial sat on the Greenwich meridian, mistiming the whole intra-day curve by your distance from it — about **10.5 hours in Hawaii**. The upshot was that on the equinox *day* the date line never actually reached the equinox line during daylight. Both are fixed: a date line now crosses the equinox line at the true equinox instant for **your** location (Waikiki's Sept 22 line crosses at ~2:05 pm HST), and dials near Greenwich are essentially unchanged. — KDG (v2.24.4)",
  },
  {
    id: 14,
    date: '2026-08-29',
    content: "**New correction — Current-Year Anchoring.** The equinox and solstice *instants* drift about ±¾ day across the four-year leap cycle, so a fixed calendar date (say Sept 22) lands on a slightly different declination each year — up to ~0.3° near the equinoxes, next to nothing near the solstices. New checkbox in **Components of Correction**: **checked (default)** anchors your date lines dead-on to *this* year; **uncheck** to average over the whole leap cycle — never more than ~⅜ day off in any year, the better setting for a dial you print once and use for years. Affects dated lines only; the equinox, solstice and cross-quarter lines are defined by the Sun's longitude and are already year-stable. — KDG (v2.24.5)",
  },
  {
    id: 15,
    date: '2026-08-30',
    content: "The **live on-location shadow animation** now plays **50% faster** — a full sweep cycles in 20 seconds instead of 30. Applies to both **Day** mode (time-of-day sweep) and **Hour** mode (year sweep). — KDG (v2.24.6)",
  },
  {
    id: 16,
    date: '2026-08-30',
    content: "**Smoother shadow animation — now a full 60 fps.** The live on-location shadow sweep used to redraw the *entire* dial on every frame, which bogged it down on busier dials and modest devices. Under the hood it now updates only the moving shadow each frame and leaves the dial untouched, so the motion is fluid while keeping the soft-penumbra detail. — KDG (v2.24.8)",
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
