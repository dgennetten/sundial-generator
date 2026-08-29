# Current-Year Anchoring — a Component of Correction

## The idea

A sundial's **date lines** are drawn from the Sun's declination on each date. But "the
declination on September 22" is not a single fixed number — it depends on *which* September 22.
The equinox and solstice **instants** slide about **+5 h 49 m each year**, then jump back ~24 h
at each leap year, tracing a four-year sawtooth. So a fixed calendar date lands on a slightly
different declination in each year of the leap cycle.

**Current-Year Anchoring** is the toggle that decides how the app resolves that ambiguity:

- **Checked (default)** — anchor every date-line declination to **this specific year's** Sun.
  The dial is dead-on for the current year.
- **Unchecked** — **average each declination over the four-year leap cycle** (year … year + 3).
  The dial is never more than ~⅜ day off in *any* year — the better setting for a dial that is
  printed once and used for years.

It sits in **Components of Correction** (About card), and is session state (not persisted).

## How big is the effect?

Declination moves fastest at the equinoxes (~0.4°/day) and is momentarily stationary at the
solstices, so the year-to-year spread of a fixed calendar date follows the same pattern:

| Region | Leap-cycle spread of a fixed date | Notes |
|--------|-----------------------------------|-------|
| Near an **equinox** | up to **~0.3°** of declination | largest — declination is slewing fastest |
| Mid-season | a few tenths of a degree, tapering | |
| Near a **solstice** | **~0.003°** (negligible) | declination is at its extremum, barely moving |

Worked example — **September 22 noon declination** (from `getSolarDeclination`):

| Year | Declination |
|------|-------------|
| 2026 | +0.199° |
| 2027 | +0.293° |
| 2028 (leap) | +0.387° |
| 2029 | +0.093° |
| **4-year average** | **+0.243°** |

Anchored to 2026 the line sits at +0.199°; averaged over the cycle it sits at +0.243°. Either is
defensible — one is optimal for 2026, the other is the best all-around compromise.

## Which lines it touches — and which it doesn't

The distinction is **how a line's declination is defined**:

- **Calendar-date lines** — user "Month Day" lines, **Today**, and the **1st-of-the-Month** /
  **1st-and-15th** families — are pinned to a calendar date, so their declination *does* vary
  across the cycle. **These honor the toggle.**
- **Longitude-anchored lines** — **Equinox**, **Solstices**, and the **Cross-Quarter Days** — are
  defined by the Sun's ecliptic *longitude* (0°, 90°, 45°, …). Declination is a fixed function of
  longitude (`sin δ = sin ε · sin λ`), so these are **year-stable** and are unaffected by the
  toggle. (What *does* drift for them is the calendar *date* they fall on, which the app already
  resolves to the true upcoming crossing.)

This is why the toggle's visible effect is confined to dated lines near the equinoxes.

## Interaction with Declination Drift

The two corrections pull in opposite directions, by design:

- **Anchored (on) + Drift** — maximum precision for a dated event: e.g. the September 22 line
  crosses the equinox line at the true equinox instant *this* year. Best for an installation or
  a dedication tied to a specific year.
- **Leap-cycle (off)** — the crisp single-instant crossing intentionally **smears into a ~±0.3°
  band**, because the equinox happens at a different clock time each year. That smear *is* the
  honest picture of a dial meant to serve the whole cycle.

Averaging is applied at the declination-sampling layer, so it flows through both the fixed date
lines and the per-hour Declination Drift curves uniformly.

## Implementation

A single helper gates the behavior; everything else routes through it:

```ts
// Solar declination for a CALENDAR date, honoring Current-Year Anchoring.
function sampleDecl(fractionalDayOfYear: number, year: number): number {
  if (correctionCurrentYear) return getSolarDeclination(fractionalDayOfYear, year);
  let sum = 0;
  for (let k = 0; k < 4; k++) sum += getSolarDeclination(fractionalDayOfYear, year + k);
  return sum / 4;
}
```

| File | Change |
|------|--------|
| `src/utils/sundialMath.ts` | `currentYearAnchoring` added to `CorrectionFlags` / `DEFAULT_CORRECTION_FLAGS` (default **true**). |
| `src/components/AboutCard.tsx` | "Current-Year Anchoring" entry in the corrections list, below Declination Drift. |
| `src/components/SundialPreview.tsx` | `correctionCurrentYear`; `sampleDecl` helper; the calendar-date declination calls (parsed dates, **Today**, 1st-of-month, 1st-and-15th) and `declAtHour`'s drift sample routed through it. |
| `src/App.tsx` | `currentYearAnchoring` initial state (**true** — no behavior change for existing users). |

### Scope / non-goals

- The four-year window is one **leap cycle** — the dominant periodicity. Slow secular drift
  (obliquity, precession) is far smaller than a dial's readable resolution and is ignored.
- Longitude-anchored lines (equinox/solstice/cross-quarter) are deliberately left single-year;
  their declination is year-stable, so averaging them would be a no-op with extra cost.
- The noon-analemma intersection search and alignment-day search stay single-year (they match
  against the current-year analemma).

## Verification

- **Numeric**: Sep 22 noon declination spread across 2026–2029 is ~0.29° (current-year 0.199°,
  4-year average 0.243°); the Dec 21 near-solstice spread is ~0.003° — confirming the effect is
  an equinox-region phenomenon that vanishes at the solstices.
- **In-app**: toggling the box off nudges dated lines near the equinoxes by up to ~0.3° and
  leaves solstice/longitude-anchored lines visually unchanged; default is **on** (identical to
  prior behavior). No console errors.
- Full suite green (`npm run test:run`), `npx tsc --noEmit` clean.

## Related

- [Declination Drift](declination-drift.md) — the intra-day companion correction. Anchoring
  chooses *which year(s)*; Drift models the change *within* the chosen day, timed to the
  observer's longitude.
