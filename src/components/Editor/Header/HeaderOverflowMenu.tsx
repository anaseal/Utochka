import { RefObject } from 'react';
import {
  MoreHorizontal, Download, Upload, Share2, RotateCcw, Maximize2, Minimize2, Image,
} from 'lucide-react';
import './HeaderOverflowMenu.css';
import { Stepper } from '../../common/Stepper';
import { IconButton } from '../../common/IconButton';
import { MenuItemButton } from '../../common/Menu';
import { WeaveHelp } from './WeaveHelp';
import { canvasViewItems } from './canvasViewItems';
import { APP_CONSTRAINTS } from '../../../config/theme';
import { useDismissablePopup } from '../../../hooks/useDismissablePopup';
import { SharedHeaderProps, Technique } from './Header.types';

interface HeaderOverflowMenuProps {
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom?: (v: number) => void;
  onSaveProject: () => void;
  onShareProject: () => void;
  loadInputRef: RefObject<HTMLInputElement | null>;
  weaveMode: boolean;
  technique: Technique;
  weaveControls: SharedHeaderProps['weaveControls'];
  // Ниже — для секций ≤1279.98px (вид полотна, образец) и ≤599.98px («?»):
  // их кнопки на этих ширинах убраны из строки хедера (см. Header.css).
  canvasView: SharedHeaderProps['canvasView'];
  referenceWindowOpen: boolean;
  onToggleReferenceWindow: () => void;
}

// Попап «⋯»: собирает то, что не поместилось в строку хедера, тремя ступенями
// по ширине (см. Header.css). ≤1279.98px — Zoom, вид полотна и образец: они
// уступили место имени проекта, которое до этого сжималось до
// точки-индикатора уже на узком десктопе (~1050px). ≤767.98px — Save/Load/Share и, в режиме плетения,
// Fullscreen/Reset/«?». ≤599.98px — «?» рисования. Это и есть меню «Функции»
// целевой мобильной раскладки.
export const HeaderOverflowMenu = ({
  zoom, onZoomChange, onSetZoom, onSaveProject, onShareProject, loadInputRef,
  weaveMode, technique, weaveControls, canvasView, referenceWindowOpen, onToggleReferenceWindow,
}: HeaderOverflowMenuProps) => {
  const { open, setOpen, ref, triggerRef } = useDismissablePopup();

  return (
    <div className="header__overflow" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className="header__overflow-trigger"
        aria-label="More settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="header__overflow-panel" role="menu">
          {/* ≤1279.98px: то, что уступило место имени проекта в строке хедера —
              Zoom, вид полотна и образец (см. Header.css). Вид полотна нужен
              и в режиме плетения: кнопка CanvasViewMenu убрана из строки в
              обоих режимах. Образец к плетению не относится и там не
              рендерится, как и везде в хедере. */}
          <div className="header__overflow-tablet-extra">
            <Stepper
              variant="overflow"
              label="Zoom"
              value={`${Math.round(zoom * 100)}%`}
              onDelta={(s) => onZoomChange(s * APP_CONSTRAINTS.zoomStep)}
              onSet={onSetZoom ? (v) => onSetZoom(v / 100) : undefined}
              inputValue={Math.round(zoom * 100)}
              min={APP_CONSTRAINTS.minZoom * 100}
              max={APP_CONSTRAINTS.maxZoom * 100}
            />

            <div className="header__overflow-row header__overflow-row--stacked">
              <span className="header__overflow-label">Canvas view</span>
              {/* Единственное место, где пункты <Menu> рисуются вне <Menu>:
                  панель «Функции» — не список пунктов, а строки «подпись +
                  контрол», и своей разметки не теряет. Список пунктов общий
                  с CanvasViewMenu (canvasViewItems), рисует их тот же
                  <MenuItemButton>, что и меню, — иначе вид двух пунктов
                  разошёлся бы с остальными меню хедера. */}
              <div className="header__overflow-options">
                {canvasViewItems(canvasView).map((item, index) => (
                  <MenuItemButton key={index} item={item} />
                ))}
              </div>
            </div>

            {!weaveMode && (
              <div className="header__overflow-row">
                <span className="header__overflow-label">Reference image</span>
                <div className="grid-controls__actions">
                  {/* Открытая панель — проп active компонента (акцентный глиф
                      на акцентной подложке), а не прежний класс
                      .grid-controls__btn--on, красивший только глиф: это тот же
                      язык «включено», что у активных кнопок ряда хедера. */}
                  <IconButton
                    className="grid-controls__btn"
                    size="md"
                    shape="square"
                    variant="ghost"
                    active={referenceWindowOpen}
                    onClick={onToggleReferenceWindow}
                    title="Reference image"
                    aria-pressed={referenceWindowOpen}
                    icon={<Image size={14} />}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ≤767.98px: дубли Save/Load/Share, скрытых из основной строки
              хедера на этом брейкпоинте (см. Header.css). На более широких
              экранах эти оригиналы и так видны в строке — блок скрыт. */}
          <div className="header__overflow-mobile-extra">
            {/* Без «Saved projects» (FolderOpen): галерею на всех ширинах
                открывает клик по блоку статуса проекта слева в хедере
                (ProjectStatus.tsx) — вход в неё один, дублей больше нет. */}
            <div className="header__overflow-row">
              <span className="header__overflow-label">Save / Load / Share</span>
              <div className="grid-controls__actions">
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
                <IconButton
                  className="grid-controls__btn"
                  size="md"
                  shape="square"
                  variant="ghost"
                  onClick={onShareProject}
                  title="Copy share link"
                  icon={<Share2 size={14} />}
                />
              </div>
            </div>
            {/* Reset/«?» режима плетения: на ≤767.98px их дубли в основной
                строке скрыты (см. .header__weave-desktop-only, Header.css) —
                строка WeaveControls не помещается в хедер даже после
                разбивки на 2 ряда. Тот же приём переноса в overflow, что и
                у Save/Load/Share выше. */}
            {weaveMode && (
              <div className="header__overflow-row">
                <span className="header__overflow-label">Weave mode</span>
                <div className="grid-controls__actions">
                  <IconButton
                    className="grid-controls__btn"
                    size="md"
                    shape="square"
                    variant="ghost"
                    active={weaveControls.isFullscreen}
                    onClick={weaveControls.onToggleFullscreen}
                    title={weaveControls.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    aria-pressed={weaveControls.isFullscreen}
                    icon={weaveControls.isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  />
                  {/* --danger, а не variant="danger": красный нужен только под
                      курсором, в покое Reset — такая же нейтральная иконка, как
                      соседи (см. Header.css). */}
                  <IconButton
                    className="grid-controls__btn grid-controls__btn--danger"
                    size="md"
                    shape="square"
                    variant="ghost"
                    onClick={weaveControls.onReset}
                    disabled={weaveControls.markedCount === 0}
                    title="Reset all progress"
                    icon={<RotateCcw size={14} />}
                  />
                  <WeaveHelp technique={technique} />
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
