import { Sun, Moon, Download } from 'lucide-react';

interface CanvasChromeProps {
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  onExport: () => void;
  // В режиме плетения экспорта нет — холст там не про схему, а про прогресс
  // (см. spec.md, «Режим плетения»). Тумблер темы остаётся: он про читаемость.
  showExport?: boolean;
}

// Плавающие theme-toggle и export-кнопки холста — байт-в-байт общие для
// CanvasView и CrossWeaveCanvasView.
export const CanvasChrome = ({ canvasTheme, onToggleCanvasTheme, onExport, showExport = true }: CanvasChromeProps) => (
  <>
    <button
      type="button"
      className="canvas-theme-toggle"
      onClick={onToggleCanvasTheme}
      onPointerDown={(e) => e.stopPropagation()}
      title={canvasTheme === 'dark' ? 'Light canvas' : 'Dark canvas'}
      aria-label={canvasTheme === 'dark' ? 'Switch to light canvas' : 'Switch to dark canvas'}
    >
      {canvasTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>

    {showExport && (
      <button
        type="button"
        className="export-btn"
        onClick={onExport}
        onPointerDown={(e) => e.stopPropagation()}
        title="Download PNG"
      >
        <Download size={13} />
        {/* Скрывается на ≤767.98px (см. CanvasView.css) — кнопка сжимается
            до иконки, чтобы не наезжать на .stats внизу узких экранов. */}
        <span className="export-btn__label">Download PNG</span>
      </button>
    )}
  </>
);
