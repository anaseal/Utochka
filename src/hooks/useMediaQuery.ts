import { useState, useEffect } from 'react';

// Единственное место в проекте, где адаптив завязан на JS, а не только на
// CSS-медиа-запросы — нужно, когда брейкпоинт должен повлиять на числовое
// значение (например, SVG-геометрию), а не просто на видимость/раскладку.
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};
