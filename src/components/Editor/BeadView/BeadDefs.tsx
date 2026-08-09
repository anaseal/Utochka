/* FILE: src\components\Editor\BeadView\BeadDefs.tsx */
import { memo } from 'react';

// Блик «стекла» прозрачной бисерины (.bead--clear в BeadView.css) — общий
// paint server вместо отдельного <circle>-блика внутри каждой бисерины: на
// схеме в тысячи бисерин это ноль лишних DOM-узлов, и один и тот же градиент
// одинаково ложится на круг силянки, овал крестика и прямоугольник
// пейота/станка (objectBoundingBox — координаты долевые, а не абсолютные).
//
// Рендерится один раз на холст, у каждой техники свой; техника в один момент
// времени активна одна, поэтому id не конфликтуют. Клон холста при экспорте
// PNG уносит <defs> с собой, поэтому url(#…) резолвится и там.
export const BeadDefs = memo(() => (
  <defs>
    {/* Тёмная тема холста: белый блик поверх едва заметной белёсой заливки. */}
    <radialGradient id="bead-clear-glass" cx="0.35" cy="0.3" r="0.75">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
      <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
    </radialGradient>
    {/* Светлая тема: тот же блик, но по серо-голубой заливке — белое по
        белому фону не читалось бы вовсе, а бусина сливалась бы и с пустой,
        и с обычной белой (#ffffff есть в палитре). */}
    <radialGradient id="bead-clear-glass-light" cx="0.35" cy="0.3" r="0.75">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
      <stop offset="45%" stopColor="#cbd5e1" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.38" />
    </radialGradient>
  </defs>
));

BeadDefs.displayName = 'BeadDefs';
