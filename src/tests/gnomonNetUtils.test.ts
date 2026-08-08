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
    // Two identical strips → two glue tabs.
    expect((svg.match(/>GLUE</g) || []).length).toBe(2);
    // Fold lines at gH, 2gH, 3gH, 4gH — one set per copy (8 total).
    const xs = foldLineXs(svg);
    expect(xs.length).toBe(8);
    const uniq = [...new Set(xs)].sort((a, b) => a - b);
    expect(uniq).toEqual([gH, 2 * gH, 3 * gH, 4 * gH]);
    // Subtitle reports the cube side directly (no reduction).
    expect(svg).toContain('Gnomon height: 30 mm');
  });

  it('shrinks the strips when they do not fit', () => {
    // gH = 80 → strip width 320 + 10 = 330 mm, wider than a 100×150 card.
    const svg = buildDualDialNetSVGString(80, 100, 150);
    expect(svg).toMatch(/ scale\(0\./);
  });
});
