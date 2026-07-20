import { useCallback } from 'react';
import { Thread } from '../../../types/thread';
import { ThreadAnchor } from '../../../utils/beadPositions';
import { buildThreadPathD } from '../../../utils/threadPath';
import { BEAD_THEME } from '../../../config/theme';
import './ThreadLayer.css';

export interface ThreadTrace {
  beadIds: string[];
  rerouting: { threadId: string; end: 'start' | 'end' } | null;
}

export interface ThreadLiveCursor {
  pos: { x: number; y: number };
  // Заполнено, когда курсор попал в hitboxRadius существующей бусины
  // (см. findNearestThreadAnchor в CanvasView) — используется, чтобы решить,
  // показывать ли крестик отмены последней точки.
  magnetId: string | null;
}

interface ThreadLayerProps {
  threads: Thread[];
  positionIndex: Map<string, ThreadAnchor>;
  liveTrace: ThreadTrace | null;
  liveCursor: ThreadLiveCursor | null;
  // Ручки концов и трассировка активны только пока выбран инструмент «нитка»,
  // иначе они перехватывали бы клики у других инструментов (см. BeadView —
  // та же логика: hitbox нитки не должен закрывать бусины по умолчанию).
  interactive: boolean;
  onBeginReroute: (threadId: string, end: 'start' | 'end') => void;
  onRemove: (id: string) => void;
  onRemoveLastTracePoint: () => void;
}

const resolvePoints = (
  beadIds: string[],
  positionIndex: Map<string, ThreadAnchor>,
): ThreadAnchor[] | null => {
  const points: ThreadAnchor[] = [];
  for (const id of beadIds) {
    const p = positionIndex.get(id);
    if (!p) return null;
    points.push(p);
  }
  return points;
};

export const ThreadLayer = ({
  threads,
  positionIndex,
  liveTrace,
  liveCursor,
  interactive,
  onBeginReroute,
  onRemove,
  onRemoveLastTracePoint,
}: ThreadLayerProps) => {
  const { hitboxRadius } = BEAD_THEME.sizes;
  const handleRadius = hitboxRadius * BEAD_THEME.threadDefaults.handleRadiusFactor;

  const handleHandlePointerDown = useCallback((
    e: React.PointerEvent,
    threadId: string,
    end: 'start' | 'end',
  ) => {
    e.stopPropagation();
    if (e.target instanceof Element) e.target.releasePointerCapture(e.pointerId);
    onBeginReroute(threadId, end);
  }, [onBeginReroute]);

  const liveTracePoints = liveTrace
    ? resolvePoints(liveTrace.beadIds, positionIndex)
    : null;

  // Крестик отмены последней точки показывается вместо обычного магнита,
  // когда курсор навёлся именно на последнюю добавленную бусину трассировки
  // (см. removeLastTracePoint в CanvasView) — стартовую точку так не убрать,
  // поэтому требуем минимум 2 точки.
  const lastTraceId = liveTrace && liveTrace.beadIds.length >= 2
    ? liveTrace.beadIds[liveTrace.beadIds.length - 1]
    : null;
  const showRemoveAtCursor = liveCursor?.magnetId != null && liveCursor.magnetId === lastTraceId;

  // Резиновый хвост до курсора — не рисуем его отдельным сегментом, когда
  // курсор и так стоит на последней точке (нулевая длина, только крестик).
  const previewPathPoints = liveTracePoints && liveCursor && !showRemoveAtCursor
    ? [...liveTracePoints, liveCursor.pos]
    : liveTracePoints;

  return (
    <g className="thread-layer">
      {threads.map((thread) => {
        const points = resolvePoints(thread.beadIds, positionIndex);
        if (!points) return null;
        const start = points[0];
        const end = points[points.length - 1];
        const mid = points[Math.floor((points.length - 1) / 2)];

        // strand — только у крестика (две нитки одновременно, см. spec.md,
        // «Нитка»); у силянки всегда undefined → берётся дефолтный --thread-color
        // (CSS-переменная задаётся один раз на группе, а не на каждом
        // элементе — path/handle/кнопка удаления читают её через var(...)).
        const groupStyle = thread.strand === 2
          ? ({ '--thread-color-effective': 'var(--thread-color-2)' } as React.CSSProperties)
          : undefined;

        return (
          <g key={thread.id} className="thread-group" style={groupStyle}>
            <path className="thread-group__path" d={buildThreadPathD(points)} />

            {interactive && (
              <>
                <circle
                  className="thread-group__handle"
                  cx={start.x}
                  cy={start.y}
                  r={handleRadius}
                  onPointerDown={(e) => handleHandlePointerDown(e, thread.id, 'start')}
                />
                <circle
                  className="thread-group__handle"
                  cx={end.x}
                  cy={end.y}
                  r={handleRadius}
                  onPointerDown={(e) => handleHandlePointerDown(e, thread.id, 'end')}
                />
              </>
            )}

            {interactive && (
              // Смещена над серединной бусиной, а не поверх неё — иначе
              // постоянно видимая кнопка закрывала бы hitbox этой бусины для
              // остальных инструментов (в отличие от pendant-chain, чья
              // кнопка всплывает только по hover и лежит ниже цепочки, тут
              // родительский слой намеренно pointer-events:none — см.
              // ThreadLayer.css — поэтому hover-реveal недоступен).
              <g
                className="thread-group__remove-btn"
                transform={`translate(${mid.x}, ${mid.y - handleRadius - 12})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRemove(thread.id);
                }}
              >
                <circle className="thread-group__remove-btn-bg" r={8} />
                <path className="thread-group__remove-btn-icon" d="M -3 -3 L 3 3 M -3 3 L 3 -3" />
              </g>
            )}
          </g>
        );
      })}

      {previewPathPoints && previewPathPoints.length >= 2 && (
        <path className="thread-layer__preview" d={buildThreadPathD(previewPathPoints)} />
      )}

      {/* Точка на бусине, с которой начата трассировка — видна с самого
          первого клика, ещё до того, как есть вторая точка для отрисовки пути. */}
      {liveTracePoints && liveTracePoints.length >= 1 && (
        <circle
          className="thread-layer__start-dot"
          cx={liveTracePoints[0].x}
          cy={liveTracePoints[0].y}
          r={hitboxRadius * 0.3}
        />
      )}

      {showRemoveAtCursor && liveCursor && (
        <g
          className="thread-group__remove-btn"
          transform={`translate(${liveCursor.pos.x}, ${liveCursor.pos.y})`}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemoveLastTracePoint();
          }}
        >
          <circle className="thread-group__remove-btn-bg" r={8} />
          <path className="thread-group__remove-btn-icon" d="M -3 -3 L 3 3 M -3 3 L 3 -3" />
        </g>
      )}
    </g>
  );
};
