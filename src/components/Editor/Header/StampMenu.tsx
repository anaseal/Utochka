import { Stamp, ArrowUpToLine, ArrowDownToLine, X } from 'lucide-react';
import './StampMenu.css';
import { IconButton } from '../../common/IconButton';
import { DrawingTool } from '../../../hooks/useDrawing';
import { StampAnchorEdge } from '../../../utils/stamp';

// Настройки захваченного узора — общий набор для всех техник со штампом.
// anchorEdge/onToggleAnchorEdge только у силянки: у Peyote и Loom нет
// структурного различия «низа»/«верха» узора, якорь всегда левый верхний угол
// выделения (см. peyoteStamp.ts/loomStamp.ts).
export interface StampControls {
  hasStampPattern: boolean;
  onCancelStampPattern: () => void;
  anchorEdge?: StampAnchorEdge;
  onToggleAnchorEdge?: () => void;
}

// Плашка настроек штампа. Открытость не своя, а производная от инструмента:
// панель держится ровно столько, сколько активен штамп, — закрывать её
// отдельным кликом не нужно, а появление совпадает с моментом, когда её
// содержимое вообще имеет смысл.
//
// Ряд иконок, а не список пунктов <Menu>: панель висит всё время работы
// штампом и лежит поверх полотна — подписи в столбик закрывали бы схему.
// Кнопки — ghost/danger: плашка уже несёт свой фон, а сброс узора стирает
// захваченное и потому красный в покое (см. controlVariants.css).
export const StampMenuPanel = ({
  hasStampPattern, onCancelStampPattern, anchorEdge, onToggleAnchorEdge, floating,
}: StampControls & { floating?: boolean }) => (
  <div
    className={`menu__panel menu__panel--center stamp-menu__panel${floating ? ' stamp-menu__panel--floating' : ''}`}
    role="group"
    aria-label="Stamp options"
  >
    {anchorEdge && onToggleAnchorEdge && (
      <IconButton
        size="md"
        variant="ghost"
        onClick={onToggleAnchorEdge}
        title={anchorEdge === 'top'
          ? 'Stamp anchor point: top (click or Shift to switch to bottom)'
          : 'Stamp anchor point: bottom (click or Shift to switch to top)'}
        aria-pressed={anchorEdge === 'bottom'}
        icon={anchorEdge === 'top' ? <ArrowUpToLine size={14} /> : <ArrowDownToLine size={14} />}
      />
    )}

    {/* Тач-эквивалент Escape/Alt — на тач-экране нет клавиатуры, так что сброс
        захваченного узора нужен и кнопкой. Задизейблена, пока узор не
        захвачен: так видно, что сброс существует, ещё до первого выделения. */}
    <IconButton
      size="md"
      variant="danger"
      disabled={!hasStampPattern}
      onClick={onCancelStampPattern}
      title="Reset stamp pattern (Esc/Alt)"
      icon={<X size={14} />}
    />
  </div>
);

// Кнопка «Штамп» вместе со своей плашкой настроек под ней. Вторую копию
// плашки — плавающую, для узкого экрана — рендерит HeaderToolGroup рядом с
// меню «Инструменты»: здесь она лежала бы внутри его попапа и гасла вместе
// с ним ровно тогда, когда нужна (узор захватывают уже на полотне, а тап по
// полотну попап закрывает).
export const StampMenu = ({
  activeTool, setActiveTool, ...controls
}: StampControls & {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
}) => {
  const open = activeTool === 'stamp';

  return (
    <div className="tool-btn-group stamp-menu">
      <IconButton
        variant="chip"
        className="tool-btn"
        active={open}
        onClick={() => setActiveTool(open ? 'pencil' : 'stamp')}
        title="Stamp (S)"
        aria-pressed={open}
        icon={<Stamp size={14} />}
      />

      {open && <StampMenuPanel {...controls} />}
    </div>
  );
};
