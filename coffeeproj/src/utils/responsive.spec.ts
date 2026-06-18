import { describe, it, expect } from '@jest/globals';
import { BREAKPOINTS, classifyWidth, isCompactWidth } from './responsive';

describe('classifyWidth', () => {
  it('classifies iPhone widths as phone', () => {
    expect(classifyWidth(320)).toEqual('phone');
    expect(classifyWidth(390)).toEqual('phone');
    expect(classifyWidth(430)).toEqual('phone');
  });

  it('classifies an iPad in 1/3 Split View as phone (below tablet breakpoint)', () => {
    expect(classifyWidth(BREAKPOINTS.tablet - 1)).toEqual('phone');
  });

  it('classifies iPad Mini portrait and standard iPad portrait as tablet', () => {
    expect(classifyWidth(BREAKPOINTS.tablet)).toEqual('tablet');
    expect(classifyWidth(810)).toEqual('tablet');
    expect(classifyWidth(BREAKPOINTS.wide - 1)).toEqual('tablet');
  });

  it('classifies iPad Pro portrait + any iPad landscape as wide', () => {
    expect(classifyWidth(BREAKPOINTS.wide)).toEqual('wide');
    expect(classifyWidth(1194)).toEqual('wide');
    expect(classifyWidth(1366)).toEqual('wide');
  });
});

describe('isCompactWidth', () => {
  it('is true below the tablet breakpoint and false at or above it', () => {
    expect(isCompactWidth(BREAKPOINTS.tablet - 1)).toEqual(true);
    expect(isCompactWidth(BREAKPOINTS.tablet)).toEqual(false);
    expect(isCompactWidth(BREAKPOINTS.tablet + 1)).toEqual(false);
  });
});
