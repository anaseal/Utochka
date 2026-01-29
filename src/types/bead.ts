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
  type: 'NODE' | 'SPAN';
  color?: string; // Опционально, так как основной цвет теперь в стейте
  clusterId?: string;
  logicalIndex: { row: number; col: number };
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