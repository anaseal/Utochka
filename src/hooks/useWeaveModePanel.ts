import { useEffect, useState } from 'react';
import { usePersistedState } from './usePersistedState';
import { useFullscreen } from './useFullscreen';
import { SilyankaProject } from './useSilyankaProject';
import { CrossWeaveProject } from './useCrossWeaveProject';
import { PeyoteProject } from './usePeyoteProject';
import { LoomProject } from './useLoomProject';
import { CanvasOrientation, Technique } from '../components/Editor/Header/Header.types';
import { WeaveTool } from '../components/Editor/Header/WeaveControls';

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const isWeaveTool = (v: unknown): v is WeaveTool =>
  v === 'segment' || v === 'bead' || v === 'erase';

const isCanvasOrientation = (v: unknown): v is CanvasOrientation =>
  v === 'vertical' || v === 'horizontal';

const isOrientationByTechnique = (v: unknown): v is Partial<Record<Technique, CanvasOrientation>> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
  && Object.values(v).every(isCanvasOrientation);

const isBooleanByTechnique = (v: unknown): v is Partial<Record<Technique, boolean>> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
  && Object.values(v).every(isBoolean);

interface Params {
  technique: Technique;
  silyanka: SilyankaProject;
  crossWeave: CrossWeaveProject;
  peyote: PeyoteProject;
  loom: LoomProject;
  // Закрывает боковую панель и Reference Window при входе в режим плетения —
  // их кнопки в самом режиме скрыты (см. Header, .header__end-icons), так что
  // открытую панель иначе было бы нечем закрыть.
  onEnterWeaveMode: () => void;
}

// Режим плетения — отдельный мод: инструментов рисования в нём нет, холст
// только отмечает прогресс (см. spec.md, «Режим плетения»). Сам режим
// (weaveMode/weaveTool) общий для всех четырёх техник — это состояние
// UI-модалки, а не содержимого сетки; вид полотна и прогресс — свои у каждой
// (useWeaveProgress).
export const useWeaveModePanel = ({ technique, silyanka, crossWeave, peyote, loom, onEnterWeaveMode }: Params) => {
  const [weaveMode, setWeaveMode] = usePersistedState<boolean>('app:weaveMode', false, isBoolean);
  const [weaveTool, setWeaveTool] = usePersistedState<WeaveTool>(
    'app:weaveTool', 'segment', isWeaveTool,
  );
  // Вид полотна (поворот/отражение) — общий для рисования и режима плетения
  // (см. useCanvasView.ts), но свой для каждой техники: это свойство формы
  // конкретной сетки (как gridSize), а не UI-настройка вроде zoom, поэтому
  // переключение техники не должно "протаскивать" поворот в другую сетку.
  // Персист — объект по ключу техники, ключи в localStorage оставлены
  // старыми (app:weaveOrientation/app:weaveFlip); формат значения сменился
  // со скаляра на объект, так что старое сохранённое значение один раз не
  // пройдёт валидацию и сбросится в дефолт — осознанная разовая потеря.
  const [orientationByTechnique, setOrientationByTechnique] = usePersistedState<
    Partial<Record<Technique, CanvasOrientation>>
  >('app:weaveOrientation', {}, isOrientationByTechnique);
  const [flippedByTechnique, setFlippedByTechnique] = usePersistedState<
    Partial<Record<Technique, boolean>>
  >('app:weaveFlip', {}, isBooleanByTechnique);

  const canvasOrientation = orientationByTechnique[technique] ?? 'vertical';
  const canvasFlipped = flippedByTechnique[technique] ?? false;

  const toggleCanvasOrientation = () => {
    setOrientationByTechnique((m) => ({
      ...m,
      [technique]: (m[technique] ?? 'vertical') === 'vertical' ? 'horizontal' : 'vertical',
    }));
  };
  const toggleCanvasFlipped = () => {
    setFlippedByTechnique((m) => ({ ...m, [technique]: !(m[technique] ?? false) }));
  };

  // Полноэкранный режим (Fullscreen API) — независимый тумблер внутри режима
  // плетения, не персистится (браузер и не даёт восстановить его без
  // пользовательского жеста при перезагрузке страницы).
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreen();

  // Рамка «здесь я остановилась» не горит постоянно: показывается на пару
  // секунд после нажатия Locate (WeaveControls) и гаснет сама.
  const [weaveShowLast, setWeaveShowLast] = useState(false);
  useEffect(() => {
    if (!weaveShowLast) return;
    const timer = setTimeout(() => setWeaveShowLast(false), 2500);
    return () => clearTimeout(timer);
  }, [weaveShowLast]);

  // Вход в режим плетения закрывает боковые панели и окно референса — см.
  // onEnterWeaveMode. Выход, наоборот, закрывает полноэкранный режим: он был
  // "для режима плетения" и не имеет смысла без его контролов.
  const toggleWeaveMode = () => {
    if (!weaveMode) {
      onEnterWeaveMode();
    } else {
      exitFullscreen();
    }
    setWeaveMode(!weaveMode);
  };

  // Пакет контролов режима плетения для хедера — из активной техники.
  // Locate скроллит к первой бисерине последнего сегмента: getElementById +
  // scrollIntoView, браузер сам учитывает zoom/поворот/отражение полотна.
  const activeWeave = technique === 'silyanka' ? silyanka.weave
    : technique === 'crossWeave' ? crossWeave.weave
    : technique === 'peyote' ? peyote.weave
    : loom.weave;
  const weaveControls = {
    tool: weaveTool,
    onToolChange: setWeaveTool,
    markedCount: activeWeave.markedCount,
    totalCount: technique === 'silyanka' ? silyanka.beads.length
      : technique === 'crossWeave' ? crossWeave.beads.length
      : technique === 'peyote' ? peyote.beads.length
      : loom.beads.length,
    canUndo: activeWeave.canUndo,
    onUndo: activeWeave.undo,
    onReset: activeWeave.resetAll,
    onLocate: () => {
      const first = activeWeave.lastSegment[0];
      if (!first) return;
      document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setWeaveShowLast(true);
    },
    canLocate: activeWeave.lastSegment.length > 0,
    isFullscreen,
    onToggleFullscreen: toggleFullscreen,
  };

  // Вид полотна для хедера (CanvasViewMenu) — значения и тумблеры вместе;
  // canvasOrientation/canvasFlipped ниже — те же значения плоско, для
  // *CanvasView.tsx (useCanvasView).
  const canvasView = {
    orientation: canvasOrientation,
    onToggleOrientation: toggleCanvasOrientation,
    flipped: canvasFlipped,
    onToggleFlip: toggleCanvasFlipped,
  };

  return {
    weaveMode, toggleWeaveMode, weaveTool, canvasOrientation, canvasFlipped, weaveShowLast,
    weaveControls, canvasView,
  };
};

export type WeaveModePanel = ReturnType<typeof useWeaveModePanel>;
