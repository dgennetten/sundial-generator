import { describe, expect, it } from 'vitest';
import { getPrintDecorationFirstLine } from '../utils/adminPrintUtils';

describe('getPrintDecorationFirstLine', () => {
  it('returns the first trimmed non-empty dialTextBlock line', () => {
    const configJson = JSON.stringify({
      dialTextBlock: '  \r\n  **My Sundial**  \r\nSecond line',
    });

    expect(getPrintDecorationFirstLine(configJson)).toBe('**My Sundial**');
  });

  it.each([
    undefined,
    '',
    '{malformed',
    'null',
    '[]',
    JSON.stringify({}),
    JSON.stringify({ dialTextBlock: 42 }),
    JSON.stringify({ dialTextBlock: ' \n\t\r\n ' }),
  ])('returns null for missing or unusable snapshots', (configJson) => {
    expect(getPrintDecorationFirstLine(configJson)).toBeNull();
  });
});
