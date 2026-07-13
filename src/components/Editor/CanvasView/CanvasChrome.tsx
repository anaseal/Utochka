import { Sun, Moon, Download } from 'lucide-react';

interface CanvasChromeProps {
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  onExport: () => void;
}

// Плавающие theme-toggle и export-кнопки холста — байт-в-байт общие для
// CanvasView и CrossWeaveCanvasView.
export const CanvasChrome = ({ canvasTheme, onToggleCanvasTheme, onExport }: CanvasChromeProps) => (
  <>
    <button
      type="button"
      className="canvas-theme-toggle"
      onClick={onToggleCanvasTheme}
      onMouseDown={(e) => e.stopPropagation()}
      title={canvasTheme === 'dark' ? 'Light canvas' : 'Dark canvas'}
      aria-label={canvasTheme === 'dark' ? 'Switch to light canvas' : 'Switch to dark canvas'}
    >
      {canvasTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>

    <button
      type="button"
      className="export-btn"
      onClick={onExport}
      onMouseDown={(e) => e.stopPropagation()}
      title="Download PNG"
    >
      <Download size={13} />
      {/* Скрывается на ≤767.98px (см. CanvasView.css) — кнопка сжимается
          до иконки, чтобы не наезжать на .stats внизу узких экранов. */}
      <span className="export-btn__label">Download PNG</span>
    </button>
  </>
);
