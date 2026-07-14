/* FILE: src\components\Editor\CanvasView\CanvasView.tsx */
import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Bead } from '../../../types/bead';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { PendantPlacement, PendantTemplate, PendantChain } from '../../../types/pendant';
import { PENDANT_SCALE } from '../../../data/pendantTemplates';
import { BeadView } from '../BeadView/BeadView';
import { CanvasRulers } from '../CanvasRulers/CanvasRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { PendantLayer } from '../PendantLayer/PendantLayer';
import { PendantChainLayer } from '../PendantChainLayer/PendantChainLayer';
import { CanvasChrome } from './CanvasChrome';
import { BEAD_THEME, defaultColorFor } from '../../../config/theme';
import { mirrorBeadId } from '../../../utils/mirror';
import { chainBeadCountBetween, computeChainBeadPositions } from '../../../utils/pendantChain';
import { StampPattern } from '../../../utils/stamp';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng } from '../../../utils/exportScheme';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { computeCanvasDim } from '../../../utils/canvasDim';
import { computeColorStats } from '../../../utils/colorStats';
import { swapColorInMap, swapColorInPendants, swapColorInChains } from '../../../utils/colorSwap';
import './CanvasView.css';

// Порог в экранных пикселях, отличающий клик (постановка штампа) от драга
// (выделение рамкой) — независим от zoom, т.к. сравнивается в client-координатах.
// Используется только когда узор ещё не загружен (рисование новой рамки
// выделения) — пока узор загружен, тач вообще не завязан на этот порог: там
// касание сразу входит в режим «таскать превью» (см. handleStampContainerPointerDown,
// mode: 'movePreview'). Отдельное touch-значение выше десктопного — палец
// толще и дрожит сильнее курсора, случайный микро-сдвиг не должен рвать рамку.
const STAMP_DRAG_THRESHOLD = 4;
const STAMP_DRAG_THRESHOLD_TOUCH = 10;

interface CanvasViewProps {
  beads: Bead[];
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  designMap: Record<string, string>;
  activeTool: DrawingTool;
  activeColor: string;
  isDrawing: boolean;
  paintBead: (id: string) => void;
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
  pendantPlacements: PendantPlacement[];
  pendantTemplates: Record<string, PendantTemplate>;
  bottomNodes: Bead[];
  hoveredCol: number | null;
  onPaintPendantBead: (placementId: string, beadIndex: number) => void;
  onRemovePlacement: (placementId: string) => void;
  pendantChains: PendantChain[];
  onPaintChainBead: (placementId: string, beadIndex: number) => void;
  onRemoveChain: (placementId: string) => void;
  chainPendingStart: number | null;
  onChainNodeClick: (col: number) => void;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  bottomEdgeEnabled: boolean;
  bottomEdgeSpan: number;
  onBottomEdgeSpanChange: (delta: number) => void;
  stampPattern: StampPattern | null;
  stampPreviewPatch: Record<string, string> | null;
  onStampSelect: (ids: string[]) => void;
  onStampHover: (nodeId: string | null) => void;
  onStampPlace: (nodeId: string) => void;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: ((p: PendantPlacement[]) => PendantPlacement[]) | null,
    chainsFn?: ((c: PendantChain[]) => PendantChain[]) | null,
  ) => void;
}

