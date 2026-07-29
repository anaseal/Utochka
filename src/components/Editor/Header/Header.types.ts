import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';
import { StampAnchorEdge } from '../../../utils/stamp';
import { WeaveTool, WeaveOrientation } from './WeaveControls';

export type Technique = 'silyanka' | 'crossWeave';

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
    orientation: WeaveOrientation;
    onToggleOrientation: () => void;
    flipped: boolean;
    onToggleFlip: () => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
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

export type HeaderProps = SharedHeaderProps & (
  | { technique: 'silyanka'; silyankaProps: SilyankaHeaderProps; crossWeaveProps?: undefined }
  | { technique: 'crossWeave'; crossWeaveProps: CrossWeaveHeaderProps; silyankaProps?: undefined }
);
