/* FILE: src\components\Editor\CanvasView\CanvasView.tsx */
import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Bead } from '../../../types/bead';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { PendantPlacement, PendantTemplate } from '../../../types/pendant';
import { PENDANT_SCALE } from '../../../data/pendantTemplates';
import { BeadView } from '../BeadView/BeadView';
import { CanvasRulers } from '../CanvasRulers/CanvasRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { PendantLayer } from '../PendantLayer/PendantLayer';
import { CanvasChrome } from './CanvasChrome';
import { BEAD_THEME, defaultColorFor } from '../../../config/theme';
import { mirrorBeadId } from '../../../utils/mirror';
import { StampPattern } from '../../../utils/stamp';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng } from '../../../utils/exportScheme';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { computeCanvasDim } from '../../../utils/canvasDim';
import { computeColorStats } from '../../../utils/colorStats';
import { swapColorInMap, swapColorInPendants } from '../../../utils/colorSwap';
import './CanvasView.css';

// Порог в экранных пикселях, отличающий клик (постановка штампа) от драга
// (выделение рамкой) — независим от zoom, т.к. сравнивается в client-координатах.
const STAMP_DRAG_THRESHOLD = 4;

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
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  bottomEdgeEnabled: boolean;
  bottomEdgeSpan: number;
  onBottomEdgeSpanChange: (delta: number) => void;
  stampPattern: StampPattern | null;
  stampPreviewIds: Set<string> | null;
  onStampSelect: (ids: string[]) => void;
  onStampHover: (nodeId: string | null) => void;
  onStampPlace: (nodeId: string) => void;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: ((p: PendantPlacement[]) => PendantPlacement[]) | null,
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
  canvasSvgRef,
  bottomEdgeEnabled,
  bottomEdgeSpan,
  onBottomEdgeSpanChange,
  stampPattern,
  stampPreviewIds,
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

  useWheelZoom(canvasContainerRef, onZoomChange);

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
    );
    setHighlightedColor((c) => (c === oldColor ? null : c));
  }, [applyPatch, activeColor]);

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

    return computeCanvasDim(beads, effectiveOffsetX, offsetY, nodeRadius, { extraMaxY: pendantMaxY });
  }, [beads, effectiveOffsetX, offsetY, nodeRadius, pendantPlacements, pendantTemplates, bottomNodes]);

  // Подвеска учитывается в статистике, только если у неё есть и валидный
  // шаблон, и живая нода-якорь на нижнем ряду (та же проверка, что и в
  // PendantLayer для occupiedCols).
  const validPendantPlacements = useMemo(() => {
    const bottomCols = new Set(bottomNodes.map(n => n.logicalIndex.col));
    return pendantPlacements.filter(
      (p) => pendantTemplates[p.templateId] && bottomCols.has(p.col),
    );
  }, [pendantPlacements, pendantTemplates, bottomNodes]);

  const colorStats = useMemo(() => {
    const stats = computeColorStats(beads, designMap, (bead) => defaultColorFor(bead.type));
    validPendantPlacements.forEach((p) => {
      const template = pendantTemplates[p.templateId];
      template.beads.forEach((bead, index) => {
        const color = p.colorMap[index] ?? defaultColorFor(bead.type);
        stats.set(color, (stats.get(color) || 0) + 1);
      });
    });
    return Array.from(stats.entries());
  }, [beads, designMap, validPendantPlacements, pendantTemplates]);

  const totalCount = useMemo(() => {
    const pendantBeadCount = validPendantPlacements.reduce(
      (sum, p) => sum + pendantTemplates[p.templateId].beads.length,
      0,
    );
    return beads.length + pendantBeadCount;
  }, [beads.length, validPendantPlacements, pendantTemplates]);

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

  const mirrorFn = useCallback(
    (id: string) => mirrorBeadId(id, width, internalTop, internalBottom),
    [width, internalTop, internalBottom],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);

  const handleMouseEnter = useCallback((id: string) => {
    if (activeTool !== 'flood-fill' && activeTool !== 'stamp' && isDrawing) applyPaint(id);
  }, [activeTool, isDrawing, applyPaint]);

  const handleMouseDown = useCallback((id: string) => {
    if (activeTool === 'stamp') return;
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [activeTool, applyPaint, onFloodFill]);

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

  const handleStampContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'stamp') return;
    const beadPoint = toBeadCoords(e.clientX, e.clientY);
    if (!beadPoint) return;
    stampDragRef.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startBead: beadPoint,
      dragging: false,
    };
  }, [activeTool, toBeadCoords]);

  const handleStampContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'stamp') return;
    const drag = stampDragRef.current;
    if (drag) {
      const dx = e.clientX - drag.startClient.x;
      const dy = e.clientY - drag.startClient.y;
      if (drag.dragging || Math.hypot(dx, dy) > STAMP_DRAG_THRESHOLD) {
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
  }, [activeTool, toBeadCoords, stampPattern, findNearestNode, onStampHover]);

  const handleStampContainerMouseUp = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'stamp') return;
    const drag = stampDragRef.current;
    stampDragRef.current = null;
    if (!drag) return;

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
  }, [activeTool, toBeadCoords, beads, onStampSelect, stampPattern, findNearestNode, onStampPlace]);

  const handleStampContainerMouseLeave = useCallback(() => {
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
      className={`editor__viewport${activeTool === 'flood-fill' ? ' editor__viewport--flood-fill' : ''}${activeTool === 'stamp' ? ' editor__viewport--stamp' : ''}`}
      onMouseDown={() => { if (activeTool !== 'flood-fill' && activeTool !== 'stamp') startDrawing(); }}
      onMouseUp={() => { if (activeTool !== 'flood-fill' && activeTool !== 'stamp') stopDrawing(); }}
      onMouseLeave={() => { if (activeTool !== 'flood-fill' && activeTool !== 'stamp') stopDrawing(); }}
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
            onMouseDown={handleStampContainerMouseDown}
            onMouseMove={handleStampContainerMouseMove}
            onMouseUp={handleStampContainerMouseUp}
            onMouseLeave={handleStampContainerMouseLeave}
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
                      (stampPreviewIds?.has(bead.id) ?? false) ||
                      (colorHighlightedBeadIds?.has(bead.id) ?? false)
                    }
                    onMouseEnter={handleMouseEnter}
                    onMouseDown={handleMouseDown}
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
            className="span-controls-toggle"
            onClick={() => setSpanControlsExpanded(v => !v)}
            onMouseDown={(e) => e.stopPropagation()}
            title={spanControlsExpanded ? 'Hide bead count editor' : 'Show bead count editor'}
            aria-pressed={spanControlsExpanded}
          >
            {spanControlsExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </section>

      <CanvasStats
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