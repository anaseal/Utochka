import { describe, it, expect } from 'vitest';
import { shiftDesignMapColumns } from './regrid';

const NEW_W = 6;

describe('shiftDesignMapColumns — shift right (+1)', () => {
  const result = shiftDesignMapColumns(
    {
      'node-0-0': 'a', // чётный ряд, c→1, maxC=5 → ok
      'node-0-5': 'b', // c→6 > 5 → отброшен
      'node-1-3': 'c', // нечётный, c→4, maxC=newW-2=4 → ok
      'node-1-4': 'd', // c→5 > 4 → отброшен
      'span-edge-top-link-3-bead-1': 'e', // c→4 ≤ newW-2 → ok
      'span-edge-top-link-4-bead-1': 'f', // c→5 > 4 → отброшен
      'span-edge-bottom-link-3-bead-1': 'g', // c→4 → ok
      'span-edge-2-4-right-bead-1': 'h', // чётный, c→5 ≤ 5 → ok
      'decor-2-1-1': 'x', // regrid декор не обрабатывает → отброшен
    },
    1,
    NEW_W,
  );

  it('preserves colors of shifted beads', () => {
    expect(result['node-0-1']).toBe('a');
    expect(result['node-1-4']).toBe('c');
    expect(result['span-edge-top-link-4-bead-1']).toBe('e');
    expect(result['span-edge-bottom-link-4-bead-1']).toBe('g');
    expect(result['span-edge-2-5-right-bead-1']).toBe('h');
  });

  it('drops everything that falls outside the grid, and unhandled decor', () => {
    // 5 из 9 входов доживают до результата
    expect(Object.keys(result)).toHaveLength(5);
    expect(result).not.toHaveProperty('node-0-6');
    expect(result).not.toHaveProperty('decor-2-2-1');
  });
});

describe('shiftDesignMapColumns — shift left (-1)', () => {
  const result = shiftDesignMapColumns(
    {
      'span-edge-2-1-left-bead-1': 'k', // чётный left, c→0 → нет левой грани в кол.0
      'span-edge-2-2-left-bead-1': 'm', // c→1 → ok
      'node-0-0': 'n', // c→-1 → отброшен
    },
    -1,
    NEW_W,
  );

  it('the left edge in column 0 of an even row is absent → dropped', () => {
    expect(result).not.toHaveProperty('span-edge-2-0-left-bead-1');
  });

  it('a valid left shift is preserved', () => {
    expect(result['span-edge-2-1-left-bead-1']).toBe('m');
  });

  it('column -1 outside the grid → dropped', () => {
    expect(Object.keys(result)).toHaveLength(1);
  });
});
