// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { usePersistedState } from './usePersistedState';

// Совпадает с PERSIST_DEBOUNCE_MS в usePersistedState.ts.
const DEBOUNCE_MS = 300;

const isNumber = (v: unknown): v is number => typeof v === 'number';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('чтение при монтировании', () => {
  it('пустое хранилище — берётся начальное значение', () => {
    const { result } = renderHook(() => usePersistedState('k', 42, isNumber));
    expect(result.current[0]).toBe(42);
  });

  it('сохранённое значение восстанавливается', () => {
    localStorage.setItem('k', '7');
    const { result } = renderHook(() => usePersistedState('k', 42, isNumber));
    expect(result.current[0]).toBe(7);
  });

  it('значение не прошло проверку — начальное, а не мусор из хранилища', () => {
    localStorage.setItem('k', '"строка вместо числа"');
    const { result } = renderHook(() => usePersistedState('k', 42, isNumber));
    expect(result.current[0]).toBe(42);
  });

  it('битый JSON — начальное значение, без падения', () => {
    localStorage.setItem('k', '{ это не json');
    const { result } = renderHook(() => usePersistedState('k', 42, isNumber));
    expect(result.current[0]).toBe(42);
  });

  it('без функции проверки значение берётся как есть', () => {
    localStorage.setItem('k', '{"a":1}');
    const { result } = renderHook(() => usePersistedState<Record<string, number>>('k', {}));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('localStorage недоступен — начальное значение, без падения', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const { result } = renderHook(() => usePersistedState('k', 42, isNumber));
    expect(result.current[0]).toBe(42);
  });
});

describe('запись с дебаунсом', () => {
  it('сразу после изменения в хранилище ещё ничего нет', () => {
    const { result } = renderHook(() => usePersistedState('k', 0, isNumber));
    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });

    act(() => { result.current[1](5); });

    expect(localStorage.getItem('k')).toBe('0');
  });

  it('после паузы значение оказывается в хранилище', () => {
    const { result } = renderHook(() => usePersistedState('k', 0, isNumber));

    act(() => { result.current[1](5); });
    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });

    expect(localStorage.getItem('k')).toBe('5');
  });

  // Ради этого дебаунс и вводился: протяжка кистью меняет designMap на каждую
  // задетую бисерину, и синхронный JSON.stringify+setItem на каждую из них
  // блокировал main thread.
  it('поток быстрых изменений схлопывается в одну запись', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => usePersistedState('k', 0, isNumber));
    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });
    setItem.mockClear();

    for (let i = 1; i <= 20; i++) {
      act(() => { result.current[1](i); });
      act(() => { vi.advanceTimersByTime(DEBOUNCE_MS - 1); });
    }

    expect(setItem).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('k')).toBe('20');
  });

  it('размонтирование до истечения паузы отменяет запись', () => {
    const { result, unmount } = renderHook(() => usePersistedState('k', 0, isNumber));
    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });

    act(() => { result.current[1](5); });
    unmount();
    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });

    expect(localStorage.getItem('k')).toBe('0');
  });

  it('переполненное хранилище не роняет приложение', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => usePersistedState('k', 0, isNumber));

    expect(() => {
      act(() => { result.current[1](5); });
      act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });
    }).not.toThrow();
    expect(result.current[0]).toBe(5);
  });

  // В приложении ключи константны (см. App.tsx и use*Project.ts), так что это
  // фиксация поведения, а не рабочий сценарий: значение при смене ключа не
  // перечитывается, а переезжает под новый ключ.
  it('смена ключа переносит текущее значение, не перечитывая хранилище', () => {
    localStorage.setItem('b', '99');
    const { result, rerender } = renderHook(
      ({ k }) => usePersistedState(k, 0, isNumber),
      { initialProps: { k: 'a' } },
    );
    act(() => { result.current[1](5); });
    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });

    rerender({ k: 'b' });
    act(() => { vi.advanceTimersByTime(DEBOUNCE_MS); });

    expect(result.current[0]).toBe(5);
    expect(localStorage.getItem('b')).toBe('5');
    expect(localStorage.getItem('a')).toBe('5');
  });
});
