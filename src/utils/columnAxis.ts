export interface ColumnAxisPoint {
  col: number;
  x: number;
}

// Восстанавливает подписи линейки для ВСЕХ колонок 0..width-2 (номинальная
// ширина, см. spec.md «Линейка и Taper»), даже если Taper срезал часть из
// них по всему полотну — тогда их вообще нет ни в одном нечётном ряду, и
// без экстраполяции линейка начиналась бы не с «1», а с первой уцелевшей
// колонки (нумерация «съезжала» при каждом изменении Depth).
//
// x линейна по col с одним и тем же шагом для любого нечётного ряда (общий
// stepX/offset, см. generator.ts) — поэтому шаг можно вывести из ЛЮБЫХ двух
// уцелевших точек, а по нему достроить положение отсутствующих.
//
// points — по одной точке (col, x) на каждый живой узел нечётного ряда,
// возможно с повторами col между разными рядами (используется первое
// значение) и точками за пределами [0, width-2] (отбрасываются).
export const buildColumnAxis = (points: ColumnAxisPoint[], width: number): ColumnAxisPoint[] => {
  const byCol = new Map<number, number>();
  for (const p of points) {
    if (p.col >= 0 && p.col <= width - 2 && !byCol.has(p.col)) byCol.set(p.col, p.x);
  }
  const knownCols = [...byCol.keys()].sort((a, b) => a - b);
  if (knownCols.length === 0) return [];

  let stepX = 0;
  for (let i = 1; i < knownCols.length && stepX === 0; i++) {
    const dc = knownCols[i] - knownCols[0];
    stepX = (byCol.get(knownCols[i])! - byCol.get(knownCols[0])!) / dc;
  }
  // Меньше двух различных x — экстраполировать нечем (единственная уцелевшая
  // колонка на всё полотно); отдаём только то, что реально есть, вместо
  // наложенных друг на друга мусорных подписей.
  if (stepX === 0) {
    return knownCols.map(col => ({ col, x: byCol.get(col)! }));
  }

  const anchorCol = knownCols[0];
  const anchorX = byCol.get(anchorCol)!;
  const result: ColumnAxisPoint[] = [];
  for (let c = 0; c <= width - 2; c++) {
    const x = byCol.has(c) ? byCol.get(c)! : anchorX + (c - anchorCol) * stepX;
    result.push({ col: c, x });
  }
  return result;
};

// Ось зеркала — середина НОМИНАЛЬНОЙ ширины полотна, а не середина того, что
// от неё осталось. Половина максимального x уцелевших узлов не подходит: при
// активном Taper с ненулевым depth срез держится по всему полотну,
// максимальный x меньше номинального, и линия оси съехала бы вбок — хотя
// зеркалит редактор по полной сетке (mirrorCol в mirror.ts), т.е. линия
// показывала бы не ту ось, вокруг которой реально работает Mirror Mode.
//
// Принимает уже достроенную ось колонок (buildColumnAxis): её крайние точки —
// колонки 0 и width-2 с учётом экстраполяции срезанных, поэтому середина между
// ними и есть середина полотна. null — колонок меньше двух (достраивать было
// не из чего), рисовать ось нечем.
export const computeMirrorAxisX = (axis: ColumnAxisPoint[], width: number): number | null => {
  if (width <= 1 || axis.length !== width - 1) return null;
  return (axis[0].x + axis[axis.length - 1].x) / 2;
};
