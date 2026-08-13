import { describe, it, expect, afterEach, vi } from 'vitest';
import { formatRelativeTime, formatDate } from './relativeTime';

const NOW = new Date('2026-08-13T12:00:00.000Z');

// Значение считается от Date.now() — без фиксированных часов пороги проверить
// нечем.
const at = (msAgo: number): string => new Date(NOW.getTime() - msAgo).toISOString();

const withClock = (fn: () => void) => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  fn();
};

afterEach(() => { vi.useRealTimers(); });

describe('formatRelativeTime', () => {
  it('shows "just now" for the first five seconds', () => {
    withClock(() => {
      expect(formatRelativeTime(at(0))).toBe('Saved just now');
      expect(formatRelativeTime(at(4_000))).toBe('Saved just now');
    });
  });

  it('switches to seconds, minutes, hours and days at each threshold', () => {
    withClock(() => {
      expect(formatRelativeTime(at(5_000))).toBe('Saved 5s ago');
      expect(formatRelativeTime(at(59_000))).toBe('Saved 59s ago');
      expect(formatRelativeTime(at(60_000))).toBe('Saved 1m ago');
      expect(formatRelativeTime(at(59 * 60_000))).toBe('Saved 59m ago');
      expect(formatRelativeTime(at(60 * 60_000))).toBe('Saved 1h ago');
      expect(formatRelativeTime(at(23 * 3_600_000))).toBe('Saved 23h ago');
      expect(formatRelativeTime(at(24 * 3_600_000))).toBe('Saved 1d ago');
      expect(formatRelativeTime(at(6 * 86_400_000))).toBe('Saved 6d ago');
    });
  });

  it('falls back to an exact date from a week on — "9d ago" says nothing useful', () => {
    withClock(() => {
      const iso = at(7 * 86_400_000);
      expect(formatRelativeTime(iso)).toBe(`Saved ${formatDate(iso)}`);
    });
  });

  it('never counts backwards on a clock skewed into the future', () => {
    withClock(() => {
      expect(formatRelativeTime(at(-60_000))).toBe('Saved just now');
    });
  });
});

describe('formatDate', () => {
  it('renders a valid ISO string as a local date-time', () => {
    expect(formatDate(NOW.toISOString())).toBe(NOW.toLocaleString());
  });

  // Разбор непарсимой строки не бросает — `new Date('...')` даёт объект с NaN,
  // и toLocaleString отдаёт «Invalid Date». Вместо выведения бесполезной подписи
  // функция возвращает исходное значение, чтобы пользователь увидел конкретные данные.
  it('returns the original value for an unparsable string', () => {
    expect(formatDate('не дата')).toBe('не дата');
  });
});
