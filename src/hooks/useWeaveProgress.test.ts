// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useWeaveProgress } from './useWeaveProgress';

const PERSIST_MS = 300;

const setup = (technique: 'silyanka' | 'crossWeave' = 'silyanka') =>
  renderHook(() => useWeaveProgress(technique));

// Мазок целиком: так его и делает холст — beginStroke на pointerdown,
// applyToBeads на каждое движение, endStroke на pointerup.
const stroke = (
  result: { current: ReturnType<typeof useWeaveProgress> },
  steps: [string[], 'mark' | 'unmark' | 'clear'][],
) => {
  const applied: [string, number][][] = [];
  act(() => {
    result.current.beginStroke();
    for (const [ids, mode] of steps) applied.push(result.current.applyToBeads(ids, mode));
    result.current.endStroke();
  });
  return applied;
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('отметка проходов', () => {
  it('отметка ставит первый проход', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0', 'node-0-1'], 'mark']]);
    expect(result.current.passes).toEqual({ 'node-0-0': 1, 'node-0-1': 1 });
  });

  // Кратность прохода — это и есть весь смысл режима: по повторным проходам
  // читается направление плетения.
  it('повторные проходы копятся', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark']]);
    stroke(result, [[['node-0-0'], 'mark']]);
    stroke(result, [[['node-0-0'], 'mark']]);
    expect(result.current.passes['node-0-0']).toBe(3);
  });

  it('проходы копятся и внутри одного мазка', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark'], [['node-0-0'], 'mark']]);
    expect(result.current.passes['node-0-0']).toBe(2);
  });

  it('снятие убирает один проход, а не всю отметку', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark'], [['node-0-0'], 'mark']]);
    stroke(result, [[['node-0-0'], 'unmark']]);
    expect(result.current.passes['node-0-0']).toBe(1);
  });

  it('снятие последнего прохода убирает бисерину из прогресса', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark']]);
    stroke(result, [[['node-0-0'], 'unmark']]);
    expect(result.current.passes).toEqual({});
  });

  it('снятие с неотмеченной бисерины ничего не делает', () => {
    const { result } = setup();
    const applied = stroke(result, [[['node-0-0'], 'unmark']]);
    expect(applied[0]).toEqual([]);
    expect(result.current.passes).toEqual({});
  });

  it('очистка снимает все проходы разом', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark'], [['node-0-0'], 'mark'], [['node-0-0'], 'mark']]);
    stroke(result, [[['node-0-0'], 'clear']]);
    expect(result.current.passes).toEqual({});
  });

  it('markedCount считает бисерины, а не проходы', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark'], [['node-0-0'], 'mark'], [['node-0-1'], 'mark']]);
    expect(result.current.markedCount).toBe(2);
  });
});

describe('мазок', () => {
  // Так же, как рисование кистью (см. useDrawing): без этого протяжка
  // пересобирала бы сетку из тысяч бисерин на каждое движение пальца.
  it('во время мазка state не меняется — только в endStroke', () => {
    const { result } = setup();

    act(() => {
      result.current.beginStroke();
      result.current.applyToBeads(['node-0-0'], 'mark');
    });
    expect(result.current.passes).toEqual({});

    act(() => { result.current.endStroke(); });
    expect(result.current.passes).toEqual({ 'node-0-0': 1 });
  });

  it('applyToBeads отдаёт новые значения для покраски в DOM', () => {
    const { result } = setup();
    const applied = stroke(result, [[['node-0-0', 'node-0-1'], 'mark']]);
    expect(applied[0]).toEqual([['node-0-0', 1], ['node-0-1', 1]]);
  });

  it('в ответ попадают только реально изменившиеся бисерины', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark']]);

    const applied = stroke(result, [[['node-0-0', 'node-0-1'], 'clear']]);

    expect(applied[0]).toEqual([['node-0-0', 0]]);
  });

  it('мазок без изменений не пишется в историю', () => {
    const { result } = setup();
    stroke(result, [[[], 'mark']]);
    expect(result.current.canUndo).toBe(false);
  });

  it('весь мазок — один шаг истории, а не по бисерине на шаг', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark'], [['node-0-1'], 'mark'], [['node-0-2'], 'mark']]);

    act(() => { result.current.undo(); });

    expect(result.current.passes).toEqual({});
    expect(result.current.canUndo).toBe(false);
  });
});

