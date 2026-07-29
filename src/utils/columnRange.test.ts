import { describe, it, expect } from 'vitest';
import { getColumnRange } from './columnRange';

const WIDTH = 6;

describe('getColumnRange — even (unshifted) rows', () => {
  it('always span [0, width-1], regardless of Edge Extension flags', () => {
    expect(getColumnRange(0, WIDTH, true, true)).toEqual({ minC: 0, maxC: 5 });
    expect(getColumnRange(2, WIDTH, false, false)).toEqual({ minC: 0, maxC: 5 });
  });
});

describe('getColumnRange — odd (shifted) rows', () => {
  it('both sides extended: [-1, width-1]', () => {
    expect(getColumnRange(1, WIDTH, true, true)).toEqual({ minC: -1, maxC: 5 });
  });

  it('both sides retracted: [0, width-2]', () => {
    expect(getColumnRange(1, WIDTH, false, false)).toEqual({ minC: 0, maxC: 4 });
  });

  it('left extended only: [-1, width-2]', () => {
    expect(getColumnRange(1, WIDTH, true, false)).toEqual({ minC: -1, maxC: 4 });
  });

  it('right extended only: [0, width-1]', () => {
    expect(getColumnRange(1, WIDTH, false, true)).toEqual({ minC: 0, maxC: 5 });
  });
});
