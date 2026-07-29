import { describe, it, expect } from 'vitest';
import { getDecorRowStep } from './decorGeometry';

describe('getDecorRowStep', () => {
  it('uses spacing*verticalCompression when it exceeds the minimum physical span', () => {
    // spacing=100 → 100*0.2=20, well above spanRadius*2+2=14
    expect(getDecorRowStep(100)).toBe(20);
  });

  it('clamps to the minimum physical span (spanRadius*2+2) at low spacing', () => {
    // spacing=65 → 65*0.2=13 < 14 → clamp dominates
    expect(getDecorRowStep(65)).toBe(14);
  });

  it('at the crossover point both formulas agree', () => {
    // spacing=70 → 70*0.2=14 == spanRadius*2+2=14
    expect(getDecorRowStep(70)).toBe(14);
  });
});
