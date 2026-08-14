import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeColorStats } from '../utils/colorStats';
import { effectiveBeadColor } from '../config/theme';

// Подсветка цвета из панели материалов (CanvasStats) и сама сводка по цветам —
// общее для всех четырёх техник. Клик по строке легенды подсвечивает все
// бисерины этого цвета, повторный клик снимает подсветку, Escape — тоже.
//
// Обе тяжёлые выборки закешированы на время мазка: пока идёт протяжка
// карандашом/ластиком (isDrawing), designMap меняется на каждую задетую
// бисерину, и честный пересчёт был бы полным проходом по всем бисеринам на
// каждую из них. Отдаём последнее посчитанное значение и досчитываем один раз
// сразу по завершении мазка.

interface UseColorHighlightOptions<B extends { id: string }> {
  beads: readonly B[];
  designMap: Record<string, string>;
  isDrawing: boolean;
  defaultColorOf: (bead: B) => string;
  /** Заменить цвет по всему проекту на активный (своя для каждой техники). */
  onReplaceColor: (oldColor: string) => void;
  /** Досеять сводку источниками вне сетки (подвески и цепочки у силянки). */
  extendStats?: (stats: Map<string, number>) => void;
}

export const useColorHighlight = <B extends { id: string }>({
  beads,
  designMap,
  isDrawing,
  defaultColorOf,
  onReplaceColor,
  extendStats,
}: UseColorHighlightOptions<B>) => {
  const [highlightedColor, setHighlightedColor] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedColor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHighlightedColor(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [highlightedColor]);

  const toggleHighlight = useCallback((color: string) => {
    setHighlightedColor((c) => (c === color ? null : color));
  }, []);

  const replaceColor = useCallback((oldColor: string) => {
    onReplaceColor(oldColor);
    setHighlightedColor((c) => (c === oldColor ? null : c));
  }, [onReplaceColor]);

  // Оба useMemo ниже читают и пишут кеш в рефе, что правило react-hooks/refs
  // запрещает: во время мазка вернётся значение с прошлого рендера, а не
  // свежевычисленное. Здесь это и требуется — обе выборки полным проходом по
  // бисеринам, а designMap во время протяжки меняется на каждую задетую.
  /* eslint-disable react-hooks/refs -- намеренный кеш на время мазка, см. выше */
  const statsRef = useRef<[string, number][]>([]);
  const colorStats = useMemo(() => {
    if (isDrawing) return statsRef.current;
    const stats = computeColorStats(beads, designMap, defaultColorOf);
    extendStats?.(stats);
    const result = Array.from(stats.entries());
    statsRef.current = result;
    return result;
  }, [beads, designMap, isDrawing, defaultColorOf, extendStats]);

  const highlightedIdsRef = useRef<Set<string> | null>(null);
  const highlightedBeadIds = useMemo(() => {
    if (!highlightedColor) return null;
    if (isDrawing) return highlightedIdsRef.current;
    const ids = new Set<string>();
    beads.forEach((b) => {
      const effective = effectiveBeadColor(designMap[b.id], defaultColorOf(b));
      if (effective === highlightedColor) ids.add(b.id);
    });
    highlightedIdsRef.current = ids;
    return ids;
  }, [highlightedColor, beads, designMap, isDrawing, defaultColorOf]);

  // Блок захватывает и return: highlightedBeadIds во время мазка — это ровно
  // значение из рефа, и правило считает его возвратом рефа из рендера.
  return {
    highlightedColor,
    highlightedBeadIds,
    colorStats,
    toggleHighlight,
    replaceColor,
  };
};
/* eslint-enable react-hooks/refs */
