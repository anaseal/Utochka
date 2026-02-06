/* src/types/bead.ts */

/**
 * Тип бисеринки: 
 * NODE — ключевая точка (узел), где пересекаются нити.
 * SPAN — соединительная бисерина в пролете между узлами.
 */
export type BeadType = 'NODE' | 'SPAN';

/**
 * Интерфейс элементарной единицы — Бисерины
 */
export interface Bead {
  id: string;
  x: number;
  y: number;
  type: BeadType;
  color?: string;
  clusterId?: string;
  logicalIndex: { row: number; col: number };
}

/**
 * Конфигурация сетки для генератора
 */
export interface GridConfig {
  width: number;
  height: number;
  spacing: number;
  topSpan: number;    // Количество бусин в верхних гранях ("плечи")
  bottomSpan: number; // Количество бусин в нижних гранях ("ножки")
}

/**
 * Структура всей схемы силянки
 */
export interface SilyankaSchema {
  metadata: {
    name: string;
    author: string;
    createdAt: number;
  };
  dimensions: {
    width: number;        // Количество колонок
    height: number;       // Количество рядов
  };
  beads: Bead[];          // Плоский массив всех бисерин для быстрого рендера
}