import { ChangeEvent, RefObject } from 'react';
import {
  Trash2, Download, Upload, Share2, Image, HelpCircle, Undo2, Redo2,
} from 'lucide-react';
import './HeaderEndGroup.css';
import { SettingsPanelIcon } from './icons';
import { Button } from '../../common/Button';
import { IconButton } from '../../common/IconButton';
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
  onSaveProject, onShareProject, loadInputRef, onLoadInputChange,
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
                <IconButton
                  className="grid-controls__btn"
                  size="md"
                  shape="square"
                  variant="ghost"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  icon={<Undo2 size={14} />}
                />
                <IconButton
                  className="grid-controls__btn"
                  size="md"
                  shape="square"
                  variant="ghost"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
                  icon={<Redo2 size={14} />}
                />
                {/* Единственная кнопка таблетки с подписью, поэтому <Button>,
                    а не <IconButton>: тот children не рендерит вовсе. Подпись
                    сворачивается в иконку на ≤767.98px — ровно тот случай, под
                    который у <Button> есть .btn__label (см. Button.tsx), своей
                    пары классов для этого больше не нужно. */}
                <Button
                  className="grid-controls__clear"
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  title="Clear All"
                  icon={<Trash2 size={14} className="grid-controls__clear-icon" />}
                >
                  CLEAR
                </Button>
              </div>
              {/* Полноразмерный разделитель (как .header__divider), а не border
                  на кнопке Save — border-left внутри маленькой 24px-кнопки
                  визуально терялся рядом с бордером самой таблетки. Виден
                  только на десктопе (>1149.98px) — ниже тулбар
                  становится двухэтажным и ряды разделяет border-top (см. медиа-
                  запрос ниже), там этот разделитель скрыт. */}
              <span className="grid-controls__toolbar-divider" aria-hidden="true" />
            </>
          )}
          <div className="grid-controls__actions-row grid-controls__actions-row--files">
            <IconButton
              className="grid-controls__btn"
              size="md"
              shape="square"
              variant="ghost"
              onClick={onSaveProject}
              title="Save project to file"
              icon={<Download size={14} />}
            />
            <IconButton
              className="grid-controls__btn"
              size="md"
              shape="square"
              variant="ghost"
              onClick={() => loadInputRef.current?.click()}
              title="Load project from file"
              icon={<Upload size={14} />}
            />
            {/* Кнопки «Saved projects» (FolderOpen) здесь нет: галерею на всех
                ширинах открывает клик по блоку статуса проекта слева
                (ProjectStatus.tsx). Вторая кнопка на другом краю хедера вела в
                то же окно и только съедала дефицитную ширину; в overflow-меню
                «⋯» её дубль убран по той же причине. */}
            <IconButton
              className="grid-controls__btn"
              size="md"
              shape="square"
              variant="ghost"
              onClick={onShareProject}
              title="Copy share link"
              icon={<Share2 size={14} />}
            />
            {/* Дубль «?» из .header__end-icons: на 768–1149.98px тулбар
                двухэтажный, и нижний ряд из трёх иконок короче верхнего с
                текстовой CLEAR — под ней остаётся пустое место ровно на одну
                кнопку 26px. Оригинал на этих ширинах скрыт (Header.css), так
                что в строке она всё равно одна: перенести узел из одного
                контейнера в другой средствами CSS нельзя, а тот же приём
                «вторая копия под своим брейкпоинтом» уже несёт панель «⋯»
                (.header__overflow-narrow-extra).
                Ниже 768px ряд Save/Load/Share скрыт целиком и дубль уходит
                вместе с ним — там «?» снова живёт в .header__end-icons, а с
                ≤599.98px уезжает в «⋯». В режиме плетения его нет: верхнего
                ряда (Undo/Redo/CLEAR) там нет вовсе, свободного места под ним
                не появляется, а справка режима — своя (WeaveHelp). */}
            {!weaveMode && (
              <IconButton
                className="grid-controls__btn grid-controls__btn--help"
                size="md"
                shape="square"
                variant="ghost"
                onClick={onOpenWelcome}
                title="What this app is"
                icon={<HelpCircle size={14} />}
              />
            )}
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
          Стоит отдельно от .tool-group: та на ≤1149.98px зафиксирована по ширине
          и переносится в 2 строки (3+3 silyanka, 3+2 crossWeave) — седьмой/
          шестой элемент внутри неё проваливался бы в одинокую 3-ю строку. */}
      {!weaveMode && (
        <div className="header__end-icons">
          {/* «?» — то самое окно, что показывается на первом запуске
              (WelcomeDialog.tsx): без кнопки оно доступно ровно один раз.
              В режиме плетения не показывается вместе со всей группой — там
              своя «?» рядом с WeaveControls (WeaveHelp.tsx), и две кнопки
              помощи в одной строке читались бы как одна и та же. */}
          {/* tool-btn--help: на 768–1149.98px скрыта в пользу дубля в пустой
              ячейке тулбара под CLEAR (см. выше), на ≤599.98px убрана из строки
              в меню «Функции» (HeaderOverflowMenu) — двухрядная сетка даёт
              12 ячеек на 13 кнопок, и уступает та, которую читают один раз. */}
          <IconButton
            variant="chip"
            className="tool-btn tool-btn--help"
            onClick={onOpenWelcome}
            title="What this app is"
            icon={<HelpCircle size={14} />}
          />

          {/* Образец из строки убирается на ≤1279.98px — в меню «Функции»
              (HeaderOverflowMenu), вместе с Zoom и видом полотна ради имени
              проекта. Панель (ниже) на всех ширинах остаётся в строке: на
              ≤599.98px она встаёт шестой ячейкой первого ряда сетки
              (см. Header.css). Классы-модификаторы нужны как зацепки: по
              одному .tool-btn их от соседей не отличить. */}
          <IconButton
            variant="chip"
            className="tool-btn tool-btn--reference"
            active={referenceWindowOpen}
            onClick={onToggleReferenceWindow}
            title="Reference image"
            aria-pressed={referenceWindowOpen}
            icon={<Image size={14} />}
          />

          {/* Одна кнопка на всю правую панель, а не по одной на вкладку:
              панель и слот справа одни, и вторая кнопка означала бы «открыть
              то же самое, но на другой вкладке» — вкладки для этого и есть. */}
          <IconButton
            variant="chip"
            className="tool-btn tool-btn--panel"
            active={sidebarOpen}
            onClick={onToggleSidebar}
            title={technique === 'silyanka' ? 'Decor and grid settings' : 'Grid settings'}
            aria-pressed={sidebarOpen}
            icon={<SettingsPanelIcon size={14} />}
          />
        </div>
      )}
    </div>
  );
};
