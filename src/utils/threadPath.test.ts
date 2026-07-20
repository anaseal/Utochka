import { describe, it, expect } from 'vitest';
import { buildThreadPathD } from './threadPath';

describe('buildThreadPathD', () => {
  it('two points produce a straight line segment', () => {
    const d = buildThreadPathD([{ x: 0, y: 0 }, { x: 100, y: 50 }]);
    expect(d).toBe('M 0 0 L 100 50');
  });

  it('single point produces a degenerate move-only path', () => {
    const d = buildThreadPathD([{ x: 10, y: 20 }]);
    expect(d).toBe('M 10 20');
  });

  it('empty input produces an empty path', () => {
    expect(buildThreadPathD([])).toBe('');
  });

  it('starts with M at the first point', () => {
    const points = [{ x: 5, y: 5 }, { x: 50, y: 10 }, { x: 100, y: 5 }];
    const d = buildThreadPathD(points);
    expect(d.startsWith('M 5 5')).toBe(true);
  });

  it('emits one cubic segment per gap between points', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }];
    const d = buildThreadPathD(points);
    expect(d.match(/C /g)?.length).toBe(points.length - 1);
  });

  it('collinear points produce a curve whose control points stay on the same line', () => {
    // Прямая по X (y=0) — контрольные точки Catmull-Rom для коллинеарных
    // опорных точек должны тоже лежать на y=0 (кривая вырождается в прямую).
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }];
    const d = buildThreadPathD(points);
    const numbers = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    // Первая пара — координаты M, дальше тройки (cp1x,cp1y, cp2x,cp2y, endx,endy) на сегмент.
    for (let i = 2; i < numbers.length; i += 2) {
      expect(numbers[i + 1]).toBeCloseTo(0);
    }
  });

  it('curve passes through every anchor point (each appears as a segment endpoint)', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 40 }, { x: 20, y: -10 }, { x: 30, y: 5 }];
    const d = buildThreadPathD(points);
    for (const p of points) {
      expect(d.includes(`${p.x} ${p.y}`)).toBe(true);
    }
  });
});
