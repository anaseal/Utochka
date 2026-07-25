import { describe, it, expect } from 'vitest';
import { findBeadsAlongSegment } from './threadGeometry';

const buildIndex = (entries: Record<string, { x: number; y: number }>) => new Map(Object.entries(entries));

describe('findBeadsAlongSegment', () => {
  it('picks up a bead lying exactly on the segment', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      mid: { x: 50, y: 0 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'b', new Set(), 5)).toEqual(['mid']);
  });

  it('excludes a bead farther than perpendicularTolerance from the line', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      off: { x: 50, y: 10 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'b', new Set(), 5)).toEqual([]);
  });

  it('excludes beads beyond either endpoint (t<0 or t>1)', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      before: { x: -10, y: 0 },
      after: { x: 110, y: 0 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'b', new Set(), 5)).toEqual([]);
  });

  it('excludes ids already present in the trace (dedup/cycle guard)', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      mid: { x: 50, y: 0 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'b', new Set(['mid']), 5)).toEqual([]);
  });

  it('never returns fromId/toId even if geometrically degenerate', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'b', new Set(), 5)).toEqual([]);
  });

  it('orders multiple matches by projection along the segment', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      far: { x: 75, y: 0 },
      near: { x: 25, y: 0 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'b', new Set(), 5)).toEqual(['near', 'far']);
  });

  it('reverses order when direction is reversed', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      far: { x: 75, y: 0 },
      near: { x: 25, y: 0 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'b', 'a', new Set(), 5)).toEqual(['far', 'near']);
  });

  it('returns [] for a zero-length segment', () => {
    const index = buildIndex({
      a: { x: 10, y: 10 },
      same: { x: 10, y: 10 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'same', new Set(), 5)).toEqual([]);
  });

  it('returns [] when an endpoint id is missing from the index', () => {
    const index = buildIndex({ a: { x: 0, y: 0 } });
    expect(findBeadsAlongSegment(index, 'a', 'missing', new Set(), 5)).toEqual([]);
  });

  it('includes a point exactly at the tolerance boundary, excludes one just past it', () => {
    const index = buildIndex({
      a: { x: 0, y: 0 },
      onBoundary: { x: 50, y: 5 },
      pastBoundary: { x: 50, y: 5.01 },
      b: { x: 100, y: 0 },
    });
    expect(findBeadsAlongSegment(index, 'a', 'b', new Set(), 5)).toEqual(['onBoundary']);
  });
});
