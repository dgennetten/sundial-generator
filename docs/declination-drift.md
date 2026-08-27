# Declination Drift — a Component of Correction

## The idea

Every **date line** (declination line) on a sundial marks where the shadow tip travels on a
particular day. The usual way to draw it — including how this app drew it until now — treats
that day as a **fixed-declination snapshot**: pick one solar declination for the date and
trace the shadow across the hours holding it constant.

But the Sun's declination never stops changing. Its annual path is a continuous up-then-down
spiral, so declination keeps drifting **even within the ~10–12 hours the dial is read**. A
date line is really the Sun's *morning-to-evening trace*, not a single-declination contour.

**Declination Drift** is the correction that models this. When enabled, each date line is
redrawn from its actual calendar date with the declination evaluated **per hour**.

## Why it matters most at the equinoxes

The rate of change of declination is

```
d(decl)/dt ≈ ε · (2π / 365.25) · cos(λ)
```

where `ε` = 23.44° (obliquity) and `λ` = the Sun's ecliptic longitude.

- At the **equinoxes** (`λ = 0°, 180°`), `cos λ = ±1` → the rate is **maximal, ~0.4°/day**.
- At the **solstices** (`λ = 90°, 270°`), `cos λ = 0` → the rate is **zero** (declination is
  at its extremum and momentarily stationary).

Over a dial day of roughly ±6 hours from noon, the equinox declination therefore spans about
**0.2°** (≈0.1° each side of noon). At the low-sun ends of the day the shadow is long and very
sensitive to declination, so that small spread opens the line up.

## What you see when it's on

- **Equinox → an X.** Long drawn as a single straight line at declination 0, the equinox
  splits into the **vernal** trace (declination rising through zero: slightly toward the
  winter side in the morning, the summer side by evening) and the **autumnal** trace (falling
  through zero, the opposite tilt). The two **cross near solar noon** and separate toward
  sunrise/sunset.
- **Cross-quarter pairs separate.** Imbolc/Samhain and Beltane/Lughnasadh (see below) each
  share a declination but sit on opposite arms of the spiral, so drift pulls each pair apart
  into two crossing curves.
- **Solstices barely move** (rate ≈ 0), and month-first / user "Month Day" lines get a small
  tilt that grows toward the equinoxes and shrinks toward the solstices.

Off, the output is byte-for-byte the previous fixed-declination rendering.

## Two puzzles, answered

### Why doesn't the equinox double *before* drift, the way the cross-quarters do?

Because of how the lines are keyed:

- The **equinox** is a single built-in entry drawn at declination 0 — one line, nothing to
  mismatch.
- The **solstices** are two *different* declinations (+23.44° and −23.44°) — two separate
  lines at the top and bottom of the dial, not a pair that should coincide.
- The **cross-quarter days** are the only date lines drawn as genuine **matched pairs** of
  separately-dated lines that *ought* to land on the same declination:
  - `sin(315°) = sin(225°) = −sin(45°)` → **Imbolc and Samhain have identical declination**
    (≈ −16.3°).
  - `sin(45°) = sin(135°) = +sin(45°)` → **Beltane and Lughnasadh have identical declination**
    (≈ +16.3°).

So only the cross-quarters expose a pair that can visibly split.

### Why did the cross-quarter pairs show as *doubled* lines even with drift off?

That was a **date-rounding artifact**, not physics. The helper that dates each cross-quarter
day (`solarLongitudeDate`) originally rounded to the nearest **integer day** and took that
day's declination. The two members of a pair round off in *different directions*, and because
declination is changing at ~0.28°/day at the cross-quarters, the two rounded declinations
ended up ~0.1–0.3° apart — a visible double line.

Two independent reasons the **solstices** never suffered this:

1. They aren't a matched pair (single line each, at their own declination).
2. Even if you dated them, declination is **stationary** at the solstice, so a ±½-day rounding
   error moves it by essentially nothing. (In the code the solstice also uses a hard-coded
   ±23.44° constant, so no date rounding happens at all.)

