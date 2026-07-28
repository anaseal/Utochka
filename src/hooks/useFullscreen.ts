import { useCallback, useEffect, useState } from 'react';

// Полноэкранный режим браузера (Fullscreen API) на весь документ — не только
// холст, но и хедер с WeaveControls внутри него, поэтому таргет —
// document.documentElement, а не отдельный ref. iOS Safari Fullscreen API не
// поддерживает — запрос там молча отклоняется, кнопка просто не действует.
export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(() => document.fullscreenElement !== null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [exitFullscreen]);

  return { isFullscreen, toggleFullscreen, exitFullscreen };
};
