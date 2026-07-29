import { useEffect, useRef, useState } from 'react';
import { Wand2, Lock, Unlock, Pipette, RefreshCw } from 'lucide-react';
import './ColorPicker.css';
import { generatePaletteFromColormind } from '../../../utils/colormindApi';
import { useSvHuePicker } from '../../../hooks/useSvHuePicker';

type Mode = 'pick' | 'generate';

// Сгенерированные 2-3 цвета сами по себе — слишком скудная палитра для рисования;
// добиваем недостающие слоты до PALETTE_TARGET_SIZE базовыми цветами.
const BASIC_FALLBACK_COLORS = ['#ffffff', '#ff4757', '#000000'];
const PALETTE_TARGET_SIZE = 5;

interface Props {
  initialColor: string;
  onConfirm: (color: string) => void;
  onClose: () => void;
  onReplacePalette: (colors: string[]) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const ColorPicker = ({ initialColor, onConfirm, onClose, onReplacePalette, triggerRef }: Props) => {
  const [mode, setMode] = useState<Mode>('pick');
  const mainPicker = useSvHuePicker(initialColor);

  const [genPalette, setGenPalette] = useState<string[]>([]);
  const [genCount, setGenCount] = useState<2 | 3 | 5>(5);
  const [genSelected, setGenSelected] = useState<Set<number>>(new Set());
  const [genLocked, setGenLocked] = useState<(string | null)[]>(Array(PALETTE_TARGET_SIZE).fill(null));
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [openColorIndex, setOpenColorIndex] = useState<number | null>(null);
  const insertPicker = useSvHuePicker('#ffffff');

  const visiblePalette = genPalette.slice(0, genCount);

  const rootRef = useRef<HTMLDivElement>(null);
  const insertPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && mode === 'pick') onConfirm(mainPicker.hex);
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [mainPicker.hex, mode, onClose, onConfirm, triggerRef]);

  // Мини-пикер вставки своего цвета — отдельный уровень поверх основного попапа:
  // закрывается по клику вне себя/Escape независимо от всего ColorPicker (не закрывая его).
  useEffect(() => {
    if (openColorIndex === null) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (insertPopoverRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.('.color-picker__generate-swatch-tools')) return;
      setOpenColorIndex(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpenColorIndex(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [openColorIndex]);

  const generate = async (count: 2 | 3 | 5) => {
    setGenCount(count);
    setGenLoading(true);
    setGenError(null);
    setGenSelected(new Set());
    try {
      const colors = await generatePaletteFromColormind(genLocked);
      // Colormind должен вернуть закреплённые слоты без изменений, но подстраховываемся
      // от погрешности округления — используем исходный hex, введённый пользователем.
      const merged = colors.map((color, i) => genLocked[i] ?? color);
      setGenPalette(merged);
      setGenSelected(new Set(Array.from({ length: count }, (_, i) => i)));
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate palette');
    } finally {
      setGenLoading(false);
    }
  };

  const regenerate = () => generate(genCount);

  const toggleGenColor = (index: number) => {
    setGenSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleGenLock = (index: number) => {
    setGenLocked(prev => {
      const next = [...prev];
      next[index] = next[index] ? null : genPalette[index] ?? null;
      return next;
    });
  };

  const setGenCustomColor = (index: number, hex: string) => {
    setGenPalette(prev => {
      const next = [...prev];
      next[index] = hex;
      return next;
    });
    setGenLocked(prev => {
      const next = [...prev];
      next[index] = hex;
      return next;
    });
    setGenSelected(prev => new Set(prev).add(index));
  };

  const toggleInsertPicker = (index: number) => {
    if (openColorIndex === index) {
      setOpenColorIndex(null);
      return;
    }
    insertPicker.setFromHex(genPalette[index] ?? '#ffffff');
    setOpenColorIndex(index);
  };

  const applyInsertColor = () => {
    if (openColorIndex === null) return;
    setGenCustomColor(openColorIndex, insertPicker.hex);
    setOpenColorIndex(null);
  };

  const handleReplacePalette = () => {
    const colors = Array.from(genSelected).sort((a, b) => a - b).map(i => genPalette[i]);
    if (colors.length === 0) return;
    const fillers = BASIC_FALLBACK_COLORS.slice(0, Math.max(0, PALETTE_TARGET_SIZE - colors.length));
    onReplacePalette([...colors, ...fillers]);
    onClose();
  };

  const hueColor = `hsl(${mainPicker.hsv.h}, 100%, 50%)`;

  return (
    <div className={`color-picker ${mode === 'generate' ? 'color-picker--generate' : ''}`} ref={rootRef} role="dialog" aria-label="Pick a color">
      <div className="color-picker__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'pick'}
          className={`color-picker__tab ${mode === 'pick' ? 'color-picker__tab--active' : ''}`}
          onClick={() => setMode('pick')}
        >
          Pick
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'generate'}
          className={`color-picker__tab ${mode === 'generate' ? 'color-picker__tab--active' : ''}`}
          onClick={() => setMode('generate')}
        >
          <Wand2 size={12} />
          Generate
        </button>
      </div>

      {mode === 'pick' ? (
        <>
          <div
            ref={mainPicker.svRef}
            className="color-picker__sv"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
            onPointerDown={mainPicker.startSvDrag}
            onPointerMove={mainPicker.moveSv}
          >
            <div
              className="color-picker__sv-cursor"
              style={{ left: `${mainPicker.hsv.s * 100}%`, top: `${(1 - mainPicker.hsv.v) * 100}%`, background: mainPicker.hex }}
            />
          </div>

          <div
            ref={mainPicker.hueRef}
            className="color-picker__hue"
            onPointerDown={mainPicker.startHueDrag}
            onPointerMove={mainPicker.moveHue}
          >
            <div className="color-picker__hue-cursor" style={{ left: `${(mainPicker.hsv.h / 360) * 100}%`, background: hueColor }} />
          </div>

          <div className="color-picker__row">
            <div className="color-picker__preview" style={{ background: mainPicker.hex }} aria-hidden="true" />
            <input
              className="color-picker__hex"
              value={mainPicker.hexInput}
              onChange={e => mainPicker.onHexChange(e.target.value)}
              spellCheck={false}
              maxLength={7}
              aria-label="Hex value"
            />
          </div>

          <button
            type="button"
            className="color-picker__confirm"
            onClick={() => onConfirm(mainPicker.hex)}
          >
            Confirm
          </button>
        </>
      ) : (
        <div className="color-picker__generate">
          <div className="color-picker__generate-buttons">
            <button type="button" onClick={() => generate(2)} disabled={genLoading} className="color-picker__generate-btn">2</button>
            <button type="button" onClick={() => generate(3)} disabled={genLoading} className="color-picker__generate-btn">3</button>
            <button type="button" onClick={() => generate(5)} disabled={genLoading} className="color-picker__generate-btn">5</button>
            {genPalette.length > 0 && (
              <button
                type="button"
                onClick={regenerate}
                disabled={genLoading}
                className="color-picker__generate-btn color-picker__generate-btn--icon"
                title="Regenerate (keeps locked colors)"
                aria-label="Regenerate"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          {genError && <div className="color-picker__generate-error">{genError}</div>}

          {genLoading && <div className="color-picker__generate-loading">Generating…</div>}

          {visiblePalette.length > 0 && !genLoading && (
            <>
              <div className="color-picker__generate-swatches">
                {visiblePalette.map((color, i) => {
                  const locked = genLocked[i];
                  return (
                    <div key={i} className="color-picker__generate-swatch-item">
                      <button
                        type="button"
                        onClick={() => toggleGenColor(i)}
                        className={`color-picker__generate-swatch ${genSelected.has(i) ? 'color-picker__generate-swatch--selected' : ''} ${locked ? 'color-picker__generate-swatch--locked' : ''}`}
                        style={{ '--color-value': color } as React.CSSProperties}
                        title={color}
                      />

                      <div className="color-picker__generate-swatch-tools">
                        <button
                          type="button"
                          onClick={() => toggleGenLock(i)}
                          className={`color-picker__generate-swatch-tool ${locked ? 'color-picker__generate-swatch-tool--active' : ''}`}
                          title={locked ? 'Unlock color' : 'Lock color'}
                          aria-label={locked ? 'Unlock color' : 'Lock color'}
                        >
                          {locked ? <Lock size={10} /> : <Unlock size={10} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleInsertPicker(i)}
                          className={`color-picker__generate-swatch-tool ${openColorIndex === i ? 'color-picker__generate-swatch-tool--active' : ''}`}
                          title="Insert your own color"
                          aria-label="Insert your own color"
                        >
                          <Pipette size={10} />
                        </button>
                      </div>

                      {openColorIndex === i && (
                        <div className="color-picker__insert-popover" ref={insertPopoverRef}>
                          <div
                            ref={insertPicker.svRef}
                            className="color-picker__sv color-picker__sv--mini"
                            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${insertPicker.hsv.h}, 100%, 50%))` }}
                            onPointerDown={insertPicker.startSvDrag}
                            onPointerMove={insertPicker.moveSv}
                          >
                            <div
                              className="color-picker__sv-cursor"
                              style={{ left: `${insertPicker.hsv.s * 100}%`, top: `${(1 - insertPicker.hsv.v) * 100}%`, background: insertPicker.hex }}
                            />
                          </div>

                          <div
                            ref={insertPicker.hueRef}
                            className="color-picker__hue color-picker__hue--mini"
                            onPointerDown={insertPicker.startHueDrag}
                            onPointerMove={insertPicker.moveHue}
                          >
                            <div
                              className="color-picker__hue-cursor"
                              style={{ left: `${(insertPicker.hsv.h / 360) * 100}%`, background: `hsl(${insertPicker.hsv.h}, 100%, 50%)` }}
                            />
                          </div>

                          <div className="color-picker__row">
                            <div className="color-picker__preview" style={{ background: insertPicker.hex }} aria-hidden="true" />
                            <input
                              className="color-picker__hex"
                              value={insertPicker.hexInput}
                              onChange={e => insertPicker.onHexChange(e.target.value)}
                              spellCheck={false}
                              maxLength={7}
                              aria-label="Hex value"
                            />
                          </div>

                          <button type="button" className="color-picker__confirm" onClick={applyInsertColor}>
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="color-picker__confirm"
                onClick={handleReplacePalette}
                disabled={genSelected.size === 0}
              >
                Replace Palette ({Math.max(genSelected.size, PALETTE_TARGET_SIZE)})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