describe('«где я остановилась»', () => {
  it('запоминается последний отмеченный сегмент', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0', 'node-0-1'], 'mark']]);
    expect(result.current.lastSegment).toEqual(['node-0-0', 'node-0-1']);
  });

  it('снятие и очистка место остановки не сдвигают', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark']]);
    stroke(result, [[['node-0-0'], 'unmark']]);
    expect(result.current.lastSegment).toEqual(['node-0-0']);
  });

  it('отмена возвращает и место остановки', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark']]);
    stroke(result, [[['node-1-0'], 'mark']]);

    act(() => { result.current.undo(); });

    expect(result.current.lastSegment).toEqual(['node-0-0']);
  });
});

describe('отмена и сброс', () => {
  it('отмена возвращает состояние до мазка', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark']]);
    stroke(result, [[['node-0-1'], 'mark']]);

    act(() => { result.current.undo(); });

    expect(result.current.passes).toEqual({ 'node-0-0': 1 });
  });

  it('пустая история — отмена ничего не делает', () => {
    const { result } = setup();
    expect(result.current.canUndo).toBe(false);
    act(() => { result.current.undo(); });
    expect(result.current.passes).toEqual({});
  });

  it('история ограничена 30 шагами — самые старые забываются', () => {
    const { result } = setup();
    for (let i = 0; i < 31; i++) stroke(result, [[[`node-0-${i}`], 'mark']]);

    for (let i = 0; i < 30; i++) act(() => { result.current.undo(); });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.passes).toEqual({ 'node-0-0': 1 });
  });

  it('сброс снимает весь прогресс и попадает в историю', () => {
    const { result } = setup();
    stroke(result, [[['node-0-0'], 'mark'], [['node-0-1'], 'mark']]);

    act(() => { result.current.resetAll(); });
    expect(result.current.passes).toEqual({});

    act(() => { result.current.undo(); });
    expect(result.current.passes).toEqual({ 'node-0-0': 1, 'node-0-1': 1 });
  });

  it('сброс пустого прогресса не засоряет историю', () => {
    const { result } = setup();
    act(() => { result.current.resetAll(); });
    expect(result.current.canUndo).toBe(false);
  });
});

describe('сохранение', () => {
  it('прогресс переживает перезагрузку', () => {
    const first = setup();
    stroke(first.result, [[['node-0-0'], 'mark'], [['node-0-0'], 'mark']]);
    act(() => { vi.advanceTimersByTime(PERSIST_MS); });
    first.unmount();

    const { result } = setup();

    expect(result.current.passes).toEqual({ 'node-0-0': 2 });
    expect(result.current.lastSegment).toEqual(['node-0-0']);
  });

  it('у каждой техники свой прогресс', () => {
    const silyanka = setup('silyanka');
    stroke(silyanka.result, [[['node-0-0'], 'mark']]);
    act(() => { vi.advanceTimersByTime(PERSIST_MS); });

    expect(localStorage.getItem('silyanka:weavePasses')).toBe(JSON.stringify({ 'node-0-0': 1 }));
    expect(localStorage.getItem('crossWeave:weavePasses')).toBeNull();
  });

  it('испорченное хранилище не ломает вход в режим', () => {
    localStorage.setItem('silyanka:weavePasses', JSON.stringify({ 'node-0-0': 'много' }));
    const { result } = setup();
    expect(result.current.passes).toEqual({});
  });

  // История отмен живёт только в сессии — после перезагрузки отменять нечего,
  // а прогресс на месте.
  it('история отмен не сохраняется между сессиями', () => {
    const first = setup();
    stroke(first.result, [[['node-0-0'], 'mark']]);
    act(() => { vi.advanceTimersByTime(PERSIST_MS); });
    first.unmount();

    const { result } = setup();

    expect(result.current.canUndo).toBe(false);
    expect(result.current.passes).toEqual({ 'node-0-0': 1 });
  });
});
