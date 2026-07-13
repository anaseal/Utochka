import { describe, it, expect } from 'vitest';
import { computeZoomToPointScroll } from './zoomToPoint';

describe('computeZoomToPointScroll', () => {
  it('zoom не меняется → scroll не зависит от zoom (viewBoxUnit сокращается)', () => {
    const result = computeZoomToPointScroll({
      containerLeft: 10,
      containerTop: 5,
      svgLeft: 40,
      svgTop: 20,
      paddingLeft: 30,
      paddingTop: 30,
      clientX: 200,
      clientY: 150,
      oldZoom: 1,
      newZoom: 1,
    });

    // containerLeft + paddingLeft - svgLeft (clientX/viewBoxUnitX взаимно уничтожаются)
    expect(result.scrollLeft).toBe(10 + 30 - 40);
    expect(result.scrollTop).toBe(5 + 30 - 20);
  });

  it('zoom-in (newZoom > oldZoom) увеличивает вклад viewBoxUnit в scroll', () => {
    const base = {
      containerLeft: 0,
      containerTop: 0,
      svgLeft: 0,
      svgTop: 0,
      paddingLeft: 0,
      paddingTop: 0,
      clientX: 100,
      clientY: 100,
    };

    const zoomedIn = computeZoomToPointScroll({ ...base, oldZoom: 1, newZoom: 2 });
    const unchanged = computeZoomToPointScroll({ ...base, oldZoom: 1, newZoom: 1 });

    expect(zoomedIn.scrollLeft).toBeGreaterThan(unchanged.scrollLeft);
    expect(zoomedIn.scrollTop).toBeGreaterThan(unchanged.scrollTop);
  });

  it('zoom-out (newZoom < oldZoom) уменьшает вклад viewBoxUnit в scroll', () => {
    const base = {
      containerLeft: 0,
      containerTop: 0,
      svgLeft: 0,
      svgTop: 0,
      paddingLeft: 0,
      paddingTop: 0,
      clientX: 100,
      clientY: 100,
    };

    const zoomedOut = computeZoomToPointScroll({ ...base, oldZoom: 1, newZoom: 0.5 });
    const unchanged = computeZoomToPointScroll({ ...base, oldZoom: 1, newZoom: 1 });

    expect(zoomedOut.scrollLeft).toBeLessThan(unchanged.scrollLeft);
    expect(zoomedOut.scrollTop).toBeLessThan(unchanged.scrollTop);
  });

  it('считает точную формулу: viewBoxUnit = (client - svg) / oldZoom, scroll = container + padding - client + viewBoxUnit * newZoom', () => {
    const result = computeZoomToPointScroll({
      containerLeft: 12,
      containerTop: 8,
      svgLeft: 50,
      svgTop: 30,
      paddingLeft: 20,
      paddingTop: 24,
      clientX: 300,
      clientY: 250,
      oldZoom: 1.5,
      newZoom: 2.25,
    });

    const viewBoxUnitX = (300 - 50) / 1.5;
    const viewBoxUnitY = (250 - 30) / 1.5;
    expect(result.scrollLeft).toBeCloseTo(12 + 20 - 300 + viewBoxUnitX * 2.25);
    expect(result.scrollTop).toBeCloseTo(8 + 24 - 250 + viewBoxUnitY * 2.25);
  });

  it('X и Y считаются независимо (несимметричные входные данные)', () => {
    const result = computeZoomToPointScroll({
      containerLeft: 0,
      containerTop: 100,
      svgLeft: 10,
      svgTop: 5,
      paddingLeft: 30,
      paddingTop: 20,
      clientX: 400,
      clientY: 40,
      oldZoom: 1,
      newZoom: 3,
    });

    expect(result.scrollLeft).not.toBe(result.scrollTop);
    expect(result.scrollLeft).toBeCloseTo(0 + 30 - 400 + (400 - 10) * 3);
    expect(result.scrollTop).toBeCloseTo(100 + 20 - 40 + (40 - 5) * 3);
  });
});
