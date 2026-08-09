import { forwardRef, useEffect, useRef, useState } from 'react';
import { Palette, Replace } from 'lucide-react';
import { CLEAR_BEAD_COLOR } from '../../../config/theme';
import './CanvasStats.css';

// Восьмизначный вариант — прозрачный бисер (CLEAR_BEAD_COLOR): он такой же
// выбранный цвет, как и любой другой, поэтому его строку тоже можно заменить
// текущим цветом. Всё, что под этот шаблон НЕ подходит — 'transparent' из
// defaultColorFor, то есть незакрашенные бусины: заменять «пустоту» нечем.
const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;

// Подпись строки сводки. «Не закрашено» и «прозрачный бисер» — две разные
// строки, обе без собственного видимого цвета в свотче; без явной подписи и
// разного вида индикатора они выглядели бы одинаковыми пустыми кружками, и
// спецификацию материалов нельзя было бы прочитать.
const labelFor = (color: string, isClear: boolean, isUnfilled: boolean): string => {
  if (isClear) return 'transparent';
  if (isUnfilled) return 'not filled';
  return color;
};

interface CanvasStatsProps {
  totalCount: number;
  colorStats: [string, number][];
  highlightedColor: string | null;
  onToggleHighlight: (color: string) => void;
  activeColor: string;
  onReplaceColor: (oldColor: string) => void;
}

// Ref прокидывается наружу — CanvasView меряет реальную высоту панели
// (ResizeObserver), чтобы резервировать под неё место под холстом. Список
// цветов (.stats__list) — grid высотой в 2 строки с горизонтальным скроллом,
// так что высота панели не растёт от количества цветов и не наезжает на
// нижние ряды бисера на мобильном.
//
// .stats__total/.stats__divider/.stats__list лежат внутри .stats__panel —
// на большинстве брейкпоинтов это просто разметочная вложенность (.stats__panel
// и .stats__list-toggle — display: contents, всё видно как раньше). В
// landscape на телефоне (мало высоты) .stats__list-toggle становится самим
// содержимым .stats (маленькая иконка-кнопка, тот же стиль, что у
// .export-btn/.canvas-theme-toggle в CanvasView.css), а .stats__panel —
// попапом, раскрывающимся по тапу: без этой вложенности total/divider/list
// пришлось бы дублировать в JSX для попапа отдельно от инлайн-варианта.
export const CanvasStats = forwardRef<HTMLElement, CanvasStatsProps>(({
  totalCount, colorStats, highlightedColor, onToggleHighlight, activeColor, onReplaceColor,
}, ref) => {
  // Раскрытие панели попапом — реально используется только в landscape на
  // телефоне (см. .stats__toggle/.stats--list-open в CanvasStats.css): на
  // остальных брейкпоинтах CSS игнорирует этот стейт и панель видна всегда,
  // как раньше. Тот же паттерн клика-снаружи/Escape, что у
  // MirrorMenu/ThreadMenu/header__overflow в Header.tsx.
  const [listOpen, setListOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    const onDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setListOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setListOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [listOpen]);

  return (
    <aside className={`stats${listOpen ? ' stats--list-open' : ''}`} ref={ref}>
      <div className="stats__list-toggle" ref={popupRef}>
        <button
          type="button"
          ref={toggleRef}
          className="stats__toggle"
          onClick={() => setListOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={listOpen}
          title="Material stats"
        >
          <Palette size={14} />
        </button>

        <div className="stats__panel">
          <article className="stats__total">
            <h3 className="stats__label">Total Count</h3>
            <p className="stats__value">{totalCount}</p>
          </article>

          <span className="stats__divider" aria-hidden="true" />

          <ul className="stats__list">
            {colorStats.map(([color, count]) => {
              const isReplaceable = HEX_RE.test(color);
              const isClear = color === CLEAR_BEAD_COLOR;
              const isUnfilled = !isReplaceable;
              const label = labelFor(color, isClear, isUnfilled);
              const indicatorModifier = isClear
                ? ' stats__indicator--clear'
                : isUnfilled ? ' stats__indicator--empty' : '';
              const isHighlighted = highlightedColor === color;
              const isActiveColor = isReplaceable && color.toLowerCase() === activeColor.toLowerCase();
              return (
                <li
                  key={color}
                  className={`stats__color-badge${isHighlighted ? ' stats__color-badge--active' : ''}`}
                >
                  <button
                    type="button"
                    className="stats__indicator-btn"
                    onClick={() => onToggleHighlight(color)}
                    aria-pressed={isHighlighted}
                    aria-label={`Highlight beads of color ${label}`}
                    title={`${label} — highlight on canvas`}
                  >
                    <span
                      className={`stats__indicator${indicatorModifier}`}
                      style={{ backgroundColor: color }}
                    />
                  </button>
                  <span className="stats__count">{count}</span>
                  {isReplaceable && (
                    <button
                      type="button"
                      className="stats__replace-btn"
                      onClick={() => onReplaceColor(color)}
                      disabled={isActiveColor}
                      title={isActiveColor ? 'This is already the current color' : `Replace with current color (${activeColor})`}
                      aria-label={`Replace color ${label} with the currently selected one`}
                    >
                      <Replace size={11} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
});

CanvasStats.displayName = 'CanvasStats';
