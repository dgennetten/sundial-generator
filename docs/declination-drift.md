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
day, so the instantaneous declination at dial hour `h` is a sample at the matching fractional day.

The dial hour `h` is **local apparent solar time** (`hourAngle = 15·(h − 12)`), but the
declination model is anchored to **12:00 UT**. So `h` is first converted to its UT instant —
`UT = h − lng/15 − EoT` — before sampling (see the v2.24.4 note below):

```
declAtHour(h) = getSolarDeclination(dayOfYear + (UT − 12) / 24, year)     // UT as above
```

> **Update (v2.24.4) — longitude/EoT now applied.** An earlier version sampled
> `dayOfYear + (h − 12)/24` directly, treating the dial's local-apparent noon as if it were
> 12:00 UT. That mistimed the intra-day drift by the observer's distance from Greenwich (~10.5 h
> in Hawaii), so on the equinox day a date line never crossed the equinox line during daylight.
> `declAtHour` now converts `h` to UT first, and the astronomically-anchored lines
> (equinox/solstice/cross-quarter) — which carried a *fractional* 12:00-UT crossing day from
> `solarLongitudeDate` — are mapped onto the dial's **local calendar day** (`toLocalCalendarDay`)
> so the whole family stays timed consistently for the observer's longitude. Verified: Waikiki's
> Sep 22 line now crosses declination 0 at the ~2:05 pm HST equinox and coincides with the
> equinox trace; a Greenwich dial is essentially unchanged. Two related date-resolution fixes
> shipped just ahead of it (v2.24.3): a leap-year off-by-one that shifted every post-February
> date line one day when drift toggled, now resolved through a shared `resolveLineDateContext`.

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
- The longitude / equation-of-time sub-offset *inside* the intra-day declination **is now
  applied** (v2.24.4) — it is the dominant term for dials far from Greenwich, not second-order.
- *Which year(s)* the declination is sampled from is a separate correction — see
  [Current-Year Anchoring](current-year-anchoring.md).

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

## Has this been written up before? (as far as I can tell)

Short version: **the underlying fact is known and explicitly named as the thing usually
ignored; a quantified, toggleable "correction" applied to printed date lines — with the equinox
drawn as two crossing curves and cross-quarter pairs separating — I could not find** in the
accessible literature. I can't rule out that it appears in specialist print sources the open
web doesn't index well.

What the record does show (with a caveat on sourcing — see below):

1. **The intra-day variation is treated as negligible, usually without even being stated.**
   General dialing and astronomy references draw declination arcs from a single per-day
   declination and describe the equinox path as a straight east-west line. Notably, in trying
   to find a source that *explicitly* says "declination is held constant across the day when
   laying out date lines," I could not pin down a clean verbatim statement — the assumption
   appears so ingrained that it is rarely spelled out. That absence is itself weak evidence
   that the effect is assumed away rather than examined.

2. **Amateurs have argued the specific question.** A thread titled "*Shadow of sundial a
   straight line on equinox day?*" exists on sci.astro.amateur — evidence the phenomenon is
   folklore-known and discussed as a yes/no curiosity, rather than developed into a drawn
   correction. (Thread title verified; I have not read the full discussion.)

3. **Practical dialing guides treat the equinox line as straight.** The mySUNDIAL.ca
   declination-lines primer (verified) describes the equinox path as "a straight line running
   east-west" and does **not** discuss intra-day declination change or distinguish the spring
   and autumn traces.

4. **A possible earlier mention in patents (unverified lead).** An exact-phrase search
   surfaced a "Sun compass" patent (US 4,028,813) reportedly noting that the *central* reading
   of a day does not lie on a straight line drawn between the day's first and last readings —
   which is essentially this effect. I have **not** verified the patent text (the USPTO copy is
   a scanned image), so treat this as a lead to chase, not a confirmed citation.

5. **The known spring/autumn asymmetry is usually pinned on the *equation of time*, not on
   declination drift.** Precise dials famously need two sets of civil-time marks because the
   EoT-vs-declination relationship differs between the winter/spring and summer/fall halves of
   the year. That is a *different* asymmetry (clock time, the analemma's lobes) and is easy to
   conflate with this one.

**Sourcing caveat (added after a fact-check):** an earlier draft of this section carried a
"quotation" about the geometry holding *"to first order, ignoring the variation in declination
… over the course of a day"* and cited Shadows Pro among the sources. On direct inspection,
Shadows Pro does **not** mention intra-day declination at all, and that quoted phrase could not
be traced to any specific source — it was a search paraphrase, not a verbatim citation. Both
have been removed. Take the assessment below as reasoned inference from the sources actually
checked, not as resting on a canonical quote.

**Honest assessment:** the physics is textbook and the "equinox line isn't perfectly straight"
observation is old and informally known, but framing it as an explicit, quantified correction —
drawn as the equinox splitting into two noon-crossing curves and the cross-quarter pairs
separating — is not something I can find written up. Whether it is genuinely novel, sitting in
the patent literature (see the unverified lead above), or buried in a NASS *Compendium*
article, a BSS *Bulletin*, or a specialist monograph (de Vries, Rohr, Mayall, Waugh, Savoie)
that isn't web-searchable, I can't say with confidence. If novelty matters for a paper, verify
US 4,028,813 and do a targeted check of those print sources before claiming priority.

### Sources (checked)

- [Shadow of sundial a straight line on equinox day? — sci.astro.amateur](https://groups.google.com/g/sci.astro.amateur/c/PRq-rTjl37c) — thread title only.
- [The Sundial Primer — Declination Lines (mySUNDIAL.ca)](https://www.mysundial.ca/tsp/declination_lines.html) — read; treats the equinox line as straight, no intra-day discussion.
- Unverified lead: US Patent 4,028,813 ("Sun compass") — reportedly notes the central daily reading is off the straight line between first/last readings.

## Related

- This is **not** the "Mystery Error" placeholder in the same panel — that refers to the
  **penumbra perception bias** (readers pick a point biased toward the umbra rather than the
  true shadow center). See `docs/location-shadow-penumbra.md`.
