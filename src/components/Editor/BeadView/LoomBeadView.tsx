/* FILE: src\components\Editor\BeadView\LoomBeadView.tsx */
import { memo } from 'react';
import { LOOM_THEME } from '../../../config/loomTheme';
import { beadStateClass, effectiveBeadColor } from '../../../config/theme';
import './BeadView.css';

interface LoomBeadViewProps {
  id: string;
  x: number;
  y: number;
  // Размер прямоугольника РОВНО равен шагу сетки (pitchX/pitchY, см.
  // LoomCanvasView.tsx) — не отдельная «визуальная» константа: иначе
  // бисерины расходятся зазором или наезжают друг на друга (см.
  // config/loomTheme.ts).
  beadWidth: number;
  beadHeight: number;
  color?: string;
  defaultColor: string;
  highlighted?: boolean;
  // Цвет-«призрак» превью штампа в текущей наведённой позиции — см.
  // BeadView.tsx.
  previewColor?: string;
  onPointerDown: (id: string) => void;
  onPointerEnter: (id: string) => void;
}

// Прямоугольная бисерина встык — уже, чем выше, тот же rowPitchRatio, что у
// Peyote (см. PeyoteBeadView.tsx), но форма не зависит от чётности ряда: у
// Loom, в отличие от Peyote, ряды не сдвинуты друг относительно друга вовсе
// (см. loomGenerator.ts).
export const LoomBeadView = memo(({
  id,
  x,
  y,
  beadWidth,
  beadHeight,
  color,
  defaultColor,
  highlighted,
  previewColor,
  onPointerDown,
  onPointerEnter,
}: LoomBeadViewProps) => {
  const finalColor = effectiveBeadColor(color, defaultColor);

  const { cornerRadius, hitboxRadius } = LOOM_THEME.sizes;

  return (
    <g
      // id нужен для превью штампа (getBoundingClientRect и т.п.) и общей
      // конвенции с остальными видами бисерин — см. CrossWeaveBeadView.tsx.
      id={id}
      className={`bead bead--type-span${beadStateClass(color)}`}
      onPointerEnter={() => onPointerEnter(id)}
      onPointerDown={(e) => {
        // См. BeadView.tsx: снимаем implicit pointer capture с e.target
        // (реально захваченный <rect>), а не e.currentTarget (<g>) — иначе
        // release молча не срабатывает и рисование линией пальцем на
        // мобильном ломается.
        if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
        onPointerDown(id);
      }}
    >
      <rect
        className="bead__hitbox"
        x={x - hitboxRadius}
        y={y - hitboxRadius}
        width={hitboxRadius * 2}
        height={hitboxRadius * 2}
      />
      {highlighted && (
        <rect
          className="bead__highlight"
          x={x - beadWidth / 2 - 3.5}
          y={y - beadHeight / 2 - 3.5}
          width={beadWidth + 7}
          height={beadHeight + 7}
          rx={cornerRadius + 2}
          pointerEvents="none"
        />
      )}
      <rect
        className="bead__body"
        x={x - beadWidth / 2}
        y={y - beadHeight / 2}
        width={beadWidth}
        height={beadHeight}
        rx={cornerRadius}
        fill={finalColor}
        style={{ '--bead-color': finalColor } as React.CSSProperties}
      />
      {previewColor && (
        <rect
          className="bead__preview"
          x={x - beadWidth / 2}
          y={y - beadHeight / 2}
          width={beadWidth}
          height={beadHeight}
          rx={cornerRadius}
          fill={previewColor}
          pointerEvents="none"
        />
      )}
    </g>
  );
});

LoomBeadView.displayName = 'LoomBeadView';
