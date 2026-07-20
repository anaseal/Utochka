/* FILE: src\components\Editor\CanvasView\CrossWeaveCanvasView.tsx */
import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { CrossWeaveBead } from '../../../types/crossWeaveBead';
import { Thread } from '../../../types/thread';
import { CrossWeaveBeadView } from '../BeadView/CrossWeaveBeadView';
import { CrossWeaveRulers } from '../CanvasRulers/CrossWeaveRulers';
import { CanvasStats } from '../CanvasStats/CanvasStats';
import { CanvasChrome } from './CanvasChrome';
import { ThreadTraceControls } from './ThreadTraceControls';
import { ThreadLayer, ThreadTrace } from '../ThreadLayer/ThreadLayer';
import { CROSS_WEAVE_THEME, defaultColorForCrossWeave } from '../../../config/crossWeaveTheme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { exportSchemeToPng, type ContentBounds } from '../../../utils/exportScheme';
import { mirrorCrossWeaveBeadId } from '../../../utils/crossWeaveMirror';
import { useWheelZoom } from '../../../hooks/useWheelZoom';
import { useTouchPanZoom } from '../../../hooks/useTouchPanZoom';
import { useStatsReserve } from '../../../hooks/useStatsReserve';
import { useMirrorPaint } from '../../../hooks/useMirrorPaint';
import { computeCanvasDim } from '../../../utils/canvasDim';
import { computeColorStats } from '../../../utils/colorStats';
import { swapColorInMap } from '../../../utils/colorSwap';
import './CanvasView.css';

interface CrossWeaveCanvasViewProps {
  beads: CrossWeaveBead[];
  width: number;
  height: number;
  canvasTheme: 'dark' | 'light';
  onToggleCanvasTheme: () => void;
  designMap: Record<string, string>;
  activeTool: DrawingTool;
  activeColor: string;
  isDrawing: boolean;
  paintBead: (id: string) => void;
  startDrawing: () => void;
  stopDrawing: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom: (v: number) => void;
  mirrorMode: boolean;
  rawWidth: number;
  onFloodFill: (id: string) => void;
  threads: Thread[];
  onAddThread: (beadIds: string[], strand?: 1 | 2) => void;
  onRerouteThreadEnd: (threadId: string, end: 'start' | 'end', traceBeadIds: string[]) => void;
  onRemoveThread: (id: string) => void;
  // Крестик физически плетётся двумя нитками одновременно — новая нитка
  // помечается текущим выбором (см. Header → ThreadMenu). У силянки такого
  // выбора нет (одна нитка), поэтому проп только здесь.
  activeThreadStrand: 1 | 2;
  applyPatch: (
    designMapFn: ((m: Record<string, string>) => Record<string, string>) | null,
    pendantsFn: null,
  ) => void;
}

