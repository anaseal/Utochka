// Относительное время последнего сохранения («Saved 2m ago») — общий формат
// для карточки в галерее проектов и для статуса активного проекта в хедере
// (ProjectStatus.tsx). Жил внутри ProjectGallery.tsx, вынесен сюда, когда
// появился второй потребитель — иначе строки разошлись бы двумя копиями.
//
// Ни мемоизации, ни собственного таймера здесь нет: значение зависит от
// Date.now(), поэтому «не протухнуть на глазах» — задача вызывающего
// компонента (оба потребителя перерисовывают себя раз в 15с, пока видимы).

/** Точная дата — то, что показывается в `title` при наведении. */
export const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export const formatRelativeTime = (iso: string): string => {
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 5) return 'Saved just now';
  if (diffSec < 60) return `Saved ${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `Saved ${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `Saved ${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `Saved ${diffDay}d ago`;
  return `Saved ${formatDate(iso)}`;
};

/** Интервал перерисовки потребителей, чтобы подпись выше не устаревала. */
export const RELATIVE_TIME_TICK_MS = 15000;
