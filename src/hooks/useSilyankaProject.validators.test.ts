import { describe, it, expect } from 'vitest';
import { BEAD_THEME } from '../config/theme';
import { isRowSpanOverrides, isDecorBands } from './useSilyankaProject.validators';

// Значения этих двух карт попадают в generator.ts как границы циклов
// (getInternalCount и getDecorRows). Всё, что мимо диапазона, либо вешает
// вкладку на миллиарде итераций, либо рассыпает геометрию в NaN — и ни то,
// ни другое не перехватывается ErrorBoundary. Источники — localStorage,
// файл проекта и Share-ссылка, то есть значения снаружи степперов.
describe('isRowSpanOverrides', () => {
  const { minSpan, maxSpan } = BEAD_THEME.constraints;

  it('пропускает спаны в границах, включая ряды цепочек (-1, -2)', () => {
    expect(isRowSpanOverrides({})).toBe(true);
    expect(isRowSpanOverrides({ 0: minSpan, 5: maxSpan })).toBe(true);
    expect(isRowSpanOverrides({ '-1': 4, '-2': 6 })).toBe(true);
  });

  it('отклоняет карту с числом, которое увело бы генератор в бесконечный цикл', () => {
    expect(isRowSpanOverrides({ 0: 1e9 })).toBe(false);
    expect(isRowSpanOverrides({ 0: maxSpan, 3: 1e9 })).toBe(false);
  });

  it('отклоняет NaN — из-за него getYStep нечисловой и холст пустеет', () => {
    expect(isRowSpanOverrides({ 0: NaN })).toBe(false);
    expect(isRowSpanOverrides({ 0: Infinity })).toBe(false);
  });

  it('отклоняет дробные, отрицательные и выход за границы степпера', () => {
    expect(isRowSpanOverrides({ 0: 4.5 })).toBe(false);
    expect(isRowSpanOverrides({ 0: -3 })).toBe(false);
    expect(isRowSpanOverrides({ 0: minSpan - 1 })).toBe(false);
    expect(isRowSpanOverrides({ 0: maxSpan + 1 })).toBe(false);
  });

  it('отклоняет не-числа и не-объекты', () => {
    expect(isRowSpanOverrides({ 0: '5' })).toBe(false);
    expect(isRowSpanOverrides({ 0: null })).toBe(false);
    expect(isRowSpanOverrides(null)).toBe(false);
    expect(isRowSpanOverrides('{}')).toBe(false);
  });
});

describe('isDecorBands', () => {
  const { minRows, maxRows } = BEAD_THEME.decorDefaults;

  it('пропускает число рядов полосы в границах', () => {
    expect(isDecorBands({})).toBe(true);
    expect(isDecorBands({ 2: minRows, 4: maxRows })).toBe(true);
  });

  it('отклоняет большое число — цикл сборки полосы не ограничен ничем другим', () => {
    expect(isDecorBands({ 2: 1e9 })).toBe(false);
    expect(isDecorBands({ 2: maxRows + 1 })).toBe(false);
  });

  // Диапазон у декора свой (число рядов), не спановый 3–10 — проверка на
  // случай, если валидаторы снова захотят склеить в псевдоним.
  it('не путает свой диапазон со спановым', () => {
    expect(isDecorBands({ 2: 1 })).toBe(true);
    expect(isRowSpanOverrides({ 2: 1 })).toBe(false);
  });

  it('отклоняет NaN, ноль, отрицательные и дробные', () => {
    expect(isDecorBands({ 2: NaN })).toBe(false);
    expect(isDecorBands({ 2: 0 })).toBe(false);
    expect(isDecorBands({ 2: -1 })).toBe(false);
    expect(isDecorBands({ 2: 2.5 })).toBe(false);
  });
});