export const CanvasView = ({
  beads,
  canvasTheme,
  onToggleCanvasTheme,
  designMap,
  activeTool,
  activeColor,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  onFloodFill,
  zoom,
  onZoomChange,
  onSetZoom,
  topSpan,
  bottomSpan,
  rowSpanOverrides,
  onRowSpanChange,
  hoveredRow,
  mirrorMode,
  width,
  internalTop,
  internalBottom,
  pendantPlacements,
  pendantTemplates,
  bottomNodes,
  hoveredCol,
  onPaintPendantBead,
  onRemovePlacement,
  pendantChains,
  onPaintChainBead,
  onRemoveChain,
  chainPendingStart,
  onChainNodeClick,
  canvasSvgRef,
  bottomEdgeEnabled,
  bottomEdgeSpan,
  onBottomEdgeSpanChange,
  stampPattern,
  stampPreviewPatch,
  onStampSelect,
  onStampHover,
  onStampPlace,
  applyPatch,
}: CanvasViewProps) => {

  const { offsetX, offsetY } = BEAD_THEME.gridDefaults;
  const { nodeRadius } = BEAD_THEME.sizes;
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const stampGroupRef = useRef<SVGGElement>(null);
  const stampDragRef = useRef<{
    startClient: { x: number; y: number };
    startBead: { x: number; y: number };
    dragging: boolean;
    // 'select' — обычная логика клик/драг (десктоп: клик ставит копию,
    // драг рисует новую рамку). 'movePreview' — тач-режим с уже загруженным
    // узором: палец сразу таскает живое превью (см. handleStampContainerPointerMove),
    // отпускание коммитит; чтобы нарисовать новую рамку в этом состоянии,
    // узор сначала сбрасывают крестиком (см. spec.md, «Штамп»).
    mode: 'select' | 'movePreview';
  } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [highlightedColor, setHighlightedColor] = useState<string | null>(null);
  // Сворачиваемый редактор количества бисерин (per-row span controls,
  // CanvasRulers) — видимость даёт CSS (CanvasRulers.css, эффект только на
  // ≤767.98px), поэтому дефолт "свёрнуто" безопасен для десктопа. Но сам
  // отступ слева под эти контролы (offsetX) — числовой SVG-параметр, а не
  // CSS-свойство, и CSS-медиа-запрос его не тронет — поэтому здесь единственное
  // место в проекте, где брейкпоинт проверяется в JS (useMediaQuery), чтобы
  // не сузить offsetX на десктопе, где контролы всегда видны независимо
  // от spanControlsExpanded.
  const [spanControlsExpanded, setSpanControlsExpanded] = useState(false);
  const isNarrowViewport = useMediaQuery('(max-width: 767.98px)');
  const effectiveOffsetX = isNarrowViewport && !spanControlsExpanded
    ? BEAD_THEME.gridDefaults.offsetXCollapsed
    : offsetX;

  const dim = useMemo(() => {
    // Подвески свисают ниже сетки — учитываем их глубину в высоте SVG.
    let pendantMaxY = 0;
    for (const p of pendantPlacements) {
      const t = pendantTemplates[p.templateId];
      const anchor = bottomNodes.find(n => n.logicalIndex.col === p.col);
      if (!t || !anchor) continue;
      let depth = -Infinity;
      for (const b of t.beads) {
        const reach = b.dy + (b.shape === 'circle' ? (b.r ?? 0) : (b.h ?? 0) / 2);
        if (reach > depth) depth = reach;
      }
      // +26: место под кнопку удаления ниже последней бусины
      pendantMaxY = Math.max(pendantMaxY, anchor.y + depth * PENDANT_SCALE + 26);
    }

    // Цепочки-подвески тоже провисают ниже сетки — учитываем глубину дуги.
    let chainMaxY = 0;
    for (const c of pendantChains) {
      const start = bottomNodes.find(n => n.logicalIndex.col === c.startCol);
      const end = bottomNodes.find(n => n.logicalIndex.col === c.endCol);
      if (!start || !end) continue;
      const positions = computeChainBeadPositions(start, end);
      const maxY = Math.max(start.y, end.y, ...positions.map(p => p.y));
      chainMaxY = Math.max(chainMaxY, maxY + 26);
    }

    return computeCanvasDim(beads, effectiveOffsetX, offsetY, nodeRadius, {
      extraMaxY: Math.max(pendantMaxY, chainMaxY),
    });
  }, [beads, effectiveOffsetX, offsetY, nodeRadius, pendantPlacements, pendantTemplates, bottomNodes, pendantChains]);

  useWheelZoom(canvasContainerRef, onZoomChange);

  // Второй палец на холсте отменяет любой начатый одним пальцем жест
  // (мазок карандаша/ластика, драг штампа) — переключение на панораму/zoom.
  const cancelActiveStroke = useCallback(() => {
    stopDrawing();
    stampDragRef.current = null;
    setSelectionRect(null);
  }, [stopDrawing]);
  const touchGesture = useTouchPanZoom(canvasContainerRef, canvasSvgRef, zoom, dim, onSetZoom, cancelActiveStroke);
  const { statsRef, reserve: statsReserve } = useStatsReserve(140);

  // Шеврон (.span-controls-toggle) «пришвартован» к левому краю карточки
  // холста и осмыслен только там (за ним прячется панель, живущая у левого
  // края сетки) — как только пользователь скроллит вправо, эта панель уезжает
  // за пределы видимой области, и шеврон поверх чужих колонок вводит в
  // заблуждение. Поэтому он скрыт всё время, пока scrollLeft > 0, и
  // появляется обратно не по таймеру, а только когда пользователь докрутит
  // холст обратно до левого края.
  const [isScrolledFromLeft, setIsScrolledFromLeft] = useState(false);
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const handleScroll = () => setIsScrolledFromLeft(el.scrollLeft > 0);
    handleScroll();
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!highlightedColor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHighlightedColor(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [highlightedColor]);

  const handleToggleHighlight = useCallback((color: string) => {
    setHighlightedColor((c) => (c === color ? null : color));
  }, []);

  const handleReplaceColor = useCallback((oldColor: string) => {
    applyPatch(
      (m) => swapColorInMap(m, oldColor, activeColor),
      (p) => swapColorInPendants(p, oldColor, activeColor),
      (c) => swapColorInChains(c, oldColor, activeColor),
    );
    setHighlightedColor((c) => (c === oldColor ? null : c));
  }, [applyPatch, activeColor]);

  // Подвеска учитывается в статистике, только если у неё есть и валидный
  // шаблон, и живая нода-якорь на нижнем ряду (та же проверка, что и в
  // PendantLayer для occupiedCols).
  const validPendantPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return pendantPlacements.filter(
      (p) => pendantTemplates[p.templateId] && bottomCols.has(p.col),
    );
  }, [pendantPlacements, pendantTemplates, bottomNodes]);

  // Цепочка учитывается в статистике, только если у неё живы оба узла-якоря
  // на нижнем ряду (та же проверка, что и у validPendantPlacements).
  const validPendantChains = useMemo(() => {
    const nodeByCol = new Map(bottomNodes.map(n => [n.logicalIndex.col, n]));
    return pendantChains
      .map((c) => {
        const start = nodeByCol.get(c.startCol);
        const end = nodeByCol.get(c.endCol);
        if (!start || !end) return null;
        return { chain: c, count: chainBeadCountBetween(start, end) };
      })
      .filter((v): v is { chain: PendantChain; count: number } => v !== null);
  }, [pendantChains, bottomNodes]);

  const colorStats = useMemo(() => {
    const stats = computeColorStats(beads, designMap, (bead) => defaultColorFor(bead.type));
    validPendantPlacements.forEach((p) => {
      const template = pendantTemplates[p.templateId];
      template.beads.forEach((bead, index) => {
        const color = p.colorMap[index] ?? defaultColorFor(bead.type);
        stats.set(color, (stats.get(color) || 0) + 1);
      });
    });
    validPendantChains.forEach(({ chain, count }) => {
      for (let i = 0; i < count; i++) {
        const color = chain.colorMap[i] ?? defaultColorFor('SPAN');
        stats.set(color, (stats.get(color) || 0) + 1);
      }
    });
    return Array.from(stats.entries());
  }, [beads, designMap, validPendantPlacements, pendantTemplates, validPendantChains]);

  const totalCount = useMemo(() => {
    const pendantBeadCount = validPendantPlacements.reduce(
      (sum, p) => sum + pendantTemplates[p.templateId].beads.length,
      0,
    );
    const chainBeadCount = validPendantChains.reduce((sum, { count }) => sum + count, 0);
    return beads.length + pendantBeadCount + chainBeadCount;
  }, [beads.length, validPendantPlacements, pendantTemplates, validPendantChains]);

  const colorHighlightedBeadIds = useMemo(() => {
    if (!highlightedColor) return null;
    const ids = new Set<string>();
    beads.forEach((b) => {
      const effective = designMap[b.id] || defaultColorFor(b.type);
      if (effective === highlightedColor) ids.add(b.id);
    });
    return ids;
  }, [highlightedColor, beads, designMap]);

  const highlightedNodeIds = useMemo(() => {
    if (hoveredRow === null) return null;
    const ids = new Set<string>();
    beads.forEach(b => {
      if (b.type === 'NODE' && b.logicalIndex.row === hoveredRow) {
        ids.add(b.id);
      }
    });
    return ids;
  }, [hoveredRow, beads]);

  // Незавершённый выбор начала цепочки (инструмент 'pendant-chain') —
  // подсвечиваем уже отмеченный узел нижнего ряда, пока не выбран второй.
  const chainPendingId = useMemo(() => {
    if (chainPendingStart === null) return null;
    return bottomNodes.find(n => n.logicalIndex.col === chainPendingStart)?.id ?? null;
  }, [chainPendingStart, bottomNodes]);

  const mirrorFn = useCallback(
    (id: string) => mirrorBeadId(id, width, internalTop, internalBottom),
    [width, internalTop, internalBottom],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);

  const handlePointerEnter = useCallback((id: string) => {
    if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && activeTool !== 'pendant-chain' && isDrawing) {
      applyPaint(id);
    }
  }, [activeTool, isDrawing, applyPaint]);

  const handlePointerDown = useCallback((id: string) => {
    if (activeTool === 'stamp') return;
    if (activeTool === 'pendant-chain') {
      const node = bottomNodes.find(n => n.id === id);
      if (node) onChainNodeClick(node.logicalIndex.col);
      return;
    }
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [activeTool, applyPaint, onFloodFill, bottomNodes, onChainNodeClick]);

  // Переводит client-координаты мыши в локальную систему координат <g>,
  // которая совпадает с bead.x/y — без ручного учёта zoom/offset.
  const toBeadCoords = useCallback((clientX: number, clientY: number) => {
    const g = stampGroupRef.current;
    const svg = canvasSvgRef.current;
    if (!g || !svg) return null;
    const ctm = g.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, [canvasSvgRef]);

  const findNearestNode = useCallback((point: { x: number; y: number }): Bead | null => {
    let nearest: Bead | null = null;
    let bestDist = Infinity;
    for (const bead of beads) {
      if (bead.type !== 'NODE') continue;
      const dx = bead.x - point.x;
      const dy = bead.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        nearest = bead;
      }
    }
    return nearest;
  }, [beads]);

  const handleStampContainerPointerDown = useCallback((e: React.PointerEvent) => {
    if (activeTool !== 'stamp') return;
    const beadPoint = toBeadCoords(e.clientX, e.clientY);
    if (!beadPoint) return;
    // На тач с уже загруженным узором нет наведения без контакта — поэтому
    // касание сразу входит в режим «таскать превью», а не ждёт превышения
    // порога драга (см. STAMP_DRAG_THRESHOLD_TOUCH — там он больше не нужен
    // для этого случая, только для рисования новой рамки без узора).
    const movePreview = e.pointerType === 'touch' && stampPattern !== null;
    stampDragRef.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startBead: beadPoint,
      dragging: false,
      mode: movePreview ? 'movePreview' : 'select',
    };
    if (movePreview) {
      const nearest = findNearestNode(beadPoint);
      onStampHover(nearest?.id ?? null);
    }
  }, [activeTool, toBeadCoords, stampPattern, findNearestNode, onStampHover]);

  const handleStampContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (activeTool !== 'stamp' || touchGesture.isMultiTouch()) return;
    const drag = stampDragRef.current;
    if (drag) {
      if (drag.mode === 'movePreview') {
        const beadPoint = toBeadCoords(e.clientX, e.clientY);
        const nearest = beadPoint ? findNearestNode(beadPoint) : null;
        onStampHover(nearest?.id ?? null);
        return;
      }
      const dx = e.clientX - drag.startClient.x;
      const dy = e.clientY - drag.startClient.y;
      const threshold = e.pointerType === 'touch' ? STAMP_DRAG_THRESHOLD_TOUCH : STAMP_DRAG_THRESHOLD;
      if (drag.dragging || Math.hypot(dx, dy) > threshold) {
        // Момент перехода клика в драг — прячем протухший preview старого
        // штампа, чтобы он не мешал видеть новую рамку выделения.
        if (!drag.dragging) onStampHover(null);
        drag.dragging = true;
        const beadPoint = toBeadCoords(e.clientX, e.clientY);
        if (beadPoint) {
          setSelectionRect({
            x: Math.min(drag.startBead.x, beadPoint.x),
            y: Math.min(drag.startBead.y, beadPoint.y),
            w: Math.abs(beadPoint.x - drag.startBead.x),
            h: Math.abs(beadPoint.y - drag.startBead.y),
          });
        }
      }
      return;
    }
    if (stampPattern) {
      const beadPoint = toBeadCoords(e.clientX, e.clientY);
      const nearest = beadPoint ? findNearestNode(beadPoint) : null;
      onStampHover(nearest?.id ?? null);
    }
  }, [activeTool, toBeadCoords, stampPattern, findNearestNode, onStampHover, touchGesture.isMultiTouch]);

  const handleStampContainerPointerUp = useCallback((e: React.PointerEvent) => {
    if (activeTool !== 'stamp' || touchGesture.isMultiTouch()) return;
    const drag = stampDragRef.current;
    stampDragRef.current = null;
    if (!drag) return;

    if (drag.mode === 'movePreview') {
      const beadPoint = toBeadCoords(e.clientX, e.clientY) ?? drag.startBead;
      const nearest = findNearestNode(beadPoint);
      if (nearest) onStampPlace(nearest.id);
      return;
    }

    if (drag.dragging) {
      const beadPoint = toBeadCoords(e.clientX, e.clientY) ?? drag.startBead;
      const minX = Math.min(drag.startBead.x, beadPoint.x);
      const maxX = Math.max(drag.startBead.x, beadPoint.x);
      const minY = Math.min(drag.startBead.y, beadPoint.y);
      const maxY = Math.max(drag.startBead.y, beadPoint.y);
      const ids = beads
        .filter(b => b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY)
        .map(b => b.id);
      setSelectionRect(null);
      onStampSelect(ids);
      return;
    }

    if (stampPattern) {
      const nearest = findNearestNode(drag.startBead);
      if (nearest) onStampPlace(nearest.id);
    }
  }, [activeTool, toBeadCoords, beads, onStampSelect, stampPattern, findNearestNode, onStampPlace, touchGesture.isMultiTouch]);

  const handleStampContainerPointerLeave = useCallback(() => {
    stampDragRef.current = null;
    setSelectionRect(null);
    onStampHover(null);
  }, [onStampHover]);

  const handleExport = useCallback(() => {
    const svg = canvasSvgRef.current;
    if (!svg) return;
    exportSchemeToPng(svg, colorStats, totalCount, canvasTheme).catch((err) => {
      console.error('Failed to export scheme:', err);
    });
  }, [canvasSvgRef, colorStats, totalCount, canvasTheme]);

  return (
    <main
      data-canvas-theme={canvasTheme}
      className={`editor__viewport${activeTool === 'flood-fill' ? ' editor__viewport--flood-fill' : ''}${activeTool === 'stamp' ? ' editor__viewport--stamp' : ''}${activeTool === 'pendant-chain' ? ' editor__viewport--chain' : ''}`}
      style={{ '--stats-reserve': `${statsReserve}px` } as React.CSSProperties}
      onPointerDownCapture={touchGesture.onPointerDownCapture}
      onPointerMove={touchGesture.onPointerMove}
      onPointerDown={() => { if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && activeTool !== 'pendant-chain') startDrawing(); }}
      onPointerUp={(e) => { touchGesture.releasePointer(e); if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && activeTool !== 'pendant-chain') stopDrawing(); }}
      onPointerCancel={(e) => { touchGesture.releasePointer(e); if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && activeTool !== 'pendant-chain') stopDrawing(); }}
      onPointerLeave={(e) => { touchGesture.releasePointer(e); if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && activeTool !== 'pendant-chain') stopDrawing(); }}
      onDragStart={(e) => e.preventDefault()}
    >
      <section className="canvas">
        {/* Обёртка нужна только затем, чтобы дать ручке (.span-controls-toggle)
            позиционирующий контекст, совпадающий с рамкой карточки холста
            (canvas__svg), но НЕ являющийся самой прокручиваемой областью —
            иначе ручка, лежащая внутри overflow:auto контейнера, уезжала бы
            при скролле сетки бисерин вместе с содержимым. */}
        <div className="canvas__svg-frame">
          <div
            className="canvas__svg"
            data-canvas-theme={canvasTheme}
            ref={canvasContainerRef}
            onPointerDown={handleStampContainerPointerDown}
            onPointerMove={handleStampContainerPointerMove}
            onPointerUp={handleStampContainerPointerUp}
            onPointerLeave={handleStampContainerPointerLeave}
          >
            <svg
              ref={canvasSvgRef}
              width={dim.w * zoom}
              height={dim.h * zoom}
              viewBox={`0 0 ${dim.w} ${dim.h}`}
              className="canvas__svg-content"
            >
              {/* Группа трансформации: отделяем визуальный отступ от логики координат.
                  effectiveOffsetX уже (offsetX) на десктопе/при развёрнутых
                  span-контролах, уже (offsetXCollapsed) на ≤767.98px, когда они
                  свёрнуты — освобождает место, которое иначе пустовало бы под
                  скрытыми ±/счётчиками. */}
              <g ref={stampGroupRef} transform={`translate(${effectiveOffsetX}, ${offsetY})`}>
                <CanvasRulers
                  beads={beads}
                  topSpan={topSpan}
                  bottomSpan={bottomSpan}
                  rowSpanOverrides={rowSpanOverrides}
                  onRowSpanChange={onRowSpanChange}
                  hoveredRow={hoveredRow}
                  mirrorMode={mirrorMode}
                  width={width}
                  bottomEdgeEnabled={bottomEdgeEnabled}
                  bottomEdgeSpan={bottomEdgeSpan}
                  onBottomEdgeSpanChange={onBottomEdgeSpanChange}
                  spanControlsExpanded={spanControlsExpanded}
                />

                {beads.map((bead) => (
                  <BeadView
                    key={bead.id}
                    id={bead.id}
                    x={bead.x}
                    y={bead.y}
                    type={bead.type}
                    color={designMap[bead.id]}
                    defaultColor={defaultColorFor(bead.type)}
                    highlighted={
                      (highlightedNodeIds?.has(bead.id) ?? false) ||
                      (colorHighlightedBeadIds?.has(bead.id) ?? false) ||
                      bead.id === chainPendingId
                    }
                    previewColor={stampPreviewPatch?.[bead.id]}
                    onPointerEnter={handlePointerEnter}
                    onPointerDown={handlePointerDown}
                  />
                ))}

                {selectionRect && (
                  <rect
                    className="canvas__stamp-rect"
                    x={selectionRect.x}
                    y={selectionRect.y}
                    width={selectionRect.w}
                    height={selectionRect.h}
                  />
                )}

                <PendantLayer
                  placements={pendantPlacements}
                  templates={pendantTemplates}
                  bottomNodes={bottomNodes}
                  isDrawing={isDrawing}
                  onPaintBead={onPaintPendantBead}
                  onRemove={onRemovePlacement}
                  hoveredCol={hoveredCol}
                  mirrorMode={mirrorMode}
                  width={width}
                  highlightedColor={highlightedColor}
                />

                <PendantChainLayer
                  chains={pendantChains}
                  bottomNodes={bottomNodes}
                  isDrawing={isDrawing}
                  onPaintBead={onPaintChainBead}
                  onRemove={onRemoveChain}
                  highlightedColor={highlightedColor}
                />
              </g>
            </svg>
          </div>

          {/* Ручка выдвижной панели редактора количества бисерин (per-row span
              controls в CanvasRulers) — видна только на ≤767.98px, где эти
              контролы по умолчанию свёрнуты (см. CanvasRulers.css).
              position:absolute относительно .canvas__svg-frame (которая
              размером точно совпадает с самой карточкой .canvas__svg, но не
              скроллится) — лежит поверх карточки, не уезжая при скролле
              сетки бисерин. Шеврон вместо абстрактной иконки — однозначно
              читаемый знак "тут скрыта панель, нажми, чтобы раскрыть",
              направление меняется на противоположное при раскрытии (›
              свёрнуто → ‹ открыто). Не в CanvasChrome — та шарится
              байт-в-байт с CrossWeaveCanvasView, а у CrossWeave этой фичи
              нет вовсе (CrossWeaveRulers). */}
          <button
            type="button"
            className={`span-controls-toggle${isScrolledFromLeft ? ' span-controls-toggle--hidden' : ''}`}
            onClick={() => setSpanControlsExpanded(v => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            title={spanControlsExpanded ? 'Hide bead count editor' : 'Show bead count editor'}
            aria-pressed={spanControlsExpanded}
          >
            {spanControlsExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </section>

      <CanvasStats
        ref={statsRef}
        totalCount={totalCount}
        colorStats={colorStats}
        highlightedColor={highlightedColor}
        onToggleHighlight={handleToggleHighlight}
        activeColor={activeColor}
        onReplaceColor={handleReplaceColor}
      />

      <CanvasChrome
        canvasTheme={canvasTheme}
        onToggleCanvasTheme={onToggleCanvasTheme}
        onExport={handleExport}
      />
    </main>
  );
};