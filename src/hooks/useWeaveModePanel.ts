import { useEffect, useState } from 'react';
import { usePersistedState } from './usePersistedState';
import { useFullscreen } from './useFullscreen';
import { SilyankaProject } from './useSilyankaProject';
import { CrossWeaveProject } from './useCrossWeaveProject';
import { Technique } from '../components/Editor/Header/Header';
import { WeaveTool, WeaveOrientation } from '../components/Editor/Header/WeaveControls';

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const isWeaveTool = (v: unknown): v is WeaveTool =>
  v === 'segment' || v === 'bead' || v === 'erase';

const isWeaveOrientation = (v: unknown): v is WeaveOrientation =>
  v === 'vertical' || v === 'horizontal';

interface Params {
  technique: Technique;
  silyanka: SilyankaProject;
  crossWeave: CrossWeaveProject;
  // Закрывает боковую панель и Reference Window при входе в режим плетения —
  // их кнопки в самом режиме скрыты (см. Header, .header__end-icons), так что
  // открытую панель иначе было бы нечем закрыть.
  onEnterWeaveMode: () => void;
}

// Режим плетения — отдельный мод: инструментов рисования в нём нет, холст
// только отмечает прогресс (см. spec.md, «Режим плетения»). Сам режим и вид
// полотна общие для обеих техник, а прогресс у каждой свой (useWeaveProgress).
export const useWeaveModePanel = ({ technique, silyanka, crossWeave, onEnterWeaveMode }: Params) => {
  const [weaveMode, setWeaveMode] = usePersistedState<boolean>('app:weaveMode', false, isBoolean);
  const [weaveTool, setWeaveTool] = usePersistedState<WeaveTool>(
    'app:weaveTool', 'segment', isWeaveTool,
  );
  const [weaveOrientation, setWeaveOrientation] = usePersistedState<WeaveOrientation>(
    'app:weaveOrientation', 'vertical', isWeaveOrientation,
  );
  const [weaveFlipped, setWeaveFlipped] = usePersistedState<boolean>(
    'app:weaveFlip', false, isBoolean,
  );
  const toggleWeaveOrientation = () => {
    setWeaveOrientation((o) => (o === 'vertical' ? 'horizontal' : 'vertical'));
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
  const activeWeave = technique === 'silyanka' ? silyanka.weave : crossWeave.weave;
  const weaveControls = {
    tool: weaveTool,
    onToolChange: setWeaveTool,
    markedCount: activeWeave.markedCount,
    totalCount: technique === 'silyanka' ? silyanka.beads.length : crossWeave.beads.length,
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
    orientation: weaveOrientation,
    onToggleOrientation: toggleWeaveOrientation,
    flipped: weaveFlipped,
    onToggleFlip: () => setWeaveFlipped((f) => !f),
    isFullscreen,
    onToggleFullscreen: toggleFullscreen,
  };

  return { weaveMode, toggleWeaveMode, weaveTool, weaveOrientation, weaveFlipped, weaveShowLast, weaveControls };
};

export type WeaveModePanel = ReturnType<typeof useWeaveModePanel>;
