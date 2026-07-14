import { describe, it, expect } from 'vitest';
import { swapColorInMap, swapColorInPendants, swapColorInChains } from './colorSwap';
import { PendantPlacement, PendantChain } from '../types/pendant';

describe('swapColorInMap', () => {
  it('replaces every matching value, leaves others untouched', () => {
    const map = { a: '#ff0000', b: '#00ff00', c: '#ff0000' };
    expect(swapColorInMap(map, '#ff0000', '#0000ff')).toEqual({
      a: '#0000ff', b: '#00ff00', c: '#0000ff',
    });
  });

  it('returns the same reference when there is no match', () => {
    const map = { a: '#00ff00' };
    expect(swapColorInMap(map, '#ff0000', '#0000ff')).toBe(map);
  });

  it('returns the same reference when oldColor === newColor', () => {
    const map = { a: '#ff0000' };
    expect(swapColorInMap(map, '#ff0000', '#ff0000')).toBe(map);
  });

  it('handles an empty map', () => {
    const map = {};
    expect(swapColorInMap(map, '#ff0000', '#0000ff')).toBe(map);
  });
});

describe('swapColorInPendants', () => {
  const makePlacement = (colorMap: Record<number, string>): PendantPlacement => ({
    placementId: 'p1',
    templateId: 't1',
    col: 0,
    colorMap,
  });

  it('replaces matching colors inside placement colorMaps', () => {
    const placements = [makePlacement({ 0: '#ff0000', 1: '#00ff00' })];
    const next = swapColorInPendants(placements, '#ff0000', '#0000ff');
    expect(next[0].colorMap).toEqual({ 0: '#0000ff', 1: '#00ff00' });
  });

  it('only replaces placements that changed, leaving unaffected ones by reference', () => {
    const untouched = makePlacement({ 0: '#00ff00' });
    const touched = makePlacement({ 0: '#ff0000' });
    const placements = [untouched, touched];
    const next = swapColorInPendants(placements, '#ff0000', '#0000ff');
    expect(next[0]).toBe(untouched);
    expect(next[1]).not.toBe(touched);
    expect(next[1].colorMap).toEqual({ 0: '#0000ff' });
  });

  it('returns the same reference when nothing matches', () => {
    const placements = [makePlacement({ 0: '#00ff00' })];
    expect(swapColorInPendants(placements, '#ff0000', '#0000ff')).toBe(placements);
  });

  it('returns the same reference when oldColor === newColor', () => {
    const placements = [makePlacement({ 0: '#ff0000' })];
    expect(swapColorInPendants(placements, '#ff0000', '#ff0000')).toBe(placements);
  });
});

describe('swapColorInChains', () => {
  const makeChain = (colorMap: Record<number, string>): PendantChain => ({
    placementId: 'c1',
    startCol: 0,
    endCol: 5,
    colorMap,
  });

  it('replaces matching colors inside chain colorMaps', () => {
    const chains = [makeChain({ 0: '#ff0000', 1: '#00ff00' })];
    const next = swapColorInChains(chains, '#ff0000', '#0000ff');
    expect(next[0].colorMap).toEqual({ 0: '#0000ff', 1: '#00ff00' });
  });

  it('only replaces chains that changed, leaving unaffected ones by reference', () => {
    const untouched = makeChain({ 0: '#00ff00' });
    const touched = makeChain({ 0: '#ff0000' });
    const chains = [untouched, touched];
    const next = swapColorInChains(chains, '#ff0000', '#0000ff');
    expect(next[0]).toBe(untouched);
    expect(next[1]).not.toBe(touched);
    expect(next[1].colorMap).toEqual({ 0: '#0000ff' });
  });

  it('returns the same reference when nothing matches', () => {
    const chains = [makeChain({ 0: '#00ff00' })];
    expect(swapColorInChains(chains, '#ff0000', '#0000ff')).toBe(chains);
  });

  it('returns the same reference when oldColor === newColor', () => {
    const chains = [makeChain({ 0: '#ff0000' })];
    expect(swapColorInChains(chains, '#ff0000', '#ff0000')).toBe(chains);
  });
});
