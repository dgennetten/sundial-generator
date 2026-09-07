import { describe, expect, it } from 'vitest';
import { shouldAutoPreviewGnomonNet } from '../types/sundial';

describe('gnomon preview mode', () => {
  it('suppresses the two-page gnomon-net hint during World Tour restores', () => {
    expect(shouldAutoPreviewGnomonNet('dual-dial-popup', true)).toBe(false);
    expect(shouldAutoPreviewGnomonNet('glued-popup-base', true)).toBe(false);
  });

  it('preserves the hint for ordinary two-page gnomon selections', () => {
    expect(shouldAutoPreviewGnomonNet('dual-dial-popup', false)).toBe(true);
    expect(shouldAutoPreviewGnomonNet('glued-popup-base', false)).toBe(true);
    expect(shouldAutoPreviewGnomonNet('popup-with-brace', false)).toBe(false);
  });
});
