import { describe, it, expect } from '@jest/globals';
import { computeMasterWidth } from './MasterDetailLayout';

describe('computeMasterWidth', () => {
  const ratio = 0.38;
  const minWidth = 320;
  const maxWidth = 420;

  it('clamps to minWidth when total*ratio is below the minimum (iPad Mini portrait)', () => {
    expect(computeMasterWidth(768, ratio, minWidth, maxWidth)).toEqual(minWidth);
  });

  it('returns total*ratio when it falls inside the [min, max] band', () => {
    expect(computeMasterWidth(1000, ratio, minWidth, maxWidth)).toEqual(380);
  });

  it('clamps to maxWidth when total*ratio exceeds the maximum (iPad Pro landscape)', () => {
    expect(computeMasterWidth(1366, ratio, minWidth, maxWidth)).toEqual(maxWidth);
  });
});
