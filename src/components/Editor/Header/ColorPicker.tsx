import { useEffect, useRef, useState } from 'react';
import { Wand2, Lock, Unlock, Pipette, RefreshCw } from 'lucide-react';
import './ColorPicker.css';
import { clamp } from '../../../utils/clamp';
import { generatePaletteFromColormind } from '../../../utils/colormindApi';

type Mode = 'pick' | 'generate';

// Сгенерированные 2-3 цвета сами по себе — слишком скудная палитра для рисования;
// добиваем недостающие слоты до PALETTE_TARGET_SIZE базовыми цветами.
const BASIC_FALLBACK_COLORS = ['#ffffff', '#ff4757', '#000000'];
const PALETTE_TARGET_SIZE = 5;

type HSV = { h: number; s: number; v: number };

const HEX_RE = /^#?([a-f0-9]{6})$/i;

const hexToRgb = (hex: string) => {
  const m = HEX_RE.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(c => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('');

const rgbToHsv = (r: number, g: number, b: number): HSV => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
};

const hsvToHex = ({ h, s, v }: HSV) => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
};

const hexToHsv = (hex: string): HSV => {
  const rgb = hexToRgb(hex) ?? { r: 255, g: 255, b: 255 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
};

interface Props {
  initialColor: string;
  onConfirm: (color: string) => void;
  onClose: () => void;
  onReplacePalette: (colors: string[]) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const ColorPicker = ({ initialColor, onConfirm, onClose, onReplacePalette, triggerRef }: Props) => {
  const [mode, setMode] = useState<Mode>('pick');
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initialColor));
  const [hexInput, setHexInput] = useState(initialColor);

  const [genPalette, setGenPalette] = useState<string[]>([]);
  const [genCount, setGenCount] = useState<2 | 3 | 5>(5);
  const [genSelected, setGenSelected] = useState<Set<number>>(new Set());
  const [genLocked, setGenLocked] = useState<(string | null)[]>(Array(PALETTE_TARGET_SIZE).fill(null));
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [openColorIndex, setOpenColorIndex] = useState<number | null>(null);
  const [insertHsv, setInsertHsv] = useState<HSV>({ h: 0, s: 0, v: 1 });
  const [insertHexInput, setInsertHexInput] = useState('#ffffff');

  const visiblePalette = genPalette.slice(0, genCount);

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const insertSvRef = useRef<HTMLDivElement>(null);
  const insertHueRef = useRef<HTMLDivElement>(null);
  const insertPopoverRef = useRef<HTMLDivElement>(null);

  const currentHex = hsvToHex(hsv);
  const insertHex = hsvToHex(insertHsv);

  useEffect(() => {
    setHexInput(currentHex);
  }, [currentHex]);

  useEffect(() => {
    setInsertHexInput(insertHex);
  }, [insertHex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && mode === 'pick') onConfirm(currentHex);
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
  }, [currentHex, mode, onClose, onConfirm, triggerRef]);

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
    setInsertHsv(hexToHsv(genPalette[index] ?? '#ffffff'));
    setOpenColorIndex(index);
  };

  const applyInsertColor = () => {
    if (openColorIndex === null) return;
    setGenCustomColor(openColorIndex, insertHex);
    setOpenColorIndex(null);
  };

  const updateInsertFromSv = (clientX: number, clientY: number) => {
    const rect = insertSvRef.current!.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
    setInsertHsv(prev => ({ ...prev, s, v }));
  };

  const updateInsertFromHue = (clientX: number) => {
    const rect = insertHueRef.current!.getBoundingClientRect();
    const h = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
    setInsertHsv(prev => ({ ...prev, h }));
  };

  const startInsertSvDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateInsertFromSv(e.clientX, e.clientY);
  };
  const moveInsertSv = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    updateInsertFromSv(e.clientX, e.clientY);
  };

  const startInsertHueDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateInsertFromHue(e.clientX);
  };
  const moveInsertHue = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    updateInsertFromHue(e.clientX);
  };

  const onInsertHexChange = (raw: string) => {
    setInsertHexInput(raw);
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (HEX_RE.test(normalized)) {
      const rgb = hexToRgb(normalized)!;
      setInsertHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  };

  const handleReplacePalette = () => {
    const colors = Array.from(genSelected).sort((a, b) => a - b).map(i => genPalette[i]);
    if (colors.length === 0) return;
    const fillers = BASIC_FALLBACK_COLORS.slice(0, Math.max(0, PALETTE_TARGET_SIZE - colors.length));
    onReplacePalette([...colors, ...fillers]);
    onClose();
  };

  const updateFromSv = (clientX: number, clientY: number) => {
    const rect = svRef.current!.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
    setHsv(prev => ({ ...prev, s, v }));
  };

  const updateFromHue = (clientX: number) => {
    const rect = hueRef.current!.getBoundingClientRect();
    const h = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
    setHsv(prev => ({ ...prev, h }));
  };

  const startSvDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromSv(e.clientX, e.clientY);
  };
  const moveSv = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    updateFromSv(e.clientX, e.clientY);
  };

  const startHueDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromHue(e.clientX);
  };
  const moveHue = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    updateFromHue(e.clientX);
  };

  const onHexChange = (raw: string) => {
    setHexInput(raw);
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (HEX_RE.test(normalized)) {
      const rgb = hexToRgb(normalized)!;
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  };

  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;

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
            ref={svRef}
            className="color-picker__sv"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
            onPointerDown={startSvDrag}
            onPointerMove={moveSv}
          >
            <div
              className="color-picker__sv-cursor"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: currentHex }}
            />
          </div>

          <div
            ref={hueRef}
            className="color-picker__hue"
            onPointerDown={startHueDrag}
            onPointerMove={moveHue}
          >
            <div className="color-picker__hue-cursor" style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }} />
          </div>

          <div className="color-picker__row">
            <div className="color-picker__preview" style={{ background: currentHex }} aria-hidden="true" />
            <input
              className="color-picker__hex"
              value={hexInput}
              onChange={e => onHexChange(e.target.value)}
              spellCheck={false}
              maxLength={7}
              aria-label="Hex value"
            />
          </div>

          <button
            type="button"
            className="color-picker__confirm"
            onClick={() => onConfirm(currentHex)}
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
                            ref={insertSvRef}
                            className="color-picker__sv color-picker__sv--mini"
                            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${insertHsv.h}, 100%, 50%))` }}
                            onPointerDown={startInsertSvDrag}
                            onPointerMove={moveInsertSv}
                          >
                            <div
                              className="color-picker__sv-cursor"
                              style={{ left: `${insertHsv.s * 100}%`, top: `${(1 - insertHsv.v) * 100}%`, background: insertHex }}
                            />
                          </div>

                          <div
                            ref={insertHueRef}
                            className="color-picker__hue color-picker__hue--mini"
                            onPointerDown={startInsertHueDrag}
                            onPointerMove={moveInsertHue}
                          >
                            <div
                              className="color-picker__hue-cursor"
                              style={{ left: `${(insertHsv.h / 360) * 100}%`, background: `hsl(${insertHsv.h}, 100%, 50%)` }}
                            />
                          </div>

                          <div className="color-picker__row">
                            <div className="color-picker__preview" style={{ background: insertHex }} aria-hidden="true" />
                            <input
                              className="color-picker__hex"
                              value={insertHexInput}
                              onChange={e => onInsertHexChange(e.target.value)}
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
