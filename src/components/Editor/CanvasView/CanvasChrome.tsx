import { Sun, Moon, Download } from 'lucide-react';
import { Button } from '../../common/Button';
import { IconButton } from '../../common/IconButton';

interface CanvasChromeProps {
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  onExport: () => void;
  // В режиме плетения экспорта нет — холст там не про схему, а про прогресс
  // (см. spec.md, «Режим плетения»). Тумблер темы остаётся: он про читаемость.
  showExport?: boolean;
}

// Плавающие theme-toggle и export-кнопки холста — байт-в-байт общие для всех
// четырёх техник (CanvasView, CrossWeaveCanvasView, LoomCanvasView,
// PeyoteCanvasView). Оформление — компоненты дизайн-системы, в CanvasView.css
// осталось только место в плавающем стеке у правого края.
export const CanvasChrome = ({ canvasTheme, onToggleCanvasTheme, onExport, showExport = true }: CanvasChromeProps) => (
  <>
    <IconButton
      className="canvas-theme-toggle"
      size="md"
      shape="square"
      variant="secondary"
      onClick={onToggleCanvasTheme}
      onPointerDown={(e) => e.stopPropagation()}
      title={canvasTheme === 'dark' ? 'Light canvas' : 'Dark canvas'}
      aria-label={canvasTheme === 'dark' ? 'Switch to light canvas' : 'Switch to dark canvas'}
      icon={canvasTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    />

    {showExport && (
      // Подпись <Button> кладёт в .btn__label — за него и цепляется медиа-запрос
      // ≤767.98px в CanvasView.css, где кнопка сжимается до одной иконки, чтобы
      // не наезжать на .stats внизу узких экранов.
      <Button
        className="export-btn"
        variant="secondary"
        size="md"
        onClick={onExport}
        onPointerDown={(e) => e.stopPropagation()}
        title="Download PNG"
        icon={<Download size={13} />}
      >
        Download PNG
      </Button>
    )}
  </>
);
