/* src/vite-env.d.ts */
/// <reference types="vite/client" />

// EyeDropper API («пипетка») пока не входит в стандартные типы DOM — есть
// только в Chromium. Наличие проверяется в рантайме (`'EyeDropper' in window`,
// Header.tsx), поэтому в Window он опциональный.
interface EyeDropperOpenResult {
  sRGBHex: string;
}

declare class EyeDropper {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperOpenResult>;
}

interface Window {
  EyeDropper?: typeof EyeDropper;
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}