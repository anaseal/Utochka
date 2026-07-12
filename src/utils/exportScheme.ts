/**
 * Экспорт схемы в PNG.
 *
 * Подход — клонировать живой `<svg>` редактора, вычистить интерактивные
 * элементы, вшить недостающие CSS-стили (часть оформления задана классами,
 * а не атрибутами), замерить реальные границы содержимого, дорисовать фон и
 * легенду материалов, затем растеризовать через `<canvas>`. См. spec.md.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export type CanvasTheme = 'dark' | 'light';

/** Явные границы содержимого в координатах viewBox — обходят измерение bbox всего клона. */
export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Палитра экспорта по теме холста — согласована с токенами `.canvas__svg`
 * и `[data-canvas-theme="light"]` в CSS, чтобы PNG совпадал с видом на экране.
 */
interface ExportPalette {
  bg: string;
  axisText: string;
  mirrorAxis: string;
  legendDivider: string;
  legendTitle: string;
  legendLabel: string;
  swatchStroke: string;
  /** Значение filter для закрашенной ноды: glow в тёмной теме, none в светлой. */
  nodeGlow: string;
}

const PALETTES: Record<CanvasTheme, ExportPalette> = {
  dark: {
    bg: '#0f172a',
    axisText: '#64748b',
    mirrorAxis: 'rgba(255, 255, 255, 0.5)',
    legendDivider: 'rgba(255, 255, 255, 0.1)',
    legendTitle: '#e2e8f0',
    legendLabel: '#e2e8f0',
    swatchStroke: 'rgba(255, 255, 255, 0.25)',
    nodeGlow: 'drop-shadow(0 0 1px var(--bead-color))',
  },
  light: {
    bg: '#f8fafc',
    axisText: '#475569',
    mirrorAxis: 'rgba(15, 23, 42, 0.35)',
    legendDivider: 'rgba(15, 23, 42, 0.12)',
    legendTitle: '#1e293b',
    legendLabel: '#334155',
    swatchStroke: 'rgba(15, 23, 42, 0.25)',
    nodeGlow: 'drop-shadow(0 0 0.5px var(--bead-color))',
  },
};

/** Множитель разрешения PNG — ×2 для резкости при печати. */
const QUALITY_SCALE = 2;

/** Поля вокруг содержимого в координатах viewBox (чтобы линейки не липли к краю). */
const CONTENT_PADDING = 24;

/**
 * Селекторы интерактивных/служебных элементов, не нужных в статичной схеме:
 * кнопки ± и числа пролётов, хитбоксы, подсветка наведения, drop-таргеты и
 * кнопки удаления подвесок.
 */
const STRIP_SELECTORS = [
  '.span-ctrl__btn-group',
  '.span-ctrl__count',
  '.bead__hitbox',
  '.bead__highlight',
  '.pendant-bead__hitbox',
  '.pendant-hover-area',
  '.pendant-drop-target',
  '.pendant-remove-btn',
].join(', ');

/**
 * Стили, которые в приложении приходят из внешних CSS-файлов и теряются при
 * сериализации SVG. Цвета бусин не включены — они уже инлайн (`fill`).
 * Цвета осей/оси зеркала зависят от темы холста (`pal`).
 */
const buildExportStyle = (pal: ExportPalette): string => `
.bead__body, .pendant-bead__body {
  stroke: #000000;
  stroke-width: 0.5px;
  shape-rendering: geometricPrecision;
}
.bead--type-node .bead__body {
  filter: ${pal.nodeGlow};
}
.canvas__axis-text {
  fill: ${pal.axisText};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 20px;
  font-weight: 600;
}
.canvas__mirror-axis {
  stroke: ${pal.mirrorAxis};
  stroke-width: 1.5;
  stroke-dasharray: 6 6;
}
`;

/** Параметры раскладки легенды (в координатах viewBox). */
const LEGEND = {
  pad: 28,
  titleHeight: 38,
  itemHeight: 30,
  swatch: 20,
};

/** Строит SVG-группу легенды материалов и сообщает её высоту. */
const buildLegend = (
  colorStats: [string, number][],
  totalCount: number,
  originX: number,
  yOffset: number,
  width: number,
  pal: ExportPalette,
): { group: SVGGElement; height: number } => {
  const { pad, titleHeight, itemHeight, swatch } = LEGEND;
  const height = pad + titleHeight + colorStats.length * itemHeight + pad;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('transform', `translate(${originX}, ${yOffset})`);

  const divider = document.createElementNS(SVG_NS, 'line');
  divider.setAttribute('x1', String(pad));
  divider.setAttribute('y1', '0');
  divider.setAttribute('x2', String(width - pad));
  divider.setAttribute('y2', '0');
  divider.setAttribute('stroke', pal.legendDivider);
  group.appendChild(divider);

  const title = document.createElementNS(SVG_NS, 'text');
  title.setAttribute('x', String(pad));
  title.setAttribute('y', String(pad + 14));
  title.setAttribute('font-family', 'sans-serif');
  title.setAttribute('font-size', '13');
  title.setAttribute('font-weight', '700');
  title.setAttribute('fill', pal.legendTitle);
  title.textContent = `Materials — total beads: ${totalCount}`;
  group.appendChild(title);

  colorStats.forEach(([color, count], i) => {
    const rowY = pad + titleHeight + i * itemHeight;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(pad));
    rect.setAttribute('y', String(rowY));
    rect.setAttribute('width', String(swatch));
    rect.setAttribute('height', String(swatch));
    rect.setAttribute('rx', '4');
    rect.setAttribute('fill', color);
    rect.setAttribute('stroke', pal.swatchStroke);
    group.appendChild(rect);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(pad + swatch + 12));
    label.setAttribute('y', String(rowY + swatch / 2));
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('font-family', 'monospace');
    label.setAttribute('font-size', '15');
    label.setAttribute('fill', pal.legendLabel);
    label.textContent = `${color}  ×  ${count}`;
    group.appendChild(label);
  });

  return { group, height };
};

