import { useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { EyedropperIcon } from './icons';
import { BEAD_THEME } from '../../../config/theme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';

interface PaletteWidgetProps {
  palette: string[];
  onPaletteChange: (palette: string[]) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  recentColors: string[];
  commitRecentColor: (color: string) => void;
}

// Палитра + кастомный цвет + пипетка. На ≤479.98px прячется под
// иконку-триггер и раскрывается попапом (см. .palette-widget в Header.css).
export const PaletteWidget = ({
  palette, onPaletteChange, activeColor, setActiveColor, activeTool, setActiveTool,
  recentColors, commitRecentColor,
}: PaletteWidgetProps) => {
  const [hasEyeDropper] = useState(() => 'EyeDropper' in window);
  const [pickerOpen, setPickerOpen] = useState(false);
  const customTriggerRef = useRef<HTMLButtonElement>(null);

  const { open: paletteOpen, setOpen: setPaletteOpen, ref: paletteWidgetRef, triggerRef: paletteTriggerRef } = useDismissablePopup();

  const isCustomColor = !palette.includes(activeColor);

  // Ластик не работает с цветом, поэтому выбор цвета выводит из него;
  // остальные инструменты (заливка, штамп) цвет используют — их выбор не сбрасывает.
  const selectColor = (color: string) => {
    setActiveColor(color);
    if (activeTool === 'eraser') setActiveTool('pencil');
  };

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return;
    try {
      const dropper = new window.EyeDropper();
      const { sRGBHex } = await dropper.open();
      selectColor(sRGBHex);
      commitRecentColor(sRGBHex);
    } catch {
      // cancelled
    }
  };

  const handlePickerConfirm = (color: string) => {
    selectColor(color);
    commitRecentColor(color);
    setPickerOpen(false);
  };

  return (
    <div className={`palette-widget${paletteOpen ? ' palette-widget--open' : ''}`} ref={paletteWidgetRef}>
      {/* Виден только на ≤479.98px — на более широких экранах палитра
          и так помещается в строку хедера (см. .palette-widget__trigger
          в Header.css). */}
      <button
        ref={paletteTriggerRef}
        type="button"
        className="palette-widget__trigger"
        onClick={() => setPaletteOpen(o => !o)}
        title="Palette"
        aria-haspopup="dialog"
        aria-expanded={paletteOpen}
      >
        <Palette size={14} />
        <span className="palette-widget__trigger-swatch" style={{ '--color-value': activeColor } as React.CSSProperties} />
      </button>

      <div className="palette">
        <div className="palette__grid">
          <div className="palette__row">
            {palette.map((color) => (
              <button
                key={color}
                onClick={() => selectColor(color)}
                className={`palette__color ${activeTool !== 'eraser' && activeColor === color ? 'palette__color--active' : ''}`}
                style={{ '--color-value': color } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="palette__row" role="group" aria-label="Recent colors">
            {Array.from({ length: BEAD_THEME.ui.recentColorsLimit }).map((_, i) => {
              const color = recentColors[i];
              if (!color) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="palette__recent-slot palette__recent-slot--empty"
                    aria-hidden="true"
                  />
                );
              }
              const isActive = activeTool !== 'eraser' && activeColor === color;
              return (
                <button
                  key={color}
                  onClick={() => selectColor(color)}
                  className={`palette__color ${isActive ? 'palette__color--active' : ''}`}
                  style={{ '--color-value': color } as React.CSSProperties}
                  title={color}
                />
              );
            })}
          </div>
        </div>

        {/* Кастомный пикер + пипетка: на ≤767.98px становятся вертикальной
            парой (см. .palette__extra в Header.css) вместо бок о бок —
            экономит горизонтальное место тем же приёмом, что палитра уже
            применяет к base/recent рядам. display:contents на более широких
            экранах "растворяет" обёртку — оба элемента остаются прямыми
            flex-детьми .palette, как раньше. */}
        <div className="palette__extra">
          <div className="palette__custom">
            <button
              ref={customTriggerRef}
              className="palette__color palette__color--custom-trigger"
              onClick={() => setPickerOpen(o => !o)}
              title="Custom color"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              style={{ background: 'conic-gradient(from 0deg, #ff4757, #ff9f43, #ffd32a, #2ed573, #22d3ee, #1e90ff, #e879f9, #ff4757)' }}
            />
            {pickerOpen && (
              <>
                {/* На ≤767.98px ColorPicker анкерится к верху viewport, под
                    шапкой (см. ColorPicker.css), а не к этой маленькой кнопке —
                    без затемнения фона попап выглядел как случайно "уехавший"
                    прямоугольник, не читался как модалка.
                    На десктопе/планшете подложка невидима (см. CSS). */}
                <div className="color-picker-backdrop" onClick={() => setPickerOpen(false)} />
                <ColorPicker
                  initialColor={isCustomColor ? activeColor : '#ffffff'}
                  onConfirm={handlePickerConfirm}
                  onClose={() => setPickerOpen(false)}
                  onReplacePalette={onPaletteChange}
                  triggerRef={customTriggerRef}
                />
              </>
            )}
          </div>

          {hasEyeDropper && (
            <button
              className="palette__eyedropper"
              onClick={handleEyeDropper}
              title="Pick color from screen"
            >
              <EyedropperIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
