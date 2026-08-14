import { Bead } from '../../../types/bead';
import {
  PendantPlacement, PendantTemplate, PendantChain, DecorTailPlacement, ToothPlacement, ChainEndpoint,
  PendantAnchor,
} from '../../../types/pendant';
import { Thread, ThreadCommitOptions } from '../../../types/thread';
import { WeaveTool } from '../Header/WeaveControls';
import { CanvasOrientation } from '../Header/Header.types';
import { StampPattern } from '../../../utils/stamp';
import { ToothMesh } from '../../../utils/tooth';
import { DrawingTool } from '../../../hooks/useDrawing';
import { WeaveProgressControls } from '../../../hooks/useWeaveProgress';
import type { ShowToast } from '../../../hooks/useToast';

export interface CanvasViewProps {
  beads: Bead[];
  // Пометка «на удаление» (Bead и Segment пишут в один и тот же список,
  // см. useSilyankaProject.pendingDeleteIds) — бисерина остаётся в beads
  // (не удаляется), только рисуется пунктиром, пока не нажата кнопка
  // подтверждения в HolesSection.
  pendingDeleteIds: Set<string> | null;
  onToggleBeadPending: (id: string) => void;
  // «Hole segment»: карта id → бисерина (для проверки типа/наведённой ноды) и
  // предпросмотр текущего наведённого сегмента (нода + все её грани) — см.
  // useSilyankaProject.beadById/holeSegmentPreviewIds.
  beadById: Map<string, Bead>;
  holeSegmentPreviewIds: Set<string> | null;
  onHoleSegmentHover: (nodeId: string | null) => void;
  onToggleHoleSegmentPending: (nodeId: string) => void;
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  designMap: Record<string, string>;
  activeTool: DrawingTool;
  activeColor: string;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  paintBeadFast: (id: string) => string | undefined;
  startDrawing: () => void;
  stopDrawing: () => void;
  onFloodFill: (id: string) => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom: (v: number) => void;
  topSpan: number;
  bottomSpan: number;
  rowSpanOverrides: Record<number, number>;
  onRowSpanChange: (spanRowIndex: number, delta: number) => void;
  hoveredRow: number | null;
  mirrorMode: boolean;
  width: number;
  internalTop: number;
  internalBottom: number;
  extendLeftEdge: boolean;
  extendRightEdge: boolean;
  pendantPlacements: PendantPlacement[];
  pendantTemplates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  // Якорь ПОДВЕСКИ на колонку: bottomNodes либо (для колонок с декор-хвостом)
  // кончик хвоста — см. pendantAnchors в useSilyankaProject.ts. bottomNodes
  // остаётся настоящим якорем для цепочек и самого DecorTailLayer.
  pendantAnchors: Bead[];
  hoveredPendantAnchor: PendantAnchor | null;
  onPaintPendantBead: (placementId: string, beadIndex: number) => void;
  onRemovePlacement: (placementId: string) => void;
  pendantChains: PendantChain[];
  onPaintChainBead: (placementId: string, beadIndex: number) => void;
  onRemoveChain: (placementId: string) => void;
  decorTailPlacements: DecorTailPlacement[];
  decorRowStep: number;
  hoveredDecorTailCol: number | null;
  onPaintDecorTailBead: (placementId: string, beadIndex: number) => void;
  onRemoveDecorTail: (placementId: string) => void;
  teeth: ToothPlacement[];
  toothMeshes: Map<string, ToothMesh>;
  toothPendingStart: number | null;
  onToothNodeClick: (col: number) => void;
  onPaintToothBead: (placementId: string, beadIndex: number) => void;
  onRemoveTooth: (placementId: string) => void;
  threads: Thread[];
  onAddThread: (beadIds: string[], options?: ThreadCommitOptions) => void;
  onRerouteThreadEnd: (threadId: string, end: 'start' | 'end', traceBeadIds: string[]) => void;
  onRemoveThread: (id: string) => void;
  // «Кисть» нитки — цвет/прозрачность, которыми ляжет следующая нитка (см.
  // Header.tsx → ThreadStyleButton, useSilyankaProject.ts).
  activeThreadColor: string;
  activeThreadOpacity: number;
  chainPendingStart: ChainEndpoint | null;
  onChainNodeClick: (endpoint: ChainEndpoint) => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  // Группа-носитель координат бисерин — общая с PendantsSidebar (см.
  // useSilyankaProject.ts), чтобы драг подвески из каталога переводил
  // client-координаты через ту же useBeadCoords (getScreenCTM), которой здесь
  // пользуется нитка/стемп, а не отдельной ручной копией той же формулы.
  stampGroupRef: React.RefObject<SVGGElement | null>;
  topEdgeEnabled: boolean;
  bottomEdgeEnabled: boolean;
  stampPattern: StampPattern | null;
  stampPreviewPatch: Record<string, string> | null;
  onStampSelect: (ids: string[]) => void;
  onStampHover: (nodeId: string | null) => void;
  onStampPlace: (nodeId: string) => void;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: ((p: PendantPlacement[]) => PendantPlacement[]) | null,
    chainsFn?: ((c: PendantChain[]) => PendantChain[]) | null,
    threadsFn?: ((t: Thread[]) => Thread[]) | null,
    decorTailsFn?: ((d: DecorTailPlacement[]) => DecorTailPlacement[]) | null,
    teethFn?: ((t: ToothPlacement[]) => ToothPlacement[]) | null,
  ) => void;
  // Вид полотна (поворот/отражение) — общий для рисования и режима плетения
  // (см. useCanvasView.ts, spec.md «Поворот и отражение полотна»).
  orientation: CanvasOrientation;
  flipped: boolean;
  // Режим плетения: холст перестаёт рисовать и только отмечает прогресс.
  // Контролы режима живут в хедере (WeaveControls) — сюда приходят лишь
  // состояние и хранилище отметок (см. spec.md, «Режим плетения»).
  weaveMode: boolean;
  weaveTool: WeaveTool;
  weave: WeaveProgressControls;
  // Показ рамки «здесь я остановилась»: включается кнопкой Locate в хедере
  // на пару секунд (App), а не горит постоянно.
  weaveShowLast: boolean;
  // Отказ экспорта PNG нечем показать на самом холсте — уходит тостом
  // (варианта error), иначе кнопка «Download PNG» молчит и файла нет.
  showToast: ShowToast;
}
