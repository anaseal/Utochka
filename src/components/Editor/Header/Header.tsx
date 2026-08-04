import { useRef } from 'react';
import { ListChecks } from 'lucide-react';
import './Header.css';
import { TechniqueMenu } from './TechniqueMenu';
import { Stepper } from '../../common/Stepper';
import { APP_CONSTRAINTS } from '../../../config/theme';
import { WeaveControls } from './WeaveControls';
import { PaletteWidget } from './PaletteWidget';
import { HeaderToolGroup } from './HeaderToolGroup';
import { HeaderOverflowMenu } from './HeaderOverflowMenu';
import { HeaderEndGroup } from './HeaderEndGroup';
import { HeaderProps } from './Header.types';

export const Header = (props: HeaderProps) => {
  const {
    palette, onPaletteChange, activeColor, setActiveColor, activeTool, setActiveTool, recentColors, commitRecentColor, onClearAll,
    onSaveProject, onLoadProject, onShareProject,
    zoom, onZoomChange, onSetZoom,
    onUndo, onRedo, canUndo, canRedo,
    technique, onTechniqueChange,
    referenceWindowOpen, onToggleReferenceWindow,
    threads, onClearAllThreads,
    gridSidebarOpen, onToggleGridSidebar,
    weaveMode, onToggleWeaveMode, weaveControls,
  } = props;

  const loadInputRef = useRef<HTMLInputElement>(null);
  const handleLoadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onLoadProject(file);
  };

  const silyankaProps = props.technique === 'silyanka' ? props.silyankaProps : undefined;
  const crossWeaveProps = props.technique === 'crossWeave' ? props.crossWeaveProps : undefined;
  const peyoteProps = props.technique === 'peyote' ? props.peyoteProps : undefined;

  return (
    <header className={`header${weaveMode ? ' header--weave' : ''}`}>
      <nav className="header__nav">
        <TechniqueMenu technique={technique} onTechniqueChange={onTechniqueChange} weaveMode={weaveMode} />

        {/* Вход в режим плетения — рядом с выбором техники, а не среди иконок
            панелей справа. Причины: это не панель, а мод (техника отвечает
            «что плету», режим — «рисую схему или отмечаю сплетённое»);
            соседи справа (референс, подвески, сетка) в режиме скрываются, и
            кнопка оставалась там одна, съезжая по строке при каждом входе и
            выходе — искать «выход» приходилось на новом месте. Левый край
            хедера одинаков в обоих режимах. Отдельной кнопкой, а не пунктом
            TechniqueMenu: тот попап — выбор одной из техник, тумблер внутри
            него читался бы как ещё одна техника. Скрыта для Peyote целиком —
            эта техника не поддерживает режим плетения (см. spec.md,
            «Peyote»): нет естественного понятия «сегмент», как у крестика/
            силянки. */}
        {technique !== 'peyote' && (
          <>
            <div className="header__divider" />
            <button
              onClick={onToggleWeaveMode}
              className={`tool-btn tool-btn--lg ${weaveMode ? 'tool-btn--active' : ''}`}
              title={weaveMode ? 'Exit weave mode' : 'Weave mode: mark your progress as you go'}
              aria-pressed={weaveMode}
            >
              <ListChecks size={20} />
            </button>
          </>
        )}

        <div className="header__divider" />

        {/* Палитра и инструменты рисования в режиме плетения не показываются:
            это отдельный мод, в нём холст ничего не рисует. */}
        {!weaveMode && (
          <PaletteWidget
            palette={palette}
            onPaletteChange={onPaletteChange}
            activeColor={activeColor}
            setActiveColor={setActiveColor}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            recentColors={recentColors}
            commitRecentColor={commitRecentColor}
          />
        )}

        {weaveMode && <WeaveControls {...weaveControls} technique={technique} />}

        {!weaveMode && <div className="header__divider header__divider--palette-tools" />}

        {!weaveMode && (
          <HeaderToolGroup
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            threads={threads}
            onClearAllThreads={onClearAllThreads}
            silyankaProps={silyankaProps}
            crossWeaveProps={crossWeaveProps}
            peyoteProps={peyoteProps}
          />
        )}

        <div className="header__divider header__divider--zoom-adjacent" />

        {/* Без grid-controls--stacked: этот класс задаёт .grid-controls__label
            { min-width: 4.4em } — выравнивание нужно было для пары Width/Height,
            но та переехала в GridSidebar, а для одиночного Zoom этот min-width
            просто раздувал подпись "ZOOM" шире нужного.
            grid-controls--vertical-zoom: подпись "ZOOM" сверху, ряд −/значение/+
            под ней — вместо бок о бок, экономит горизонтальное место и читается
            как единый вертикальный блок, а не растянутая строка. */}
        <div className="grid-controls grid-controls--collapsible-mobile grid-controls--vertical-zoom">
          <Stepper
            label="Zoom"
            value={`${Math.round(zoom * 100)}%`}
            onDelta={(s) => onZoomChange(s * APP_CONSTRAINTS.zoomStep)}
            onSet={onSetZoom ? (v) => onSetZoom(v / 100) : undefined}
            inputValue={Math.round(zoom * 100)}
            min={APP_CONSTRAINTS.minZoom * 100}
            max={APP_CONSTRAINTS.maxZoom * 100}
          />
        </div>

        <HeaderOverflowMenu
          zoom={zoom}
          onZoomChange={onZoomChange}
          onSetZoom={onSetZoom}
          onSaveProject={onSaveProject}
          onShareProject={onShareProject}
          loadInputRef={loadInputRef}
          weaveMode={weaveMode}
          technique={technique}
          weaveControls={weaveControls}
        />

        {/* header__divider--before-end: на ≤767.98px в режиме плетения весь
            header__end-group скрыт целиком (см. .header--weave в Header.css) —
            без класса этот разделитель повисал бы одиноким штрихом в конце
            строки, ни от чего не отделяя. */}
        <div className="header__divider header__divider--before-end" />

        <HeaderEndGroup
          weaveMode={weaveMode}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onClearAll={onClearAll}
          onSaveProject={onSaveProject}
          onShareProject={onShareProject}
          loadInputRef={loadInputRef}
          onLoadInputChange={handleLoadInputChange}
          referenceWindowOpen={referenceWindowOpen}
          onToggleReferenceWindow={onToggleReferenceWindow}
          silyankaProps={silyankaProps}
          gridSidebarOpen={gridSidebarOpen}
          onToggleGridSidebar={onToggleGridSidebar}
        />
      </nav>
    </header>
  );
};
