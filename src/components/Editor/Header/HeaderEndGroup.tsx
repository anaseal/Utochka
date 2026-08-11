import { ChangeEvent, RefObject } from 'react';
import {
  Trash2, Download, Upload, Share2, FolderOpen, Image, HelpCircle, Undo2, Redo2,
} from 'lucide-react';
import { SettingsPanelIcon } from './icons';
import { Technique } from './Header.types';

interface HeaderEndGroupProps {
  weaveMode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearAll: () => void;
  onSaveProject: () => void;
  onShareProject: () => void;
  onOpenProjectGallery: () => void;
  loadInputRef: RefObject<HTMLInputElement | null>;
  onLoadInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  referenceWindowOpen: boolean;
  onToggleReferenceWindow: () => void;
  onOpenWelcome: () => void;
  // Нужна только ради подписи кнопки панели: у силянки в ней две вкладки
  // (Decor/Grid), у остальных техник — одна.
  technique: Technique;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// На ≤767.98px тулбар Undo/Redo/Clear и иконки Reference/Panel
// не помещаются в одну строку хедера и обрезаются за
// краем экрана (нет ни переноса, ни скролла у .header__nav) — эта
// обёртка сворачивает их в 2 внутренних ряда (тот же приём, что уже
// даёт двухрядность .tool-group), не трогая раскладку на десктопе/
// планшете (display: contents там "растворяет" обёртку). Целиком
// скрыта на ≤767.98px в режиме плетения (.header--weave, Header.css) —
// Undo/Redo/Clear ниже относятся к рисунку, а не к отметкам прогресса
// (см. WeaveHelp: "Progress has its own undo and never touches your
// drawing history"), и не помещаются в бюджет строки вместе с
// WeaveControls; Save/Load/Share остаются доступны через overflow "⋯"
// (уже дублируются туда на этой ширине независимо от режима).
export const HeaderEndGroup = ({
  weaveMode, onUndo, onRedo, canUndo, canRedo, onClearAll,
  onSaveProject, onShareProject, onOpenProjectGallery, loadInputRef, onLoadInputChange,
  referenceWindowOpen, onToggleReferenceWindow, onOpenWelcome,
  technique, sidebarOpen, onToggleSidebar,
}: HeaderEndGroupProps) => {
  return (
    <div className="header__end-group">
      <div className="grid-controls">
        <div className="grid-controls__toolbar">
          {/* Скрыты целиком в режиме плетения (на всех ширинах, не только
              мобильных) — это Undo/Redo рисунка, не отметок, и во время
              плетения не имеют смысла. */}
          {!weaveMode && (
            <>
              <div className="grid-controls__actions-row">
                {/* Иконки, а не текстовые ↩ ↪, и на всех ширинах: текстовые
                    глифы невозможно привести к одной оптике с иконками рядом —
                    другая насыщенность и базовая линия, — а весь остальной
                    хедер уже на lucide. */}
                <button onClick={onUndo} disabled={!canUndo} className="grid-controls__btn" title="Undo (Ctrl+Z)">
                  <Undo2 size={14} />
                </button>
                <button onClick={onRedo} disabled={!canRedo} className="grid-controls__btn" title="Redo (Ctrl+Y)">
                  <Redo2 size={14} />
                </button>
                <button onClick={onClearAll} className="grid-controls__btn grid-controls__btn--reset" title="Clear All">
                  <Trash2 size={12} className="grid-controls__btn-reset-icon" />
                  <span className="grid-controls__btn-reset-label">CLEAR</span>
                </button>
              </div>
              {/* Полноразмерный разделитель (как .header__divider), а не border
                  на кнопке Save — border-left внутри маленькой 24px-кнопки
                  визуально терялся рядом с бордером самой таблетки. Виден
                  только на десктопе/планшете (>1024px) — на ≤1024px тулбар
                  становится двухэтажным и ряды разделяет border-top (см. медиа-
                  запрос ниже), там этот разделитель скрыт. */}
              <span className="grid-controls__toolbar-divider" aria-hidden="true" />
            </>
          )}
          <div className="grid-controls__actions-row grid-controls__actions-row--files">
            <button onClick={onSaveProject} className="grid-controls__btn" title="Save project to file">
              <Download size={14} />
            </button>
            <button onClick={() => loadInputRef.current?.click()} className="grid-controls__btn" title="Load project from file">
              <Upload size={14} />
            </button>
            <button onClick={onShareProject} className="grid-controls__btn" title="Copy share link">
              <Share2 size={14} />
            </button>
            <button onClick={onOpenProjectGallery} className="grid-controls__btn" title="Saved projects">
              <FolderOpen size={14} />
            </button>
          </div>
          <input
            ref={loadInputRef}
            type="file"
            accept="application/json"
            className="header__file-input"
            onChange={onLoadInputChange}
          />
        </div>
      </div>

      {/* Без !weaveMode рядом с этим разделителем в режиме плетения он
          повисал бы одиноким штрихом в конце строки — header__end-icons
          следом за ним скрыт условием ниже. */}
      {!weaveMode && <div className="header__divider header__divider--end-adjacent" />}

      {/* Референс и правая панель (Decor/Grid) — редакторские панели. В
          режиме плетения группа скрыта целиком (сами панели App закрывает
          при входе в режим), поэтому условие одно на всю обёртку: пустой
          .header__end-icons на ≤767.98px всё равно занимал бы строку в
          двухрядном .header__end-group.
          Стоит отдельно от .tool-group: та на ≤1024px зафиксирована по ширине
          и переносится в 2 строки (3+3 silyanka, 3+2 crossWeave) — седьмой/
          шестой элемент внутри неё проваливался бы в одинокую 3-ю строку. */}
      {!weaveMode && (
        <div className="header__end-icons">
          {/* «?» — то самое окно, что показывается на первом запуске
              (WelcomeDialog.tsx): без кнопки оно доступно ровно один раз.
              В режиме плетения не показывается вместе со всей группой — там
              своя «?» рядом с WeaveControls (WeaveHelp.tsx), и две кнопки
              помощи в одной строке читались бы как одна и та же. */}
          {/* tool-btn--help: на ≤479.98px строка разложена в два ряда, и «?» —
              единственное, что в DOM стоит раньше своего места в раскладке
              (перед образцом и панелью, а нужно последним) — уводится
              туда через order, см. Header.css. */}
          <button
            onClick={onOpenWelcome}
            className="tool-btn tool-btn--help"
            title="What this app is"
          >
            <HelpCircle size={14} />
          </button>

          {/* Две кнопки ниже на ≤479.98px из строки убраны: образец уехал в
              меню «Функции» (HeaderOverflowMenu), панель — в меню «Изделие»
              (TechniqueMenu). Классы-модификаторы нужны как зацепки: по
              одному .tool-btn их от соседей не отличить. */}
          <button
            onClick={onToggleReferenceWindow}
            className={`tool-btn tool-btn--reference ${referenceWindowOpen ? 'tool-btn--active' : ''}`}
            title="Reference image"
            aria-pressed={referenceWindowOpen}
          >
            <Image size={14} />
          </button>

          {/* Одна кнопка на всю правую панель, а не по одной на вкладку:
              панель и слот справа одни, и вторая кнопка означала бы «открыть
              то же самое, но на другой вкладке» — вкладки для этого и есть. */}
          <button
            onClick={onToggleSidebar}
            className={`tool-btn tool-btn--lg tool-btn--panel ${sidebarOpen ? 'tool-btn--active' : ''}`}
            title={technique === 'silyanka' ? 'Decor and grid settings' : 'Grid settings'}
            aria-pressed={sidebarOpen}
          >
            <SettingsPanelIcon size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
