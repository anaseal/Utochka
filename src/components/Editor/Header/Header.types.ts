import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';
import { StampAnchorEdge } from '../../../utils/stamp';
import { WeaveTool } from './WeaveControls';

export type Technique = 'silyanka' | 'crossWeave' | 'peyote' | 'loom';

// Вид полотна (поворот/отражение) — общий для рисования и режима плетения
// (см. useCanvasView.ts), поэтому тип живёт в нейтральном файле, а не в
// WeaveControls.tsx.
export type CanvasOrientation = 'vertical' | 'horizontal';

export interface SharedHeaderProps {
  palette: string[];
  onPaletteChange: (palette: string[]) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  recentColors: string[];
  commitRecentColor: (color: string) => void;
  onClearAll: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onShareProject: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom?: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  technique: Technique;
  onTechniqueChange: (technique: Technique) => void;
  referenceWindowOpen: boolean;
  onToggleReferenceWindow: () => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  // Технико-независимая панель «Сетка» (Width/Height/Spacing/Edges/Edge
  // Extension/Bottom Chain) — см. src/components/Sidebar/GridSidebar.tsx.
  gridSidebarOpen: boolean;
  onToggleGridSidebar: () => void;
  // Режим плетения — отдельный мод: пока он включён, инструменты рисования и
  // палитра из хедера убраны, холст только отмечает прогресс
  // (см. spec.md, «Режим плетения»).
  weaveMode: boolean;
  onToggleWeaveMode: () => void;
  // Пакет контролов режима плетения (см. WeaveControls) — собирается в App
  // из активной техники.
  weaveControls: {
    tool: WeaveTool;
    onToolChange: (tool: WeaveTool) => void;
    markedCount: number;
    totalCount: number;
    canUndo: boolean;
    onUndo: () => void;
    onReset: () => void;
    onLocate: () => void;
    canLocate: boolean;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
  };
  // Вид полотна (поворот/отражение) — не относится к режиму плетения, живёт
  // всегда в хедере (см. CanvasViewMenu), и в рисовании, и в плетении.
  canvasView: {
    orientation: CanvasOrientation;
    onToggleOrientation: () => void;
    flipped: boolean;
    onToggleFlip: () => void;
  };
}

export interface SilyankaHeaderProps {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  hasStampPattern: boolean;
  stampAnchorEdge: StampAnchorEdge;
  onToggleStampAnchorEdge: () => void;
  onCancelStampPattern: () => void;
  // «Кисть» нитки — цвет/прозрачность, которыми ляжет следующая нитка
  // (см. ThreadStyleButton ниже, useSilyankaProject.ts).
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}

export interface CrossWeaveHeaderProps {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
  // Крестик плетётся двумя нитками одновременно (силянка — одной, см.
  // spec.md, «Нитка») — выбор, какой из двух метить новые нитки.
  activeThreadStrand: 1 | 2;
  onSelectThreadStrand: (strand: 1 | 2) => void;
  // «Кисть» ТЕКУЩЕЙ выбранной нити (activeThreadStrand) — своя пара цвета/
  // прозрачности на каждую из двух ниток (см. useCrossWeaveProject.ts).
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}

// Peyote — штамп есть (в отличие от crossWeave), нитки нет (в отличие от
// silyanka/crossWeave, см. spec.md, «Peyote»). Без stampAnchorEdge — у
// Peyote нет структурного различия «низа»/«верха» узора, якорь штампа
// всегда левый верхний угол выделения (см. peyoteStamp.ts). Режим плетения
// — через общий SharedHeaderProps.weaveControls, как и у остальных техник.
export interface PeyoteHeaderProps {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
  hasStampPattern: boolean;
  onCancelStampPattern: () => void;
}

// Loom — тот же набор, что у Peyote (штамп есть, нитки нет, см. spec.md,
// «Loom»): mirror/stamp-контролы идентичны, различие только в том, что
// технику ведёт отдельный проект (useLoomProject).
export type LoomHeaderProps = PeyoteHeaderProps;

export type HeaderProps = SharedHeaderProps & (
  | { technique: 'silyanka'; silyankaProps: SilyankaHeaderProps; crossWeaveProps?: undefined; peyoteProps?: undefined; loomProps?: undefined }
  | { technique: 'crossWeave'; crossWeaveProps: CrossWeaveHeaderProps; silyankaProps?: undefined; peyoteProps?: undefined; loomProps?: undefined }
  | { technique: 'peyote'; peyoteProps: PeyoteHeaderProps; silyankaProps?: undefined; crossWeaveProps?: undefined; loomProps?: undefined }
  | { technique: 'loom'; loomProps: LoomHeaderProps; silyankaProps?: undefined; crossWeaveProps?: undefined; peyoteProps?: undefined }
);
