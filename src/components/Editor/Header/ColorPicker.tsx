import { useEffect, useRef, useState } from 'react';
import './ColorPicker.css';
import { clamp } from '../../../utils/clamp';

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
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const ColorPicker = ({ initialColor, onConfirm, onClose, triggerRef }: Props) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initialColor));
  const [hexInput, setHexInput] = useState(initialColor);

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentHex = hsvToHex(hsv);

  useEffect(() => {
    setHexInput(currentHex);
  }, [currentHex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') onConfirm(currentHex);
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
  }, [currentHex, onClose, onConfirm, triggerRef]);

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
    <div className="color-picker" ref={rootRef} role="dialog" aria-label="Pick a color">
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
    </div>
  );
};