// CrossWeave — MVP-канвас: карандаш/ластик/заливка + Mirror Mode, без stamp/подвесок.
// Не ветка CanvasView, а отдельный компонент — переиспользует общий CSS-шелл
// (canvas__svg, editor__viewport, export-btn, canvas-theme-toggle) и CanvasStats.
export const CrossWeaveCanvasView = ({
  beads,
  width,
  height,
  canvasTheme,
  onToggleCanvasTheme,
  designMap,
  activeTool,
  activeColor,
  isDrawing,
  paintBead,
  startDrawing,
  stopDrawing,
  zoom,
  onZoomChange,
  onSetZoom,
  mirrorMode,
  rawWidth,
  onFloodFill,
  threads,
  onAddThread,
  onRerouteThreadEnd,
  onRemoveThread,
  activeThreadStrand,
  applyPatch,
}: CrossWeaveCanvasViewProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);
  const canvasGroupRef = useRef<SVGGElement>(null);
  const [highlightedColor, setHighlightedColor] = useState<string | null>(null);
  const [threadTrace, setThreadTrace] = useState<ThreadTrace | null>(null);
  // См. CanvasView.tsx — курсор во время протяжки нитки: позиция (примагниченная
  // к ближайшей бусине в hitboxRadius, иначе сырые координаты) + id-магнит
  // для «резиновой» линии и крестика отмены последней точки.
  const [threadCursor, setThreadCursor] = useState<{ pos: { x: number; y: number }; magnetId: string | null } | null>(null);
  useEffect(() => {
    if (activeTool !== 'thread') {
      setThreadTrace(null);
      setThreadCursor(null);
    }
  }, [activeTool]);

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
    applyPatch((m) => swapColorInMap(m, oldColor, activeColor), null);
    setHighlightedColor((c) => (c === oldColor ? null : c));
  }, [applyPatch, activeColor]);

  const offsetX = 60;
  const offsetY = 60;
  const { beadMajorRadius } = CROSS_WEAVE_THEME.sizes;

  const dim = useMemo(
    () => computeCanvasDim(beads, offsetX, offsetY, beadMajorRadius),
    [beads, beadMajorRadius],
  );

  useWheelZoom(canvasContainerRef, onZoomChange);
  // Второй палец отменяет начатый одним пальцем жест (мазок, трассировка
  // нитки) — переключение на панораму/zoom, см. CanvasView.tsx.
  const cancelActiveStroke = useCallback(() => {
    stopDrawing();
    setThreadTrace(null);
    setThreadCursor(null);
  }, [stopDrawing]);
  const touchGesture = useTouchPanZoom(canvasContainerRef, canvasSvgRef, zoom, dim, onSetZoom, cancelActiveStroke);
  const { statsRef, reserve: statsReserve } = useStatsReserve(140);

  // Плоская карта id → координаты — у CrossWeave один слой бусин без
  // подвесок/цепочек (см. CanvasView.tsx/beadPositions.ts для силянки).
  const beadPositionIndex = useMemo(
    () => new Map(beads.map((b) => [b.id, { x: b.x, y: b.y }])),
    [beads],
  );

  // См. CanvasView.tsx — перевод client-координат мыши в локальную систему
  // <g>, совпадающую с bead.x/y, без ручного учёта zoom/offset.
  const toBeadCoords = useCallback((clientX: number, clientY: number) => {
    const g = canvasGroupRef.current;
    const svg = canvasSvgRef.current;
    if (!g || !svg) return null;
    const ctm = g.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const findNearestThreadAnchor = useCallback((point: { x: number; y: number }) => {
    let nearestId: string | null = null;
    let nearestPos: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const [id, pos] of beadPositionIndex) {
      const dx = pos.x - point.x;
      const dy = pos.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        nearestId = id;
        nearestPos = pos;
      }
    }
    const threshold = CROSS_WEAVE_THEME.sizes.hitboxRadius;
    if (!nearestPos || bestDist > threshold * threshold) return null;
    return { id: nearestId as string, pos: nearestPos };
  }, [beadPositionIndex]);

  const handleThreadPointerMove = useCallback((e: React.PointerEvent) => {
    if (activeTool !== 'thread' || !threadTrace || touchGesture.isMultiTouch()) return;
    const beadPoint = toBeadCoords(e.clientX, e.clientY);
    if (!beadPoint) return;
    const nearest = findNearestThreadAnchor(beadPoint);
    setThreadCursor({ pos: nearest?.pos ?? beadPoint, magnetId: nearest?.id ?? null });
  }, [activeTool, threadTrace, touchGesture, toBeadCoords, findNearestThreadAnchor]);

  const handleThreadPointerLeave = useCallback(() => {
    setThreadCursor(null);
  }, []);

  const colorStats = useMemo(
    () => Array.from(computeColorStats(beads, designMap, defaultColorForCrossWeave).entries()),
    [beads, designMap],
  );

  const totalCount = beads.length;

  const colorHighlightedBeadIds = useMemo(() => {
    if (!highlightedColor) return null;
    const ids = new Set<string>();
    beads.forEach((b) => {
      const effective = designMap[b.id] || defaultColorForCrossWeave();
      if (effective === highlightedColor) ids.add(b.id);
    });
    return ids;
  }, [highlightedColor, beads, designMap]);

  // Границы для обрезки PNG по узору при экспорте (координаты корневого
  // <svg>, с учётом translate(offsetX, offsetY)) — впритык к закрашенным
  // бусинам со всех сторон. getBBox() всего клона тут не годится: линейка
  // и легенда из экспорта убираются целиком (см. handleExport), но даже без
  // них считать границы явно надёжнее и дешевле, чем гонять DOM-измерение.
  const paintedBounds = useMemo<ContentBounds | null>(() => {
    const painted = beads.filter((b) => !!designMap[b.id]);
    if (painted.length === 0) return null;
    const xs = painted.map((b) => b.x);
    const ys = painted.map((b) => b.y);
    const minX = offsetX + Math.min(...xs) - beadMajorRadius;
    const minY = offsetY + Math.min(...ys) - beadMajorRadius;
    return {
      x: minX,
      y: minY,
      width: offsetX + Math.max(...xs) + beadMajorRadius - minX,
      height: offsetY + Math.max(...ys) + beadMajorRadius - minY,
    };
  }, [beads, designMap, beadMajorRadius]);

  const mirrorAxis = useMemo(() => {
    if (!mirrorMode || beads.length === 0) return null;
    let maxX = 0;
    let found = false;
    for (const b of beads) {
      if (b.orientation === 'horizontal' && b.x > maxX) { maxX = b.x; found = true; }
    }
    if (!found) return null;
    const ys = beads.map(b => b.y);
    const axisMarginY = 30;
    return {
      x: maxX / 2,
      yTop: Math.min(...ys) - axisMarginY,
      yBottom: Math.max(...ys) + axisMarginY,
    };
  }, [mirrorMode, beads]);

  const mirrorFn = useCallback(
    (id: string) => mirrorCrossWeaveBeadId(id, rawWidth),
    [rawWidth],
  );
  const applyPaint = useMirrorPaint(paintBead, mirrorMode, mirrorFn);

  const beginThreadReroute = useCallback((threadId: string, end: 'start' | 'end') => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    const anchorId = end === 'start' ? thread.beadIds[0] : thread.beadIds[thread.beadIds.length - 1];
    setThreadTrace({ beadIds: [anchorId], rerouting: { threadId, end } });
  }, [threads]);

  // Коммит — по двойному клику (см. onDoubleClick на <main> ниже), а не по
  // завершению drag: точная протяжка через мелкие бусины неудобна, поэтому
  // нитка прокладывается отдельными кликами.
  const commitThreadTrace = useCallback(() => {
    setThreadTrace((prev) => {
      if (!prev) return null;
      if (prev.rerouting) {
        if (prev.beadIds.length >= 2) {
          onRerouteThreadEnd(prev.rerouting.threadId, prev.rerouting.end, prev.beadIds.slice(1));
        }
      } else if (prev.beadIds.length >= 2) {
        onAddThread(prev.beadIds, activeThreadStrand);
      }
      return null;
    });
    setThreadCursor(null);
  }, [onAddThread, onRerouteThreadEnd, activeThreadStrand]);

  // См. CanvasView.tsx — единая точка входа для трассировки: повторный клик
  // по уже последней точке трассировки завершает нитку (коммит при ≥2
  // точках, иначе черновик отбрасывается) вместо молчаливого игнорирования.
  const handleThreadPoint = useCallback((id: string) => {
    if (threadTrace && threadTrace.beadIds[threadTrace.beadIds.length - 1] === id) {
      commitThreadTrace();
      return;
    }
    setThreadTrace(prev => {
      if (!prev) return { beadIds: [id], rerouting: null };
      if (prev.beadIds[prev.beadIds.length - 1] === id) return prev;
      return { ...prev, beadIds: [...prev.beadIds, id] };
    });
  }, [threadTrace, commitThreadTrace]);

  // См. CanvasView.tsx — «шаг назад» по крестику на последней точке трассировки.
  const removeLastTracePoint = useCallback(() => {
    setThreadTrace(prev => {
      if (!prev || prev.beadIds.length < 2) return prev;
      return { ...prev, beadIds: prev.beadIds.slice(0, -1) };
    });
  }, []);

  // Enter коммитит трассировку (как двойной клик), Escape сбрасывает её,
  // не выходя из инструмента «нитка» — см. CanvasView.tsx.
  useEffect(() => {
    if (activeTool !== 'thread' || !threadTrace) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitThreadTrace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setThreadTrace(null);
        setThreadCursor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, threadTrace, commitThreadTrace]);

  // 'thread' сюда не заходит — точки добавляются только явным кликом
  // (handlePointerDown), протяжка их не добавляет.
  const handlePointerEnter = useCallback((id: string) => {
    if (activeTool !== 'flood-fill' && activeTool !== 'thread' && isDrawing) applyPaint(id);
  }, [activeTool, isDrawing, applyPaint]);

  const handlePointerDown = useCallback((id: string) => {
    if (activeTool === 'thread') {
      handleThreadPoint(id);
      return;
    }
    if (activeTool === 'flood-fill') {
      onFloodFill(id);
    } else {
      applyPaint(id);
    }
  }, [activeTool, applyPaint, onFloodFill, handleThreadPoint]);

  const handleExport = useCallback(() => {
    const svg = canvasSvgRef.current;
    if (!svg) return;
    exportSchemeToPng(svg, colorStats, totalCount, canvasTheme, {
      contentBounds: paintedBounds ?? undefined,
      // Незакрашенные бусины прячем только когда есть что показать —
      // на пустом холсте оставляем обычный вид всей сетки.
      extraStripSelector: paintedBounds
        ? '.bead--empty, .canvas__ruler-group'
        : '.canvas__ruler-group',
      hideLegend: true,
    }).catch((err) => {
      console.error('Failed to export scheme:', err);
    });
  }, [colorStats, totalCount, canvasTheme, paintedBounds]);

  return (
    <main
      data-canvas-theme={canvasTheme}
      className={`editor__viewport${activeTool === 'flood-fill' ? ' editor__viewport--flood-fill' : ''}${activeTool === 'thread' ? ' editor__viewport--thread' : ''}`}
      style={{ '--stats-reserve': `${statsReserve}px` } as React.CSSProperties}
      onPointerDownCapture={touchGesture.onPointerDownCapture}
      onPointerMove={touchGesture.onPointerMove}
      onPointerDown={() => { if (activeTool !== 'flood-fill' && activeTool !== 'thread') startDrawing(); }}
      onPointerUp={(e) => {
        touchGesture.releasePointer(e);
        if (activeTool !== 'flood-fill' && activeTool !== 'thread') stopDrawing();
      }}
      onPointerCancel={(e) => {
        touchGesture.releasePointer(e);
        if (activeTool !== 'flood-fill' && activeTool !== 'thread') stopDrawing();
      }}
      onPointerLeave={(e) => {
        touchGesture.releasePointer(e);
        if (activeTool !== 'flood-fill' && activeTool !== 'thread') stopDrawing();
      }}
      onDoubleClick={() => { if (activeTool === 'thread') commitThreadTrace(); }}
      onDragStart={(e) => e.preventDefault()}
    >
      <section className="canvas">
        <div
          className="canvas__svg"
          data-canvas-theme={canvasTheme}
          ref={canvasContainerRef}
          onPointerMove={handleThreadPointerMove}
          onPointerLeave={handleThreadPointerLeave}
        >
          <svg
            ref={canvasSvgRef}
            width={dim.w * zoom}
            height={dim.h * zoom}
            viewBox={`0 0 ${dim.w} ${dim.h}`}
            className="canvas__svg-content"
          >
            <g ref={canvasGroupRef} transform={`translate(${offsetX}, ${offsetY})`}>
              <CrossWeaveRulers beads={beads} width={width} height={height} />

              {mirrorAxis && (
                <line
                  x1={mirrorAxis.x}
                  y1={mirrorAxis.yTop}
                  x2={mirrorAxis.x}
                  y2={mirrorAxis.yBottom}
                  className="canvas__mirror-axis"
                  pointerEvents="none"
                />
              )}

              {beads.map((bead) => (
                <CrossWeaveBeadView
                  key={bead.id}
                  id={bead.id}
                  x={bead.x}
                  y={bead.y}
                  orientation={bead.orientation}
                  color={designMap[bead.id]}
                  defaultColor={defaultColorForCrossWeave()}
                  highlighted={colorHighlightedBeadIds?.has(bead.id) ?? false}
                  onPointerEnter={handlePointerEnter}
                  onPointerDown={handlePointerDown}
                />
              ))}

              <ThreadLayer
                threads={threads}
                positionIndex={beadPositionIndex}
                liveTrace={threadTrace}
                liveCursor={threadCursor}
                interactive={activeTool === 'thread'}
                onBeginReroute={beginThreadReroute}
                onRemove={onRemoveThread}
                onRemoveLastTracePoint={removeLastTracePoint}
              />
            </g>
          </svg>
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

      <ThreadTraceControls
        trace={threadTrace}
        onRemoveLastPoint={removeLastTracePoint}
        onCancel={() => { setThreadTrace(null); setThreadCursor(null); }}
      />
    </main>
  );
};
