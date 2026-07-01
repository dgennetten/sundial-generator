# Location Shadow Preview & Penumbra

This document describes the **live on-location shadow preview** for popup gnomons: how the shadow is computed, how the soft penumbra (“blur”) at the tip is modeled, how animation works, and which source files implement each part.

The preview is **UI-only**. Elements with class `gnomon-location-shadow` are stripped from PNG, SVG, and PDF export.

---

## Overview

When **Live preview of on-location shadow** is enabled (Gnomon Settings), the dial preview draws a gray shadow polygon behind the popup triangle gnomon. The shadow reflects:

- Geographic location (latitude, longitude, time zone meridian)
- Dial orientation (inclination, declination, hemisphere flip)
- Civil date and time at the dial (including daylight saving time when enabled)
- Solar position via the same `sundialMath` pipeline as hour lines

The shadow has two visual parts:

1. **Umbra** — the sharp mean-sun rubber-band hull (convex hull of gnomon triangle + mean shadow apex).
2. **Penumbra** — a softer fringe from the finite solar disc, rendered as three nested geometric bands with stacked opacity.

---

## Physical model

### Solar disc

| Constant | Value | Meaning |
|----------|-------|---------|
| `SUN_ANGULAR_DIAMETER_DEG` | 32′ (32/60 °) | Full solar disc as seen from Earth |
| `SUN_ANGULAR_RADIUS_DEG` | 16′ | Semi-diameter (angular radius) |

At shadow length \(L\) on the dial (mm from gnomon tip to mean apex), the minimum penumbra semi-width is approximately:

\[
L \times \text{SUN\_ANGULAR\_RADIUS\_DEG} \times \frac{\pi}{180}
\]

### Rubber-band umbra

`rubberBandShadowPolygon(triangle, apex)` returns the convex hull of:

- Popup tip, left base corner, right base corner
- Mean-sun shadow apex (from `computeShadowPoint` at gnomon height)

This guarantees the gnomon triangle is always filled and the hull does not “snap” at noon (unlike fixed vertex-order polygons).

### Penumbra envelope

Penumbra is **not** a Gaussian SVG blur. It is **geometric**: three nested convex hulls built from interpolated solar-limb shadow points.

**Limb sampling** (`solarDiscLimbOffsets`): eight points around the solar disc in altitude/azimuth space, each offset by one angular radius (16′) from disc center.

For each limb, `apexShadowPoint` projects the gnomon shadow with that limb’s alt/az offset through full 3D dial geometry (`computeShadowPoint`).

**Envelope hull** (`penumbraEnvelopeHull`):

```
limbPoint = meanApex + fraction × (limbApex − meanApex)
hull = convexHull(tip, left, right, meanApex, …limbPoints)
```

| Band | `PENUMBRA_BAND_SCALES` | Role |
|------|------------------------|------|
| Outer | 1.0 | Full limb envelope |
| Middle | 2/3 | Partial limb displacement |
| Inner | 1/3 | Tighter fringe |

At fraction `1.0`, the outer band matches `computeOuterPenumbraPolygon` (triangle + mean + all limb apexes).

### Opacity stacking

Three bands are drawn back-to-front with `shadowFillForCoverage(1|2|3)`:

| Coverage | Alpha | Cumulative in full overlap |
|----------|-------|----------------------------|
| 1 | `SHADOW_TOTAL_ALPHA / 3` | 1/3 |
| 2 | `2 × SHADOW_TOTAL_ALPHA / 3` | 3/3 → full umbra tone |
| 3 | `SHADOW_TOTAL_ALPHA` | 3/3 |

`SHADOW_TOTAL_ALPHA = 0.35`, gray `rgb(120,120,120)`.

Source-over compositing makes triple-overlap regions reach the target gray on a white dial.

---

## Time & DST

### Civil vs standard hour

Dial hour lines use **standard time** on the zone meridian. The location clock (and animation label) uses **civil time** (with DST when `useDST` is true).

`civilHourToStandardHour` subtracts one hour when DST is active for the given calendar date.

### DST transition dates

`isLocationInDST(date, lat, lng)` uses regional **Sunday rules**, not whole-month approximations:

| Region | Rule |
|--------|------|
| US/Canada (lng −170…−50) | 2nd Sunday March → 1st Sunday November (Arizona excluded) |
| Europe (lng −25…45, lat ≥ 33°) | Last Sunday March → last Sunday October |
| Australia (lng 110…180, lat &lt; −10°) | 1st Sunday October → 1st Sunday April |

Longitude is threaded through shadow time hooks so Hour animation applies DST on the correct dates as days sweep through the year.

---

## Animation

Hook: `useLocationShadowTime` (`src/hooks/useLocationShadowTime.ts`)

