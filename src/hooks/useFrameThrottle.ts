import { useCallback, useRef } from 'react';

const FRAME_MS = 16;

/**
 * Возвращает функцию-страж «этот вызов пропустить» (true — пропустить).
 *
 * Линейный перебор бисерин в поиске ближайшей к курсору не нужен чаще одного
 * раза за кадр: pointermove сыпется выше частоты обновления экрана
 * (высокополлинговые мыши и перья), и на большом полотне это лишняя нагрузка
 * при каждом наведении штампа/нитки. Не применяется к жестам, где нет поиска
 * ближайшей бусины (например драг рамки выделения — там только арифметика, и
 * throttle сделал бы рамку менее отзывчивой без выигрыша).
 */
export const useFrameThrottle = () => {
  const lastRef = useRef(0);
  return useCallback(() => {
    const now = performance.now();
    if (now - lastRef.current < FRAME_MS) return true;
    lastRef.current = now;
    return false;
  }, []);
};
