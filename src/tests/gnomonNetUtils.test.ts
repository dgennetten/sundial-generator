import { describe, expect, it } from 'vitest';
import { buildGnomonNetSVGString } from '../utils/gnomonNetUtils';

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
