import { useEffect, useRef, useState } from 'react';
import {
  MoreHorizontal, FlipHorizontal, PaintBucket, Stamp, Pencil,
  ArrowUpToLine, ArrowDownToLine, X, Image, Download, Upload, Share2, Palette,
  Check, SlidersHorizontal, Trash2,
} from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import './Header.css';
import {
  EraserIcon, EyedropperIcon, PendantIcon, SilyankaIcon, CrossWeaveIcon, MakeSymmetricIcon, ThreadIcon,
} from './icons';
import { Stepper } from '../../common/Stepper';
import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';
import { StampAnchorEdge } from '../../../utils/stamp';
import { APP_CONSTRAINTS, BEAD_THEME, THREAD_STRAND_DEFAULT_COLORS } from '../../../config/theme';
import { ThreadStyleFields } from './ThreadStyleFields';


export type Technique = 'silyanka' | 'crossWeave';

interface SharedHeaderProps {
  palette: string[];
  onPaletteChange: (palette: string[]) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  recentColors: string[];
  commitRecentColor: (color: string) => void;
  onClearAll: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onShareProject: () => void;
  zoom: number;
  onZoomChange: (delta: number) => void;
  onSetZoom?: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  technique: Technique;
  onTechniqueChange: (technique: Technique) => void;
  referenceWindowOpen: boolean;
  onToggleReferenceWindow: () => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  // Технико-независимая панель «Сетка» (Width/Height/Spacing/Edges/Edge
  // Extension/Bottom Chain) — см. src/components/Sidebar/GridSidebar.tsx.
  gridSidebarOpen: boolean;
  onToggleGridSidebar: () => void;
}

interface SilyankaHeaderProps {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  hasStampPattern: boolean;
  stampAnchorEdge: StampAnchorEdge;
  onToggleStampAnchorEdge: () => void;
  onCancelStampPattern: () => void;
  // «Кисть» нитки — цвет/прозрачность, которыми ляжет следующая нитка
  // (см. ThreadStyleButton ниже, useSilyankaProject.ts).
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}

interface CrossWeaveHeaderProps {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
  // Крестик плетётся двумя нитками одновременно (силянка — одной, см.
  // spec.md, «Нитка») — выбор, какой из двух метить новые нитки.
  activeThreadStrand: 1 | 2;
  onSelectThreadStrand: (strand: 1 | 2) => void;
  // «Кисть» ТЕКУЩЕЙ выбранной нити (activeThreadStrand) — своя пара цвета/
  // прозрачности на каждую из двух ниток (см. useCrossWeaveProject.ts).
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}

type HeaderProps = SharedHeaderProps & (
  | { technique: 'silyanka'; silyankaProps: SilyankaHeaderProps; crossWeaveProps?: undefined }
  | { technique: 'crossWeave'; crossWeaveProps: CrossWeaveHeaderProps; silyankaProps?: undefined }
);

