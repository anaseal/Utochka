import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../utils/clamp';
import { hexToHsv, hexToRgb, hsvToHex, rgbToHsv, type HSV } from '../utils/color';

// SV-квадрат + Hue-полоса — общая механика двух color-picker'ов в ColorPicker.tsx
// (основной Pick-таб и мини-пикер вставки цвета в сгенерированную палитру): state
// (hsv + синхронизированный hex-инпут) и drag-хендлеры идентичны для обоих, различался
// только источник начального цвета. У мини-пикера начальный цвет ещё и меняется на
// лету — при переключении на другую бисерину палитры хук не перемонтируется,
// поэтому вызывающий код сбрасывает состояние явным setFromHex.
export const useSvHuePicker = (initialHex: string) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initialHex));
  const [hexInput, setHexInput] = useState(initialHex);

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const hex = hsvToHex(hsv);

  useEffect(() => {
    setHexInput(hex);
  }, [hex]);

  const setFromHex = useCallback((next: string) => {
    setHsv(hexToHsv(next));
  }, []);

  const updateFromSv = useCallback((clientX: number, clientY: number) => {
    const rect = svRef.current!.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
    setHsv(prev => ({ ...prev, s, v }));
  }, []);

  const updateFromHue = useCallback((clientX: number) => {
    const rect = hueRef.current!.getBoundingClientRect();
    const h = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
    setHsv(prev => ({ ...prev, h }));
  }, []);

  const startSvDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromSv(e.clientX, e.clientY);
  }, [updateFromSv]);

  const moveSv = useCallback((e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    updateFromSv(e.clientX, e.clientY);
  }, [updateFromSv]);

  const startHueDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromHue(e.clientX);
  }, [updateFromHue]);

  const moveHue = useCallback((e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    updateFromHue(e.clientX);
  }, [updateFromHue]);

  const onHexChange = useCallback((raw: string) => {
    setHexInput(raw);
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    const rgb = hexToRgb(normalized);
    if (rgb) setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
  }, []);

  return {
    hsv,
    hex,
    hexInput,
    svRef,
    hueRef,
    startSvDrag,
    moveSv,
    startHueDrag,
    moveHue,
    onHexChange,
    setFromHex,
  };
};