/**
 * Замеряет границы содержимого SVG. Клон временно цепляется за пределами
 * экрана — `getBBox()` требует, чтобы элемент был отрендерен в DOM.
 */
const measureContent = (clone: SVGSVGElement): DOMRect => {
  const host = document.createElement('div');
  host.setAttribute(
    'style',
    'position:absolute;left:-99999px;top:0;opacity:0;pointer-events:none;',
  );
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    return clone.getBBox();
  } finally {
    document.body.removeChild(host);
  }
};

/** Необязательные настройки экспорта поверх дефолтного поведения силянки. */
export interface ExportSchemeOptions {
  /**
   * Используется вместо `measureContent(clone)` (например, чтобы обрезать PNG
   * по закрашенным бусинам, а не по всему SVG). Координаты — та же система,
   * что и у `getBBox()` корневого `<svg>`.
   */
  contentBounds?: ContentBounds;
  /** Доп. CSS-селектор элементов, которые нужно удалить из клона перед экспортом (например, незакрашенные бусины). */
  extraStripSelector?: string;
  /** Не рисовать блок легенды материалов под сеткой. */
  hideLegend?: boolean;
}

/**
 * Экспортирует текущую схему в PNG-файл и запускает его скачивание.
 *
 * @param svg        Живой корневой `<svg>` холста (`canvasSvgRef.current`).
 * @param colorStats Спецификация материалов: пары `[цвет, количество]`.
 * @param totalCount Общее число бусин.
 * @param theme      Тема холста — задаёт фон и цвета осей/легенды в PNG.
 * @param options    См. {@link ExportSchemeOptions}.
 */
export const exportSchemeToPng = (
  svg: SVGSVGElement,
  colorStats: [string, number][],
  totalCount: number,
  theme: CanvasTheme = 'dark',
  options: ExportSchemeOptions = {},
): Promise<void> => {
  const { contentBounds, extraStripSelector, hideLegend } = options;
  const pal = PALETTES[theme];
  const clone = svg.cloneNode(true) as SVGSVGElement;

  const stripSelectors = extraStripSelector
    ? `${STRIP_SELECTORS}, ${extraStripSelector}`
    : STRIP_SELECTORS;
  clone.querySelectorAll(stripSelectors).forEach((el) => el.remove());

  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = buildExportStyle(pal);
  clone.appendChild(style);

  clone.setAttribute('xmlns', SVG_NS);
  // Зум и экранный viewBox убираем: они обрезали бы линейки, уходящие в
  // отрицательные координаты относительно группы трансформации.
  clone.removeAttribute('width');
  clone.removeAttribute('height');

  // Реальные границы содержимого — сетка, линейки и подвески целиком, либо
  // явные границы вызывающей стороны (например, кроп по закрашенным бусинам).
  const bbox = contentBounds ?? measureContent(clone);
  const contentX = bbox.x - CONTENT_PADDING;
  const contentY = bbox.y - CONTENT_PADDING;
  const contentW = bbox.width + CONTENT_PADDING * 2;
  const contentH = bbox.height + CONTENT_PADDING * 2;

  let legendHeight = 0;
  if (!hideLegend) {
    const legend = buildLegend(colorStats, totalCount, contentX, contentY + contentH, contentW, pal);
    clone.appendChild(legend.group);
    legendHeight = legend.height;
  }

  const fullW = contentW;
  const fullH = contentH + legendHeight;

  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('x', String(contentX));
  background.setAttribute('y', String(contentY));
  background.setAttribute('width', String(fullW));
  background.setAttribute('height', String(fullH));
  background.setAttribute('fill', pal.bg);
  clone.insertBefore(background, clone.firstChild);

  clone.setAttribute('width', String(fullW));
  clone.setAttribute('height', String(fullH));
  clone.setAttribute('viewBox', `${contentX} ${contentY} ${fullW} ${fullH}`);

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<void>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(svgUrl);

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(fullW * QUALITY_SCALE);
      canvas.height = Math.round(fullH * QUALITY_SCALE);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Failed to generate PNG'));
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'silyanka-scheme.png';
        link.click();
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG for rasterization'));
    };

    img.src = svgUrl;
  });
};