**The fix:** `solarLongitudeDate` now refines the integer-day bracket to the **exact sub-day
crossing** by bisection on the signed longitude difference. Both members of a pair then land
on the *same* declination and coincide into one crisp line when drift is off — while drift on
still separates them correctly (same noon declination, opposite intra-day drift → they cross
at noon).

## Default behavior

Declination Drift **defaults on for half-year dials** (Summer–Fall, Winter–Spring, and the
Dual-Half pop-up), where the equinox split and cross-quarter separation are most relevant, and
**off for full-year dials**. The default follows the Date Range selection; you can still toggle
it by hand in **Components of Correction**. It is session state (not persisted).

## Implementation

The mechanism rests on one fact: `getSolarDeclination(dayOfYear, year)` accepts a **fractional**
day, so the instantaneous declination at local hour `h` is just

```
declAtHour(h) = getSolarDeclination(dayOfYear + (h − 12) / 24, year)
```

This is deliberately self-consistent: at `h = 12` it returns the day's base declination, so the
drifted curve passes through the same noon point (and noon-mark) as the fixed line.

| File | Change |
|------|--------|
| `src/utils/sundialMath.ts` | `declinationDrift` added to `CorrectionFlags` / `DEFAULT_CORRECTION_FLAGS`; `getSolarEclipticLongitude` and `solarLongitudeDate` helpers (the latter refined to the exact sub-day crossing). |
| `src/components/AboutCard.tsx` | "Declination Drift" entry in the corrections list, incl. the default-behavior note. |
| `src/components/SundialPreview.tsx` | `correctionDeclinationDrift`; a `declAtHour` helper threaded through all five date-line renderers; per-line date-context resolution (`getDateContextForLine`); the equinox split (vernal + autumnal) and cross-quarter separation. |
| `src/App.tsx` | `declinationDrift` initial state (on, matching the half-year default range) and `handleDateRangeChange` keeping it in sync with the Date Range. |
| `src/lib/devLog.ts`, `package.json` | Dev-log entry; version bump to v2.23.18. |
| `src/tests/declinationDrift.test.ts` | Sign, magnitude, and cross-quarter-pair-equality tests. |

### Scope / non-goals

- Hour lines and the analemma are unaffected (they already sweep the full year of
  declinations).
- Noon date-marks stay anchored to each date's **noon** declination.
- The longitude / equation-of-time sub-offset *inside* the intra-day declination is deferred
  (second-order on an already-small effect).

## Verification

- **Unit tests** (`src/tests/declinationDrift.test.ts`):
  - drift *direction* — declination rises through the vernal equinox, falls through the
    autumnal;
  - drift *magnitude* — the intra-day spread is **>20× larger at the equinox than at the
    solstice**;
  - *pair equality* — Imbolc≡Samhain and Beltane≡Lughnasadh declinations match to <0.01°
    after the sub-day refinement, and the equinoxes land within 0.02° of declination 0.
- **In-app**: toggling the box changes the rendered path count by exactly **+1** (the single
  equinox line becoming two); the default is **on** for half-year ranges and **off** for full
  year; the description note is shown. No console errors.
- Full suite green (`npm run test:run`), `npx tsc --noEmit` clean, lint clean on changed files.

## A note on scale

At a mid-latitude like Fort Collins the equinox spread is only ~0.2° of declination, so on
screen the two equinox curves sit ~1–2 px apart (widening toward the low-sun ends, crossing at
noon) — subtle at preview scale, more apparent at print DPI. The split itself is deterministic
and proven; the physics, not the pixels, is the point.

## Related

- This is **not** the "Mystery Error" placeholder in the same panel — that refers to the
  **penumbra perception bias** (readers pick a point biased toward the umbra rather than the
  true shadow center). See `docs/location-shadow-penumbra.md`.
