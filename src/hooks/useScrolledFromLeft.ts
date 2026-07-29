/* FILE: src\hooks\useScrolledFromLeft.ts */
import { RefObject, useEffect, useState } from 'react';

// Шеврон (.span-controls-toggle в CanvasView) «пришвартован» к левому краю
// карточки холста и осмыслен только там (за ним прячется панель, живущая у
// левого края сетки) — как только пользователь скроллит вправо, эта панель
// уезжает за пределы видимой области, и шеврон поверх чужих колонок вводит в
// заблуждение. Поэтому он скрыт всё время, пока scrollLeft > 0, и появляется
// обратно не по таймеру, а только когда пользователь докрутит холст обратно
// до левого края.
export const useScrolledFromLeft = (containerRef: RefObject<HTMLElement | null>): boolean => {
  const [isScrolledFromLeft, setIsScrolledFromLeft] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => setIsScrolledFromLeft(el.scrollLeft > 0);
    handleScroll();
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef]);
  return isScrolledFromLeft;
};
