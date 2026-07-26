// Поворот/отражение полотна в режиме плетения выполняются одной матрицей на
// внешней группе <svg> (см. CanvasView/CrossWeaveCanvasView) — всё содержимое
// наследует её автоматически. Подписи линеек — единственное, что при этом
// ломается: цифры ложатся набок и зеркалятся. Каждой подписи даётся
// контр-преобразование вокруг её собственной точки привязки, ровно обратное
// линейной части матрицы полотна (сдвиг не в счёт — точка остаётся на месте):
//   flip:            зеркало вокруг вертикали через точку;
//   rotate(-90):     обратный поворот rotate(90) вокруг точки;
//   flip + rotate:   их композиция (порядок как в обратной матрице: сначала
//                    поворот, затем зеркало).

export const weaveLabelTransform = (
  rotated: boolean,
  flipped: boolean,
): ((x: number, y: number) => string | undefined) | undefined => {
  if (!rotated && !flipped) return undefined;
  return (x, y) => {
    const flip = flipped ? `translate(${2 * x} 0) scale(-1 1)` : '';
    const rotate = rotated ? `rotate(90 ${x} ${y})` : '';
    return `${flip} ${rotate}`.trim();
  };
};

export type WeaveLabelTransform = ReturnType<typeof weaveLabelTransform>;