// Единая кнопка Mirror Mode раскрывает мини-попап с двумя связанными
// зеркальными операциями — переключателем режима и одноразовым действием
// "Сделать симметричным" — вместо отдельной иконки для второго действия
// (та же логика открытия/закрытия по клику снаружи и Escape, что и у
// header__overflow ниже).
const MirrorMenu = ({
  mirrorMode, setMirrorMode, onMakeSymmetric, canMakeSymmetric,
}: {
  mirrorMode: boolean;
  setMirrorMode: (v: boolean) => void;
  onMakeSymmetric: () => void;
  canMakeSymmetric: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="mirror-menu" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`tool-btn ${mirrorMode ? 'tool-btn--active' : ''}`}
        title="Mirror Mode (M)"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FlipHorizontal size={14} />
      </button>

      {open && (
        <div className="mirror-menu__panel" role="menu">
          <button
            onClick={() => setMirrorMode(!mirrorMode)}
            className={`mirror-menu__item ${mirrorMode ? 'mirror-menu__item--active' : ''}`}
            role="menuitemcheckbox"
            aria-checked={mirrorMode}
          >
            <FlipHorizontal size={12} className="mirror-menu__item-icon" />
            <span className="mirror-menu__item-label">Mirror Mode</span>
            {mirrorMode && <Check size={12} className="mirror-menu__item-check" />}
          </button>
          <button
            onClick={() => { onMakeSymmetric(); setOpen(false); }}
            className="mirror-menu__item"
            disabled={!canMakeSymmetric}
            title="Fills the missing mirrored half of the current design"
          >
            <MakeSymmetricIcon size={12} className="mirror-menu__item-icon" />
            <span className="mirror-menu__item-label">Make symmetric</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Кнопка «Нитка» у крестика — не простой тоггл, а мини-попап с выбором одной
// из двух нитей (крестик физически плетётся двумя нитками одновременно,
// см. spec.md, «Нитка»): клик по пункту сразу и выбирает нить, и включает
// инструмент. Та же логика открытия/закрытия, что у MirrorMenu.
const ThreadMenu = ({
  activeTool, setActiveTool, activeThreadStrand, onSelectThreadStrand, threads, onClearAllThreads,
  activeThreadColor, activeThreadOpacity, onThreadColorChange, onThreadOpacityChange,
}: {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  activeThreadStrand: 1 | 2;
  onSelectThreadStrand: (strand: 1 | 2) => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectStrand = (strand: 1 | 2) => {
    onSelectThreadStrand(strand);
    setActiveTool('thread');
    setOpen(false);
  };

  return (
    <div className="mirror-menu" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`tool-btn ${activeTool === 'thread' ? 'tool-btn--active' : ''}`}
        title="Thread (1/2)"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ThreadIcon size={14} />
      </button>

      {activeTool === 'thread' && threads.length > 0 && (
        <button
          onClick={onClearAllThreads}
          className="tool-btn-group__badge tool-btn-group__badge--cancel"
          title="Clear all threads"
        >
          <X size={9} />
        </button>
      )}

      {open && (
        <div className="mirror-menu__panel" role="menu">
          {([1, 2] as const).map((strand) => (
            <button
              key={strand}
              onClick={() => selectStrand(strand)}
              className={`mirror-menu__item ${activeTool === 'thread' && activeThreadStrand === strand ? 'mirror-menu__item--active' : ''}`}
              role="menuitemradio"
              aria-checked={activeTool === 'thread' && activeThreadStrand === strand}
              title={`Thread ${strand} (${strand})`}
            >
              <span
                className="mirror-menu__item-icon"
                style={{
                  width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                  background: THREAD_STRAND_DEFAULT_COLORS[strand],
                }}
              />
              <span className="mirror-menu__item-label">Thread {strand}</span>
              {activeTool === 'thread' && activeThreadStrand === strand && (
                <Check size={12} className="mirror-menu__item-check" />
              )}
            </button>
          ))}
          <div className="mirror-menu__divider" />
          <ThreadStyleFields
            color={activeThreadColor}
            opacity={activeThreadOpacity}
            onColorChange={onThreadColorChange}
            onOpacityChange={onThreadOpacityChange}
          />
        </div>
      )}
    </div>
  );
};

// Кнопка «Нитка» у силянки (простой тоггл, в отличие от ThreadMenu у
// crossWeave — там уже попап на выбор нити) — добавляем второй маленький
// бейдж-триггер (цветной кружок, противоположный угол от «очистить все»),
// открывающий тот же ThreadStyleFields, что и у crossWeave. Та же логика
// открытия/закрытия по клику снаружи и Escape, что у MirrorMenu/ThreadMenu.
const ThreadStyleButton = ({
  activeTool, setActiveTool, threads, onClearAllThreads,
  activeThreadColor, activeThreadOpacity, onThreadColorChange, onThreadOpacityChange,
}: {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="tool-btn-group" ref={ref}>
      <button
        onClick={() => setActiveTool(activeTool === 'thread' ? 'pencil' : 'thread')}
        className={`tool-btn ${activeTool === 'thread' ? 'tool-btn--active' : ''}`}
        title="Thread (T)"
        aria-pressed={activeTool === 'thread'}
      >
        <ThreadIcon size={14} />
      </button>

      {activeTool === 'thread' && threads.length > 0 && (
        <button
          onClick={onClearAllThreads}
          className="tool-btn-group__badge tool-btn-group__badge--cancel"
          title="Clear all threads"
        >
          <X size={9} />
        </button>
      )}

      {activeTool === 'thread' && (
        <button
          ref={triggerRef}
          onClick={() => setOpen(o => !o)}
          className="tool-btn-group__badge tool-btn-group__badge--swatch"
          style={{ '--color-value': activeThreadColor } as React.CSSProperties}
          title="Thread color"
          aria-haspopup="menu"
          aria-expanded={open}
        />
      )}

      {open && (
        <div className="mirror-menu__panel" role="menu">
          <ThreadStyleFields
            color={activeThreadColor}
            opacity={activeThreadOpacity}
            onColorChange={onThreadColorChange}
            onOpacityChange={onThreadOpacityChange}
          />
        </div>
      )}
    </div>
  );
};

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
  } = props;

  const [hasEyeDropper] = useState(() => 'EyeDropper' in window);
  const [pickerOpen, setPickerOpen] = useState(false);
  const customTriggerRef = useRef<HTMLButtonElement>(null);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement>(null);

  // На ≤479.98px палитра прячется под иконку-триггер и раскрывается попапом
  // (см. .palette-widget в Header.css) — тот же паттерн клика-снаружи/Escape,
  // что уже используется для header__overflow.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteWidgetRef = useRef<HTMLDivElement>(null);
  const paletteTriggerRef = useRef<HTMLButtonElement>(null);

  const loadInputRef = useRef<HTMLInputElement>(null);
  const handleLoadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onLoadProject(file);
  };

  useEffect(() => {
    if (!overflowOpen) return;
    const onDown = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverflowOpen(false);
        overflowTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [overflowOpen]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onDown = (e: MouseEvent) => {
      if (paletteWidgetRef.current && !paletteWidgetRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        paletteTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [paletteOpen]);

  const isCustomColor = !palette.includes(activeColor);

  // Ластик не работает с цветом, поэтому выбор цвета выводит из него;
  // остальные инструменты (заливка, штамп) цвет используют — их выбор не сбрасывает.
  const selectColor = (color: string) => {
    setActiveColor(color);
    if (activeTool === 'eraser') setActiveTool('pencil');
  };

  const handleEyeDropper = async () => {
    try {
      const dropper = new (window as any).EyeDropper();
      const { sRGBHex } = await dropper.open();
      selectColor(sRGBHex);
      commitRecentColor(sRGBHex);
    } catch {
      // cancelled
    }
  };

  const handlePickerConfirm = (color: string) => {
    selectColor(color);
    commitRecentColor(color);
    setPickerOpen(false);
  };

  const silyankaProps = props.technique === 'silyanka' ? props.silyankaProps : undefined;
  const crossWeaveProps = props.technique === 'crossWeave' ? props.crossWeaveProps : undefined;

  return (
    <header className="header">
      <nav className="header__nav">
        <div className="technique-switch" role="group" aria-label="Switch technique">
          <button
            onClick={() => onTechniqueChange('silyanka')}
            className={`technique-switch__btn ${technique === 'silyanka' ? 'technique-switch__btn--active' : ''}`}
            title="Traditional Ukrainian beadwork"
            aria-pressed={technique === 'silyanka'}
          >
            <SilyankaIcon size={25} />
            <span>sylianka</span>
          </button>
          <button
            onClick={() => onTechniqueChange('crossWeave')}
            className={`technique-switch__btn ${technique === 'crossWeave' ? 'technique-switch__btn--active' : ''}`}
            title="Right-Angle Weave"
            aria-pressed={technique === 'crossWeave'}
          >
            <CrossWeaveIcon size={25} />
            <span>RAW</span>
          </button>
        </div>

        <div className="header__divider" />

        <div className={`palette-widget${paletteOpen ? ' palette-widget--open' : ''}`} ref={paletteWidgetRef}>
          {/* Виден только на ≤479.98px — на более широких экранах палитра
              и так помещается в строку хедера (см. .palette-widget__trigger
              в Header.css). */}
          <button
            ref={paletteTriggerRef}
            type="button"
            className="palette-widget__trigger"
            onClick={() => setPaletteOpen(o => !o)}
            title="Palette"
            aria-haspopup="dialog"
            aria-expanded={paletteOpen}
          >
            <Palette size={14} />
            <span className="palette-widget__trigger-swatch" style={{ '--color-value': activeColor } as React.CSSProperties} />
          </button>

          <div className="palette">
            <div className="palette__grid">
              <div className="palette__row">
                {palette.map((color) => (
                  <button
                    key={color}
                    onClick={() => selectColor(color)}
                    className={`palette__color ${activeTool !== 'eraser' && activeColor === color ? 'palette__color--active' : ''}`}
                    style={{ '--color-value': color } as React.CSSProperties}
                  />
                ))}
              </div>

              <div className="palette__row" role="group" aria-label="Recent colors">
                {Array.from({ length: BEAD_THEME.ui.recentColorsLimit }).map((_, i) => {
                  const color = recentColors[i];
                  if (!color) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="palette__recent-slot palette__recent-slot--empty"
                        aria-hidden="true"
                      />
                    );
                  }
                  const isActive = activeTool !== 'eraser' && activeColor === color;
                  return (
                    <button
                      key={color}
                      onClick={() => selectColor(color)}
                      className={`palette__color ${isActive ? 'palette__color--active' : ''}`}
                      style={{ '--color-value': color } as React.CSSProperties}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>

            {/* Кастомный пикер + пипетка: на ≤767.98px становятся вертикальной
                парой (см. .palette__extra в Header.css) вместо бок о бок —
                экономит горизонтальное место тем же приёмом, что палитра уже
                применяет к base/recent рядам. display:contents на более широких
                экранах "растворяет" обёртку — оба элемента остаются прямыми
                flex-детьми .palette, как раньше. */}
            <div className="palette__extra">
              <div className="palette__custom">
                <button
                  ref={customTriggerRef}
                  className="palette__color palette__color--custom-trigger"
                  onClick={() => setPickerOpen(o => !o)}
                  title="Custom color"
                  aria-haspopup="dialog"
                  aria-expanded={pickerOpen}
                  style={{ background: 'conic-gradient(from 0deg, #ff4757, #ff9f43, #ffd32a, #2ed573, #22d3ee, #1e90ff, #e879f9, #ff4757)' }}
                />
                {pickerOpen && (
                  <>
                    {/* На ≤767.98px ColorPicker анкерится к верху viewport, под
                        шапкой (см. ColorPicker.css), а не к этой маленькой кнопке —
                        без затемнения фона попап выглядел как случайно "уехавший"
                        прямоугольник, не читался как модалка.
                        На десктопе/планшете подложка невидима (см. CSS). */}
                    <div className="color-picker-backdrop" onClick={() => setPickerOpen(false)} />
                    <ColorPicker
                      initialColor={isCustomColor ? activeColor : '#ffffff'}
                      onConfirm={handlePickerConfirm}
                      onClose={() => setPickerOpen(false)}
                      onReplacePalette={onPaletteChange}
                      triggerRef={customTriggerRef}
                    />
                  </>
                )}
              </div>

              {hasEyeDropper && (
                <button
                  className="palette__eyedropper"
                  onClick={handleEyeDropper}
                  title="Pick color from screen"
                >
                  <EyedropperIcon size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="header__divider header__divider--palette-tools" />

        <div className="tool-group">
          <button
            onClick={() => setActiveTool('pencil')}
            className={`tool-btn ${activeTool === 'pencil' ? 'tool-btn--active' : ''}`}
            title="Pencil (B)"
            aria-pressed={activeTool === 'pencil'}
          >
            <Pencil size={14} />
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'eraser' ? 'pencil' : 'eraser')}
            className={`tool-btn ${activeTool === 'eraser' ? 'tool-btn--active' : ''}`}
            title="Eraser (E)"
          >
            <EraserIcon size={14} />
          </button>

          {silyankaProps && (
            <ThreadStyleButton
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              threads={threads}
              onClearAllThreads={onClearAllThreads}
              activeThreadColor={silyankaProps.activeThreadColor}
              activeThreadOpacity={silyankaProps.activeThreadOpacity}
              onThreadColorChange={silyankaProps.onThreadColorChange}
              onThreadOpacityChange={silyankaProps.onThreadOpacityChange}
            />
          )}

          {crossWeaveProps && (
            <ThreadMenu
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              activeThreadStrand={crossWeaveProps.activeThreadStrand}
              onSelectThreadStrand={crossWeaveProps.onSelectThreadStrand}
              threads={threads}
              onClearAllThreads={onClearAllThreads}
              activeThreadColor={crossWeaveProps.activeThreadColor}
              activeThreadOpacity={crossWeaveProps.activeThreadOpacity}
              onThreadColorChange={crossWeaveProps.onThreadColorChange}
              onThreadOpacityChange={crossWeaveProps.onThreadOpacityChange}
            />
          )}

          {crossWeaveProps && (
            <>
              <button
                onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
                className={`tool-btn ${activeTool === 'flood-fill' ? 'tool-btn--active' : ''}`}
                title="Flood Fill (G)"
                aria-pressed={activeTool === 'flood-fill'}
              >
                <PaintBucket size={14} />
              </button>

              <MirrorMenu
                mirrorMode={crossWeaveProps.mirrorMode}
                setMirrorMode={crossWeaveProps.setMirrorMode}
                onMakeSymmetric={crossWeaveProps.onMakeSymmetric}
                canMakeSymmetric={crossWeaveProps.canMakeSymmetric}
              />
            </>
          )}

          {silyankaProps && (
            <>
              <button
                onClick={() => setActiveTool(activeTool === 'flood-fill' ? 'pencil' : 'flood-fill')}
                className={`tool-btn ${activeTool === 'flood-fill' ? 'tool-btn--active' : ''}`}
                title="Flood Fill (G)"
                aria-pressed={activeTool === 'flood-fill'}
              >
                <PaintBucket size={14} />
              </button>

              <div className="tool-btn-group">
                <button
                  onClick={() => setActiveTool(activeTool === 'stamp' ? 'pencil' : 'stamp')}
                  className={`tool-btn ${activeTool === 'stamp' ? 'tool-btn--active' : ''}`}
                  title="Stamp (S)"
                  aria-pressed={activeTool === 'stamp'}
                >
                  <Stamp size={14} />
                </button>

                {activeTool === 'stamp' && silyankaProps.hasStampPattern && (
                  <>
                    <button
                      onClick={silyankaProps.onToggleStampAnchorEdge}
                      className="tool-btn-group__badge"
                      title={silyankaProps.stampAnchorEdge === 'top'
                        ? 'Stamp anchor point: top (click or Shift to switch to bottom, Esc/Alt to reset stamp)'
                        : 'Stamp anchor point: bottom (click or Shift to switch to top, Esc/Alt to reset stamp)'}
                      aria-pressed={silyankaProps.stampAnchorEdge === 'bottom'}
                    >
                      {silyankaProps.stampAnchorEdge === 'top'
                        ? <ArrowUpToLine size={9} />
                        : <ArrowDownToLine size={9} />}
                    </button>

                    {/* Тач-эквивалент Escape/Alt — на тач-экране нет клавиатуры,
                        так что сброс захваченного узора нужен и кнопкой. */}
                    <button
                      onClick={silyankaProps.onCancelStampPattern}
                      className="tool-btn-group__badge tool-btn-group__badge--cancel"
                      title="Reset stamp pattern (Esc/Alt)"
                    >
                      <X size={9} />
                    </button>
                  </>
                )}
              </div>

              <MirrorMenu
                mirrorMode={silyankaProps.mirrorMode}
                setMirrorMode={silyankaProps.setMirrorMode}
                onMakeSymmetric={silyankaProps.onMakeSymmetric}
                canMakeSymmetric={silyankaProps.canMakeSymmetric}
              />
            </>
          )}
        </div>

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

        {/* На ≤767.98px сюда переезжают Zoom/Save-Load-Share (см.
            .header__overflow-mobile-extra в Header.css) — Width/Height/Spacing/Edges
            переехали в панель «Сетка» (GridSidebar) и здесь больше не дублируются. */}
        <div className="header__overflow" ref={overflowRef}>
          <button
            ref={overflowTriggerRef}
            type="button"
            className="header__overflow-trigger"
            aria-label="More settings"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen(o => !o)}
          >
            <MoreHorizontal size={18} />
          </button>
          {overflowOpen && (
            <div className="header__overflow-panel" role="menu">
              {/* ≤767.98px: дубли Zoom/Save-Load-Share, скрытых из основной
                  строки хедера на этом брейкпоинте (см. Header.css). На более широких
                  экранах эти оригиналы и так видны в строке — блок скрыт. */}
              <div className="header__overflow-mobile-extra">
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
                <div className="header__overflow-row">
                  <span className="header__overflow-label">Save / Load / Share</span>
                  <div className="grid-controls__actions">
                    <button onClick={onSaveProject} className="grid-controls__btn" title="Save project to file">
                      <Download size={14} />
                    </button>
                    <button onClick={() => loadInputRef.current?.click()} className="grid-controls__btn" title="Load project from file">
                      <Upload size={14} />
                    </button>
                    <button onClick={onShareProject} className="grid-controls__btn" title="Copy share link">
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="header__divider" />

        {/* На ≤767.98px тулбар Undo/Redo/Clear и иконки Reference/Pendant/
            Grid Settings не помещаются в одну строку хедера и обрезаются за
            краем экрана (нет ни переноса, ни скролла у .header__nav) — эта
            обёртка сворачивает их в 2 внутренних ряда (тот же приём, что уже
            даёт двухрядность .tool-group), не трогая раскладку на десктопе/
            планшете (display: contents там "растворяет" обёртку). */}
        <div className="header__end-group">
          <div className="grid-controls">
            <div className="grid-controls__toolbar">
              <div className="grid-controls__actions-row">
                <button onClick={onUndo} disabled={!canUndo} className="grid-controls__btn" title="Undo (Ctrl+Z)">↩</button>
                <button onClick={onRedo} disabled={!canRedo} className="grid-controls__btn" title="Redo (Ctrl+Y)">↪</button>
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
              </div>
              <input
                ref={loadInputRef}
                type="file"
                accept="application/json"
                className="header__file-input"
                onChange={handleLoadInputChange}
              />
            </div>
          </div>

          <div className="header__divider header__divider--end-adjacent" />

          {/* Стоит отдельно от .tool-group: та на ≤1024px зафиксирована по ширине
              и переносится в 2 строки (3+3 silyanka, 3+2 crossWeave) — седьмой/
              шестой элемент внутри неё проваливался бы в одинокую 3-ю строку. */}
          <div className="header__end-icons">
            <button
              onClick={onToggleReferenceWindow}
              className={`tool-btn ${referenceWindowOpen ? 'tool-btn--active' : ''}`}
              title="Reference image"
              aria-pressed={referenceWindowOpen}
            >
              <Image size={14} />
            </button>

            {silyankaProps && (
              <button
                onClick={silyankaProps.onToggleSidebar}
                className={`tool-btn tool-btn--lg ${silyankaProps.sidebarOpen ? 'tool-btn--active' : ''}`}
                title="Pendant library"
                aria-pressed={silyankaProps.sidebarOpen}
              >
                <PendantIcon size={22} />
              </button>
            )}

            <button
              onClick={onToggleGridSidebar}
              className={`tool-btn tool-btn--lg ${gridSidebarOpen ? 'tool-btn--active' : ''}`}
              title="Grid settings"
              aria-pressed={gridSidebarOpen}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};
