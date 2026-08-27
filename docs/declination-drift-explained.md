# Declination Drift, explained — and has anyone written this up before?

*A plain-language companion to the technical note in [`declination-drift.md`](declination-drift.md).*

## What it is

A sundial's **date lines** (declination lines) show where the tip of the gnomon's shadow
falls on a given day of the year — the solstice lines, the equinox line, and any dates in
between. The textbook way to draw them treats each day as having a single, fixed solar
**declination**: choose that day's declination, then sweep the shadow tip across the hours
holding it constant.

That's an approximation, because the Sun's declination is *always* changing. Over a year it
climbs from −23.4° at the winter solstice to +23.4° at the summer solstice and back — a
continuous up-then-down spiral — and it keeps drifting **even across the single day** you're
reading the dial. A date line isn't truly a constant-declination contour; it's the Sun's
**morning-to-evening trace**.

**Declination Drift** is the correction that draws the trace honestly: it evaluates the Sun's
declination *hour by hour* along the actual date instead of freezing it at one value.

## Why it matters

**It's largest exactly where dialing tradition says the line is simplest — the equinox.**
The rate at which declination changes is

- **~0.4° per day at the equinoxes**, and
- **≈ 0 at the solstices** (declination is momentarily stationary at its extremes).

The equinox is the one date every sundial book draws as a perfectly straight east-west line —
the clean, canonical case. Declination Drift says it *isn't* straight: because declination is
sweeping through zero fastest that day, the morning half of the trace sits a hair toward the
winter side and the evening half a hair toward the summer side. And since the **spring** equinox
is rising through zero while the **autumn** equinox is falling through it, they are two
*different* curves that **cross near solar noon** — an X, not a line. The same logic pulls each
cross-quarter pair (Imbolc/Samhain, Beltane/Lughnasadh — dates that share a declination but sit
on opposite arms of the spiral) apart into two crossing curves.

**The magnitude is small but real.** At a mid-latitude the equinox trace spans only about 0.2°
of declination from morning to evening — a millimetre or two at typical dial size, widening at
the low-sun ends where the shadow is long and most sensitive. It is nonetheless a genuine
geometric effect, not a rounding artifact, and it is *strictly larger than atmospheric
refraction* over much of the day for the fastest-moving dates. For a precision dial — or simply
for teaching what the equinox line "really" is — it's worth showing.

**It also exposes a hidden inconsistency.** As long as date lines are treated as
constant-declination contours, the equinox is one line and nobody notices the simplification.
The moment you date the cross-quarter days precisely, the pairs *want* to separate — which is
the visible tell that the underlying model was an approximation all along.

## Has this been written up before? (as far as I can tell)

Short version: **the underlying fact is known and explicitly acknowledged as the thing usually
ignored; a named, quantified "correction" applied to printed date lines — with the equinox
rendered as two crossing curves and cross-quarter pairs separating — I could not find.** I
can't rule out that it appears in specialist print literature that the open web doesn't index
well.

What the record does show:

1. **The intra-day variation is a recognized, deliberately-dropped term.** General references
   describing the shadow's conic path state the geometry holds *"to first order, ignoring the
   variation in declination of the Sun over the course of a day"* and that *"variation in the
   Sun's declination during the day is negligible."* So the effect is not unknown — it is named
   precisely as the approximation being made. Declination Drift is simply the decision to keep
   that term instead of dropping it.
   (See the Wikipedia *Sundial* discussion surfaced via
   [this astronomy-forum thread](https://groups.google.com/g/sci.astro.amateur/c/PRq-rTjl37c).)

2. **Amateurs have argued the specific question.** "*Is the shadow of a sundial a straight line
   on the equinox day?*" has been debated in astronomy forums — evidence the phenomenon is
   folklore-known, but discussed as a yes/no curiosity rather than developed into a drawn
   correction. ([sci.astro.amateur thread](https://groups.google.com/g/sci.astro.amateur/c/PRq-rTjl37c))

3. **Practical dialing guides treat the equinox line as straight.** Construction-oriented
   primers describe the equinox path as "a straight line running east-west" and do **not**
   discuss intra-day declination change or distinguish the spring and autumn traces. The
   [mySUNDIAL.ca declination-lines primer](https://www.mysundial.ca/tsp/declination_lines.html)
   is representative: it covers how to lay out declination arcs but not this refinement.

4. **The known spring/autumn asymmetry is usually attributed to the *equation of time*, not to
   declination drift.** Precise dials famously need two sets of civil-time marks because the
   equation-of-time-vs-declination relationship differs between the winter/spring and
   summer/fall halves of the year. That is a *different* asymmetry (about clock time, the
   analemma's lobes) and is well documented — but it is not the intra-day declination effect,
   and the two are easy to conflate.

**My honest assessment:** the physics is textbook and the "equinox line isn't perfectly
straight" observation is old and informally known, but framing it as an explicit, toggleable
**correction** — quantified, drawn as the equinox splitting into two noon-crossing curves and
the cross-quarter pairs separating — is not something I can find written up in the accessible
literature. Whether it is genuinely novel or simply buried in a NASS *Compendium* article, a
BSS *Bulletin*, or a specialist monograph (de Vries, Rohr, Mayall, Waugh, Savoie) that isn't
web-searchable, I cannot say with confidence. If novelty matters for a paper, this is worth a
targeted check of those specific print sources before claiming priority.

*Note:* Declination Drift is a **different** effect from the one this app labels the "Mystery
Error." That one is the **penumbra perception bias** — a reader picking the shadow edge biased
toward the dark umbra rather than the true geometric center — which is about how humans *read* a
soft-edged shadow, not about the Sun's motion. See
[`location-shadow-penumbra.md`](location-shadow-penumbra.md).

## Sources

- [Shadow of sundial a straight line on equinox day? — sci.astro.amateur](https://groups.google.com/g/sci.astro.amateur/c/PRq-rTjl37c)
- [The Sundial Primer — Declination Lines (mySUNDIAL.ca)](https://www.mysundial.ca/tsp/declination_lines.html)
- [The Sun's Declination, the Equinoxes and the Solstices — Astro Navigation Demystified](https://astronavigationdemystified.com/the-suns-declination-the-equinoxes-and-the-solstices/)
- [Understanding sundials — Shadows Pro](https://www.shadowspro.com/en/sundials.html)
- [The mathematics of sundials — Jill Vincent (ERIC EJ802706)](https://files.eric.ed.gov/fulltext/EJ802706.pdf)
