import { ReactNode } from 'react';
import './Sidebar.css';

export type SidebarTab = 'decor' | 'grid';

// Содержимое вкладок приходит слотами, а не пропсами насквозь: у «Grid» ~30
// пропсов, у «Decor» ~40, и провести их через эту оболочку означало бы
// переписать оба интерфейса здесь ещё раз. Оболочка про вкладки и ни про что
// больше — что именно в них лежит, знает XxxEditor.tsx.
//
// Union, а не три необязательных пропа: вкладка decor есть только у силянки
// (подвесок, зубцов и декор-хвостов у RAW/Peyote/Loom нет вовсе), и без неё
// tab/onTabChange не просто не нужны — их нечем осмысленно заполнить. Так
// три остальных редактора физически не могут передать вкладку, а силянка не
// может её забыть.
type EditorSidebarProps = {
  open: boolean;
  grid: ReactNode;
} & (
  | { decor: ReactNode; tab: SidebarTab; onTabChange: (tab: SidebarTab) => void }
  | { decor?: undefined; tab?: undefined; onTabChange?: undefined }
);

// Единственная правая панель приложения. Раньше это были две панели
// (GridSidebar и PendantsSidebar), каждая со своей оболочкой <aside> и своей
// кнопкой в хедере, делившие один и тот же слот справа (оба fixed/right: 0) —
// то есть взаимоисключавшие друг друга уже тогда, но выглядевшие как две
// независимые сущности. Теперь слот, состояние «открыта/закрыта» и кнопка
// одни, а Decor/Grid — вкладки внутри.
export const EditorSidebar = ({ open, tab, onTabChange, grid, decor }: EditorSidebarProps) => {
  // Техника без декора всегда показывает Grid, чем бы ни была последняя
  // выбранная вкладка: состояние вкладки живёт в App и переживает
  // переключение техники (вернулись на силянку — вернулась и вкладка).
  const activeTab = decor ? tab : 'grid';

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__header">
        {decor ? (
          <div className="sidebar__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'decor'}
              className={`sidebar__tab${activeTab === 'decor' ? ' sidebar__tab--active' : ''}`}
              onClick={() => onTabChange?.('decor')}
            >
              Decor
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'grid'}
              className={`sidebar__tab${activeTab === 'grid' ? ' sidebar__tab--active' : ''}`}
              onClick={() => onTabChange?.('grid')}
            >
              Grid
            </button>
          </div>
        ) : (
          <h2 className="sidebar__title">Grid</h2>
        )}
      </div>

      {activeTab === 'decor' ? decor : grid}
    </aside>
  );
};
