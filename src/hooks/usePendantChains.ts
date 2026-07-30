import { useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { PendantChain, ChainEndpoint, ToothPlacement } from '../types/pendant';
import { chainEndpointsEqual, chainEndpointsAllowed } from '../utils/pendantChain';
import { ToothMesh } from '../utils/tooth';
import { DrawingTool } from './useDrawing';

// Зеркалит один конец цепочки: сетка — по формуле width-1-col (нижний ряд
// чётный, зеркало точное); зубец — ищет зеркальную пару в teeth (та же
// reflection-формула, что и addTooth в useTeeth.ts) и берёт тот же beadIndex
// (меши зеркальных зубцов генерируются идентично по структуре — тот же
// приём, на который уже опирается paintToothBead в useTeeth.ts). null, если
// зеркала нет (зубец без пары или ссылка на несуществующий placementId) —
// тогда зеркало цепочки не создаётся, но основная цепочка остаётся как есть
// (см. addChain — «пропускаем только зеркало»).
const mirrorEndpoint = (
  endpoint: ChainEndpoint,
  width: number,
  teeth: ToothPlacement[],
): ChainEndpoint | null => {
  if (endpoint.kind === 'grid') return { kind: 'grid', col: width - 1 - endpoint.col };
  const tooth = teeth.find((t) => t.placementId === endpoint.placementId);
  if (!tooth) return null;
  const mirrorStart = width - 1 - tooth.endCol;
  const mirrorEnd = width - 1 - tooth.startCol;
  const mirrorTooth = teeth.find((t) => t.startCol === mirrorStart && t.endCol === mirrorEnd);
  if (!mirrorTooth) return null;
  return { kind: 'tooth', placementId: mirrorTooth.placementId, beadIndex: endpoint.beadIndex };
};

// Находит зеркальную цепочку для placementId — по неупорядоченному совпадению
// пары концов (порядок start/end не канонический, см. types/pendant.ts).
// Общая для withMirror ниже и для handleChainPaint в useSilyankaProject.ts
// (та тоже ищет зеркало при покраске через заливку) — не дублируем поиск
// зеркала в двух местах.
export const findMirrorChain = (
  chains: PendantChain[],
  placementId: string,
  teeth: ToothPlacement[],
  width: number,
): PendantChain | undefined => {
  const target = chains.find((c) => c.placementId === placementId);
  if (!target) return undefined;
  const mStart = mirrorEndpoint(target.start, width, teeth);
  const mEnd = mirrorEndpoint(target.end, width, teeth);
  if (!mStart || !mEnd) return undefined;
  return chains.find((c) => {
    if (c.placementId === placementId) return false;
    return (
      (chainEndpointsEqual(c.start, mStart) && chainEndpointsEqual(c.end, mEnd)) ||
      (chainEndpointsEqual(c.start, mEnd) && chainEndpointsEqual(c.end, mStart))
    );
  });
};

export const usePendantChains = (
  chains: PendantChain[],
  setChains: Dispatch<SetStateAction<PendantChain[]>>,
  activeColor: string,
  activeTool: DrawingTool,
  mirrorMode: boolean,
  width: number,
  teeth: ToothPlacement[],
  toothMeshes: Map<string, ToothMesh>,
) => {
  // От одной ноды может идти несколько цепочек, и цепочка может соседствовать
  // с обычной подвеской на той же ноде — в отличие от usePendants здесь нет
  // проверки «одна на колонку». Оба конца — сетка или зубец в любой
  // комбинации (см. types/pendant.ts, ChainEndpoint); единственное
  // ограничение — chainEndpointsAllowed (один и тот же зубец → только одна
  // сторона, см. pendantChain.ts).
  const addChain = useCallback((start: ChainEndpoint, end: ChainEndpoint) => {
    if (chainEndpointsEqual(start, end)) return;
    if (!chainEndpointsAllowed(start, end, toothMeshes)) return;
    setChains((prev) => {
      const next = [
        ...prev,
        { placementId: crypto.randomUUID(), start, end, colorMap: {} },
      ];
      // Нижний ряд — чётный, зеркало точное для сетки; зубец зеркалится через
      // свою зеркальную пару в teeth (см. mirrorEndpoint). Если зеркало не
      // резолвится или совпадает с оригиналом — пропускаем только его.
      if (mirrorMode && width > 1) {
        const mStart = mirrorEndpoint(start, width, teeth);
        const mEnd = mirrorEndpoint(end, width, teeth);
        const isSameAsOriginal = mStart && mEnd &&
          chainEndpointsEqual(mStart, start) && chainEndpointsEqual(mEnd, end);
        if (mStart && mEnd && !isSameAsOriginal && chainEndpointsAllowed(mStart, mEnd, toothMeshes)) {
          next.push({ placementId: crypto.randomUUID(), start: mStart, end: mEnd, colorMap: {} });
        }
      }
      return next;
    });
  }, [setChains, mirrorMode, width, teeth, toothMeshes]);

  // Набор placementId, которые меняются вместе с целевой цепочкой: сама
  // цепочка + её зеркальная пара (только в зеркальном режиме).
  const withMirror = useCallback((
    prev: PendantChain[],
    placementId: string,
  ): Set<string> => {
    const ids = new Set([placementId]);
    if (!mirrorMode || width <= 1) return ids;
    const mirror = findMirrorChain(prev, placementId, teeth, width);
    if (mirror) ids.add(mirror.placementId);
    return ids;
  }, [mirrorMode, width, teeth]);

  const removeChain = useCallback((placementId: string) => {
    setChains((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.filter((c) => !ids.has(c.placementId));
    });
  }, [setChains, withMirror]);

  const clearAllChains = useCallback(() => {
    setChains([]);
  }, [setChains]);

  const paintChainBead = useCallback((placementId: string, beadIndex: number) => {
    setChains((prev) => {
      const ids = withMirror(prev, placementId);
      return prev.map((c) => {
        if (!ids.has(c.placementId)) return c;
        if (activeTool === 'eraser') {
          const next = { ...c.colorMap };
          delete next[beadIndex];
          return { ...c, colorMap: next };
        }
        return { ...c, colorMap: { ...c.colorMap, [beadIndex]: activeColor } };
      });
    });
  }, [setChains, activeColor, activeTool, withMirror]);

  // useMemo — см. useThreads.ts: без него объект-обёртка менялся бы на
  // каждый рендер и пробивал memo везде, где используется целиком
  // (например, handleChainNodeClick в useSilyankaProject.ts).
  return useMemo(
    () => ({ chains, addChain, removeChain, clearAllChains, paintChainBead }),
    [chains, addChain, removeChain, clearAllChains, paintChainBead],
  );
};
