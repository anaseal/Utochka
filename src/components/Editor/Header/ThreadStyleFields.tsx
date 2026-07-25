import './ThreadStyleFields.css';

interface ThreadStyleFieldsProps {
  color: string;
  opacity: number;
  onColorChange: (hex: string) => void;
  onOpacityChange: (opacity: number) => void;
}

// Цвет/прозрачность «кисти» нитки — та, которой ляжет следующая прокладываемая
// нитка (см. useSilyankaProject.ts/useCrossWeaveProject.ts, activeThreadColor/
// Opacity). Общий для обеих техник: у силянки — свой попап (ThreadStyleButton
// в Header.tsx), у crossWeave — врезан в уже существующий ThreadMenu.
// Нативный <input type="color"> — тот же примитив, что уже используется в
// хедере для custom-цвета бусин (см. палитру), без своего цветового пикера
// с нуля. Мин. прозрачность 0.1, не 0 — нить с opacity=0 невидима и
// выглядела бы как потерянная работа, а не осознанный выбор.
export const ThreadStyleFields = ({ color, opacity, onColorChange, onOpacityChange }: ThreadStyleFieldsProps) => (
  <div className="thread-style-fields">
    <input
      type="color"
      className="thread-style-fields__color"
      value={color}
      onChange={(e) => onColorChange(e.target.value)}
      aria-label="Thread color"
    />
    <input
      type="range"
      className="thread-style-fields__opacity"
      min={0.1}
      max={1}
      step={0.05}
      value={opacity}
      onChange={(e) => onOpacityChange(Number(e.target.value))}
      aria-label="Thread opacity"
    />
  </div>
);
