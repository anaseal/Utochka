import { useMemo } from 'react';
import { CanvasOrientation } from '../components/Editor/Header/Header.types';
import { weaveLabelTransform } from '../utils/weaveView';

// Вид полотна (поворот/отражение) — общий для рисования и режима плетения,
// для всех четырёх техник (см. spec.md, «Поворот и отражение полотна»).
// Одна матрица на все четыре положения, применяется к внешней группе <svg>
// (см. CanvasView/CrossWeaveCanvasView/PeyoteCanvasView/LoomCanvasView).
// Отражение — зеркало полотна (правый край становится левым) и потому идёт
// ДО поворота. Всё, что нарисовано в координатах бисерин — сетка, отметки,
// подвески, нитки, рамка штампа — наследует преобразование без единой
// правки, а перевод координат курсора (useBeadCoords) продолжает работать,
// потому что считает через getScreenCTM внутренней группы — это верно для
// любой родительской трансформации, а не только для матрицы режима
// плетения, поэтому включать поворот/отражение можно и вне его.

interface UseCanvasViewOptions {
  orientation: CanvasOrientation;
  flipped: boolean;
  /** Размер полотна без учёта поворота (см. computeCanvasDim). */
  dim: { w: number; h: number };
}

export const useCanvasView = ({ orientation, flipped, dim }: UseCanvasViewOptions) => {
  const rotated = orientation === 'horizontal';
  const viewW = rotated ? dim.h : dim.w;
  const viewH = rotated ? dim.w : dim.h;

  const transform = useMemo(() => {
    const flip = flipped ? `translate(${dim.w}, 0) scale(-1, 1)` : '';
    const rotate = rotated ? `translate(0, ${dim.w}) rotate(-90)` : '';
    const combined = `${rotate} ${flip}`.trim();
    return combined === '' ? undefined : combined;
  }, [flipped, rotated, dim.w]);

  // Подписи линеек получают обратное преобразование вокруг своей точки —
  // см. utils/weaveView.ts.
  const labelTransform = useMemo(
    () => weaveLabelTransform(rotated, flipped),
    [rotated, flipped],
  );

  return { transform, labelTransform, viewW, viewH, rotated };
};