| Mode | Sweeps | Fixed |
|------|--------|-------|
| **Day** | Civil hour from `startHour` → `stopHour` | Date (anchor day) |
| **Hour** | Day of year Jan 1 → Dec 31 | Civil hour (anchor hour) |

- Cycle duration: **30 seconds** (`ANIMATION_CYCLE_MS`)
- **Ping-pong sweep** (`animationSweepProgress`): 0 → 1 → 0 so loop endpoints match (no teleport at cycle restart)
- **Pause** preserves `progressRef`; resume continues from same point
- Static preview (animation off): refreshes wall-clock time every 30 s
- `useLayoutEffect` applies animated time before paint to avoid a one-frame flash

Controls live in **Gnomon Settings**: preview checkbox, animation toggle, Day/Hour switch, pause/resume, date/time label.

---

## Rendering

### Component chain

```
App.tsx
  useLocationShadowTime → locationShadowDateTime
  SundialPreview.tsx
    GnomonShadowSVG (outside dial clipPath — penumbra not clipped at border)
      computeGnomonShadowGeometry
        penumbraEnvelopeHull × 3
        rubberBandShadowPolygon (meanHull)
```

### Clip path

The shadow is rendered in a **sibling group** outside the dial `clipPath` so tip penumbra is not cut off at the page border or Today dateline. Export removes `.gnomon-location-shadow` regardless.

### Gnomon types

Preview applies to: `popup`, `popup-with-brace`, `glued-popup-base`.

---

## Key source files

| File | Responsibility |
|------|----------------|
| `src/utils/gnomonShadowUtils.ts` | Shadow math, penumbra hulls, DST, animation time |
| `src/utils/sundialMath.ts` | `getSolarPosition`, `computeShadowPoint` (3D ENU) |
| `src/hooks/useLocationShadowTime.ts` | Animation loop, static refresh |
| `src/components/GnomonShadowSVG.tsx` | SVG path rendering, three bands |
| `src/components/GnomonSettings.tsx` | UI controls |
| `src/components/SundialPreview.tsx` | Placement, unclipped shadow layer |
| `src/tests/gnomonShadowUtils.test.ts` | Geometry, DST, animation tests |

### Legacy / alternate APIs

| API | Status |
|-----|--------|
| `computePopupGnomonShadowPolygons` | Legacy three rubber-band layers at alt ±½ diameter |
| `computeSoftPenumbraOutline` | Phase-2 soft outline (u-parameterized width); not used for preview render |
| `buildSoftPenumbraOutline` | Zero width at base, full width at tip; retained for tests/API |

---

## Data flow

```
User location + date/time
        ↓
buildShadowContext → popup triangle vertices (orientation from lat/incline)
        ↓
meanApexForContext → computeShadowPoint(mean sun)
limbApexesForContext → 8 limb apexShadowPoints
        ↓
penumbraBands[0..2] = penumbraEnvelopeHull(fraction 1, ⅔, ⅓)
meanHull = rubberBandShadowPolygon(triangle, meanApex)
        ↓
GnomonShadowSVG: 3 <path> fills, coverage 1→2→3
```

---

## Design history (brief)

Early iterations used:

1. Fixed vertex-order rubber bands (noon snap) → fixed with convex hull
2. Stacked identical-opacity limb layers
3. SVG Gaussian blur + gradient masks (tip faded unrealistically)
4. Soft outline paths with tip→base closure (visible seam / boolean artifact)
5. Synthetic tip-offset hulls + `PENUMBRA_SPREAD_BUFFER` fudge

Current approach: **limb-interpolated envelope hulls** from real projected solar limb positions, eight disc samples, nested fractions, no SVG blur.

---

## Testing

```bash
npm run test:run -- src/tests/gnomonShadowUtils.test.ts
```

Covers rubber-band hull, penumbra nesting, outer envelope vs `computeOuterPenumbraPolygon`, solar semi-diameter floor, US DST Sundays, Day/Hour animation sweep, ping-pong loop.

---

## Tuning constants

| Constant | Default | Notes |
|----------|---------|-------|
| `SHADOW_TOTAL_ALPHA` | 0.35 | Full umbra opacity |
| `SHADOW_GRAY` | 120 | RGB gray level |
| `PENUMBRA_BAND_SCALES` | [1, ⅔, ⅓] | Limb interpolation fractions |
| `ANIMATION_CYCLE_MS` | 30000 | Full ping-pong cycle |
| Limb sample count | 8 | `solarDiscLimbOffsets` |

To adjust visual softness, change band fractions or `SHADOW_TOTAL_ALPHA`; to adjust physical extent, limb count or angular radius constants.
