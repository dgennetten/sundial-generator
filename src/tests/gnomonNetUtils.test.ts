import { describe, expect, it } from 'vitest';
import { buildGnomonNetSVGString, buildDualDialNetSVGString } from '../utils/gnomonNetUtils';

function countNetCopies(svg: string): number {
  const matches = svg.match(/id="gn-tabA-\d+"/g);
  return matches?.length ?? 0;
}

function usesShrunkNetCopies(svg: string): boolean {
  return /<g transform="translate\([\d.]+,[\d.]+\) scale\(0\./.test(svg);
}

describe('buildGnomonNetSVGString layout', () => {
  it('uses full-size stacked copies on Letter portrait when side-by-side would shrink', () => {
    const svg = buildGnomonNetSVGString(48, 215.9, 279.4);
    expect(countNetCopies(svg)).toBe(2);
    expect(usesShrunkNetCopies(svg)).toBe(false);
  });

  it('uses triad layout with inverted top copy on 11x17 portrait', () => {
    const svg = buildGnomonNetSVGString(48, 279.4, 431.8);
    expect(countNetCopies(svg)).toBe(3);
    expect(usesShrunkNetCopies(svg)).toBe(false);
    // Inverted top copy is a 180° rotation (scale(-1,-1)), not a vertical
    // flip (scale(1,-1)) — a flip would mirror the split rose and A/B labels.
    expect(svg).toMatch(/scale\(-1,-1\)/);
    expect(svg).not.toMatch(/scale\(1,-1\)/);
  });

  it('only shrinks when a single net cannot fit at actual size', () => {
    const svg = buildGnomonNetSVGString(120, 100, 150);
    expect(countNetCopies(svg)).toBe(1);
    expect(usesShrunkNetCopies(svg)).toBe(true);
  });
});

function foldLineXs(svg: string): number[] {
  // Dashed vertical fold lines: x1===x2, dasharray 2,2.
  const re = /<line x1="([\d.]+)" y1="0" x2="([\d.]+)" y2="[\d.]+" stroke="#333" stroke-width="0\.35" stroke-dasharray="2,2"\/>/g;
  const xs: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    expect(m[1]).toBe(m[2]); // strictly vertical
    xs.push(Number(m[1]));
  }
  return xs;
}

describe('buildDualDialNetSVGString geometry', () => {
  it('draws two identical stacked nets at the given cube size', () => {
    const gH = 30;
    const svg = buildDualDialNetSVGString(gH, 279.4, 215.9); // Letter landscape

    // Two strips fit at actual size on Letter landscape → no shrink.
    expect(svg).not.toMatch(/ scale\(0\./);
    // Each strip has one tube GLUE tab (rotated) plus two attachment-tab GLUE
    // labels → 3 per strip, 6 across the two strips.
    expect((svg.match(/>GLUE</g) || []).length).toBe(6);
    expect((svg.match(/rotate\(-90 [^)]*\)" font-family="sans-serif" fill="none" stroke="lightgray" stroke-width="0\.4">GLUE</g) || []).length).toBe(2);
    // Fold lines at gH, 2gH, 3gH, 4gH — one set per copy (8 total).
    const xs = foldLineXs(svg);
    expect(xs.length).toBe(8);
    const uniq = [...new Set(xs)].sort((a, b) => a - b);
    expect(uniq).toEqual([gH, 2 * gH, 3 * gH, 4 * gH]);
    // Subtitle reports the cube side directly (no reduction).
    expect(svg).toContain('Gnomon height: 30 mm');
  });

  it('prints a single net (no shrink) when two do not fit but one does', () => {
    // gH 45 → two strips exceed the page height, but one fits.
    const svg = buildDualDialNetSVGString(45, 279.4, 215.9);
    expect(svg).not.toMatch(/ scale\(0\./);          // never shrunk
    expect(svg).not.toContain('CROPPED');
    expect((svg.match(/>GLUE</g) || []).length).toBe(3); // one strip = 3 GLUE labels
  });

  it('prints one full-size net with a CROPPED warning when even one overflows', () => {
    // gH 80 → strip ~330 mm wide, wider than a 100×150 card.
    const svg = buildDualDialNetSVGString(80, 100, 150);
    expect(svg).not.toMatch(/ scale\(0\./);          // full size, not shrunk
    expect(svg).toContain('CROPPED - Reduce Gnomon Height');
  });

  it('crops the attachment tab leg to the cube side when the gnomons are close', () => {
    // gnomon 60 mm, cube side 40 mm → tab leg = min(60, 40) = 40, so the tab
    // bottom is at netH + 40 = 100 (not netH + 60 = 120).
    const svg = buildDualDialNetSVGString(60, 431.8, 279.4, false, 'white', 0, 40);
    expect(svg).toContain('40,100');
  });
});
