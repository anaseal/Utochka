// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useDrawing } from './useDrawing';
import { PendantPlacement, PendantChain, DecorTailPlacement } from '../types/pendant';
import { Thread } from '../types/thread';

const PERSIST_MS = 300;
const RECENT_LIMIT = 5; // BEAD_THEME.ui.recentColorsLimit
const PALETTE: readonly string[] = ['#000000', '#ffffff'];
const BLACK = PALETTE[0];

// Подвески, цепочки, декор-хвосты и нитки живут снаружи useDrawing (их
// состояние в use*Project.ts), но откатываются его же историей — харнесс
// повторяет эту сборку, иначе Undo/Redo нечем проверить.
const useDrawingHarness = () => {
  const [pendants, setPendants] = useState<PendantPlacement[]>([]);
  const [chains, setChains] = useState<PendantChain[]>([]);
  const [decorTails, setDecorTails] = useState<DecorTailPlacement[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const drawing = useDrawing(
    BLACK, PALETTE, pendants, setPendants, chains, setChains,
    decorTails, setDecorTails, threads, setThreads, 'silyanka',
  );
  return { drawing, pendants, chains, decorTails, threads, setPendants, setChains, setDecorTails, setThreads };
};

type Harness = { current: ReturnType<typeof useDrawingHarness> };

const setup = () => renderHook(() => useDrawingHarness());

// Протяжка кистью целиком: pointerdown → движения → pointerup. Шаги обязаны
// быть разными act: stopDrawing читает isDrawing из замыкания рендера, и в
// одном блоке он бы ещё не увидел начатый мазок — ровно как в браузере, где
// между событиями всегда есть рендер.
const paintStroke = (harness: Harness, ids: string[]) => {
  act(() => { harness.current.drawing.startDrawing(); });
  act(() => { ids.forEach(id => harness.current.drawing.paintBeadFast(id)); });
  act(() => { harness.current.drawing.stopDrawing(); });
};

const pendant = (id: string, colorMap: Record<number, string> = {}): PendantPlacement =>
  ({ placementId: id, templateId: 'drop', col: 0, colorMap });

const chain = (id: string, colorMap: Record<number, string> = {}): PendantChain =>
  ({ placementId: id, startCol: 0, endCol: 2, colorMap });

const decorTail = (id: string, colorMap: Record<number, string> = {}): DecorTailPlacement =>
  ({ placementId: id, col: 0, rows: 3, colorMap });

const thread = (id: string): Thread => ({ id, beadIds: ['node-0-0', 'node-1-0'] });

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('инструменты', () => {
  it('карандаш кладёт активный цвет', () => {
    const { result } = setup();
    act(() => { result.current.drawing.paintBead('node-0-0'); });
    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK });
  });

  it('смена цвета в палитре сразу влияет на следующую бисерину', () => {
    const { result } = setup();
    act(() => { result.current.drawing.setActiveColor('#ff0000'); });
    act(() => { result.current.drawing.paintBead('node-0-0'); });
    expect(result.current.drawing.designMap['node-0-0']).toBe('#ff0000');
  });

  it('ластик убирает цвет, а не красит в фон', () => {
    const { result } = setup();
    act(() => { result.current.drawing.paintBead('node-0-0'); });

    act(() => { result.current.drawing.setActiveTool('eraser'); });
    act(() => { result.current.drawing.paintBead('node-0-0'); });

    expect(result.current.drawing.designMap).toEqual({});
  });

  it('ластик по пустой бисерине ничего не ломает', () => {
    const { result } = setup();
    act(() => { result.current.drawing.setActiveTool('eraser'); });
    act(() => { result.current.drawing.paintBead('node-0-0'); });
    expect(result.current.drawing.designMap).toEqual({});
  });

  it('инструмент по умолчанию — карандаш', () => {
    const { result } = setup();
    expect(result.current.drawing.activeTool).toBe('pencil');
  });
});

describe('протяжка кистью', () => {
  // Буфер мазка нужен, чтобы не пересобирать сетку из тысяч бисерин на каждый
  // пиксель протяжки: в state всё уезжает разом на pointerup.
  it('во время протяжки designMap не меняется', () => {
    const { result } = setup();

    act(() => { result.current.drawing.startDrawing(); });
    act(() => {
      result.current.drawing.paintBeadFast('node-0-0');
      result.current.drawing.paintBeadFast('node-0-1');
    });

    expect(result.current.drawing.designMap).toEqual({});
  });

  it('на pointerup вся протяжка попадает в designMap разом', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0', 'node-0-1', 'node-0-2']);
    expect(result.current.drawing.designMap).toEqual({
      'node-0-0': BLACK, 'node-0-1': BLACK, 'node-0-2': BLACK,
    });
  });

  it('paintBeadFast отдаёт цвет для прямой покраски в DOM', () => {
    const { result } = setup();
    let painted: string | undefined = 'не вызывалось';

    act(() => { result.current.drawing.startDrawing(); });
    act(() => { painted = result.current.drawing.paintBeadFast('node-0-0'); });

    expect(painted).toBe(BLACK);
  });

  it('ластик в протяжке отдаёт undefined — сигнал «вернуть цвет по умолчанию»', () => {
    const { result } = setup();
    act(() => { result.current.drawing.setActiveTool('eraser'); });
    let painted: string | undefined = 'не вызывалось';

    act(() => { result.current.drawing.startDrawing(); });
    act(() => { painted = result.current.drawing.paintBeadFast('node-0-0'); });

    expect(painted).toBeUndefined();
  });

  it('протяжка ластиком стирает ранее закрашенное', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0', 'node-0-1']);

    act(() => { result.current.drawing.setActiveTool('eraser'); });
    paintStroke(result, ['node-0-0']);

    expect(result.current.drawing.designMap).toEqual({ 'node-0-1': BLACK });
  });

  it('вся протяжка — один шаг истории, а не по бисерине на шаг', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0', 'node-0-1', 'node-0-2']);

    act(() => { result.current.drawing.undo(); });

    expect(result.current.drawing.designMap).toEqual({});
    expect(result.current.drawing.canUndo).toBe(false);
  });

  it('клик мимо (мазок без изменений) не засоряет историю', () => {
    const { result } = setup();
    paintStroke(result, []);
    expect(result.current.drawing.canUndo).toBe(false);
  });
});

describe('undo / redo', () => {
  it('отмена и повтор возвращают рисунок шаг за шагом', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0']);
    paintStroke(result, ['node-0-1']);

    act(() => { result.current.drawing.undo(); });
    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK });

    act(() => { result.current.drawing.redo(); });
    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK, 'node-0-1': BLACK });
  });

  it('новый мазок после отмены отрезает повтор', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0']);
    act(() => { result.current.drawing.undo(); });
    expect(result.current.drawing.canRedo).toBe(true);

    paintStroke(result, ['node-1-0']);

    expect(result.current.drawing.canRedo).toBe(false);
  });

  it('на пустой истории отмена и повтор ничего не делают', () => {
    const { result } = setup();
    expect(result.current.drawing.canUndo).toBe(false);
    expect(result.current.drawing.canRedo).toBe(false);

    act(() => { result.current.drawing.undo(); });
    act(() => { result.current.drawing.redo(); });

    expect(result.current.drawing.designMap).toEqual({});
  });

  it('история ограничена 30 мазками — самые старые забываются', () => {
    const { result } = setup();
    for (let i = 0; i < 31; i++) paintStroke(result, [`node-0-${i}`]);

    for (let i = 0; i < 30; i++) act(() => { result.current.drawing.undo(); });

    expect(result.current.drawing.canUndo).toBe(false);
    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK });
  });

  // Заливка может за один клик задеть сетку, подвеску, цепочку, хвост и нитку —
  // один Undo обязан откатить всё пять разом, иначе схема разъедется.
  it('один шаг истории откатывает сетку, подвески, цепочки, хвосты и нитки вместе', () => {
    const { result } = setup();
    act(() => {
      result.current.setPendants([pendant('p1')]);
      result.current.setChains([chain('c1')]);
      result.current.setDecorTails([decorTail('d1')]);
    });

    act(() => {
      result.current.drawing.applyPatch(
        m => ({ ...m, 'node-0-0': '#ff0000' }),
        ps => ps.map(p => ({ ...p, colorMap: { 0: '#ff0000' } })),
        cs => cs.map(c => ({ ...c, colorMap: { 0: '#ff0000' } })),
        () => [thread('t1')],
        ds => ds.map(d => ({ ...d, colorMap: { 0: '#ff0000' } })),
      );
    });
    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': '#ff0000' });
    expect(result.current.pendants[0].colorMap).toEqual({ 0: '#ff0000' });
    expect(result.current.decorTails[0].colorMap).toEqual({ 0: '#ff0000' });

    act(() => { result.current.drawing.undo(); });

    expect(result.current.drawing.designMap).toEqual({});
    expect(result.current.pendants[0].colorMap).toEqual({});
    expect(result.current.chains[0].colorMap).toEqual({});
    expect(result.current.decorTails[0].colorMap).toEqual({});
    expect(result.current.threads).toEqual([]);
  });

  it('applyPatch, который ничего не изменил, не пишется в историю', () => {
    const { result } = setup();
    act(() => { result.current.drawing.applyPatch(m => m, null, null, null, null); });
    expect(result.current.drawing.canUndo).toBe(false);
  });
});

describe('очистка', () => {
  it('стирает и сетку, и цвета подвесок, цепочек, хвостов, и нитки', () => {
    const { result } = setup();
    act(() => {
      result.current.setPendants([pendant('p1', { 0: '#ff0000' })]);
      result.current.setChains([chain('c1', { 0: '#00ff00' })]);
      result.current.setDecorTails([decorTail('d1', { 0: '#0000ff' })]);
      result.current.setThreads([thread('t1')]);
    });
    paintStroke(result, ['node-0-0']);

    act(() => { result.current.drawing.clearAll(); });

    expect(result.current.drawing.designMap).toEqual({});
    expect(result.current.pendants[0].colorMap).toEqual({});
    expect(result.current.chains[0].colorMap).toEqual({});
    expect(result.current.decorTails[0].colorMap).toEqual({});
    expect(result.current.threads).toEqual([]);
  });

  it('сами подвески и цепочки при очистке остаются на месте', () => {
    const { result } = setup();
    act(() => { result.current.setPendants([pendant('p1', { 0: '#ff0000' })]); });

    act(() => { result.current.drawing.clearAll(); });

    expect(result.current.pendants).toHaveLength(1);
    expect(result.current.pendants[0].placementId).toBe('p1');
  });

  it('очистку можно отменить', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0']);

    act(() => { result.current.drawing.clearAll(); });
    act(() => { result.current.drawing.undo(); });

    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK });
  });

  it('очистка пустой схемы не засоряет историю', () => {
    const { result } = setup();
    act(() => { result.current.drawing.clearAll(); });
    expect(result.current.drawing.canUndo).toBe(false);
  });
});

describe('remapDesignMap', () => {
  it('пересчёт схемы попадает в историю', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0']);

    act(() => {
      result.current.drawing.remapDesignMap(() => ({ 'node-5-5': '#ff0000' }));
    });
    expect(result.current.drawing.designMap).toEqual({ 'node-5-5': '#ff0000' });

    act(() => { result.current.drawing.undo(); });
    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK });
  });

  it('пересчёт без изменений не пишется в историю', () => {
    const { result } = setup();
    act(() => { result.current.drawing.remapDesignMap(m => m); });
    expect(result.current.drawing.canUndo).toBe(false);
  });
});

describe('недавние цвета', () => {
  it('свой цвет попадает в недавние', () => {
    const { result } = setup();
    act(() => { result.current.drawing.commitRecentColor('#ff0000'); });
    expect(result.current.drawing.recentColors).toEqual(['#ff0000']);
  });

  it('цвет из палитры в недавние не дублируется', () => {
    const { result } = setup();
    act(() => { result.current.drawing.commitRecentColor(BLACK); });
    expect(result.current.drawing.recentColors).toEqual([]);
  });

  it('повторный выбор поднимает цвет наверх, а не добавляет второй раз', () => {
    const { result } = setup();
    act(() => { result.current.drawing.commitRecentColor('#ff0000'); });
    act(() => { result.current.drawing.commitRecentColor('#00ff00'); });
    act(() => { result.current.drawing.commitRecentColor('#ff0000'); });

    expect(result.current.drawing.recentColors).toEqual(['#ff0000', '#00ff00']);
  });

  it(`список обрезается до ${RECENT_LIMIT}`, () => {
    const { result } = setup();
    for (let i = 1; i <= RECENT_LIMIT + 3; i++) {
      act(() => { result.current.drawing.commitRecentColor(`#0000${i.toString(16).padStart(2, '0')}`); });
    }
    expect(result.current.drawing.recentColors).toHaveLength(RECENT_LIMIT);
  });

  it('не-hex значение игнорируется', () => {
    const { result } = setup();
    act(() => { result.current.drawing.commitRecentColor('красный'); });
    act(() => { result.current.drawing.commitRecentColor('#fff'); });
    expect(result.current.drawing.recentColors).toEqual([]);
  });

  it('недавние переживают перезагрузку', () => {
    const first = setup();
    act(() => { first.result.current.drawing.commitRecentColor('#ff0000'); });
    first.unmount();

    const { result } = setup();

    expect(result.current.drawing.recentColors).toEqual(['#ff0000']);
  });

  it('мусор в хранилище отфильтровывается при загрузке', () => {
    localStorage.setItem('silyanka:recentColors', JSON.stringify(['#ff0000', 42, 'синий']));
    const { result } = setup();
    expect(result.current.drawing.recentColors).toEqual(['#ff0000']);
  });
});

describe('сохранение схемы', () => {
  it('рисунок переживает перезагрузку', () => {
    const first = setup();
    paintStroke(first.result, ['node-0-0']);
    act(() => { vi.advanceTimersByTime(PERSIST_MS); });
    first.unmount();

    const { result } = setup();

    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK });
  });

  it('схема лежит под ключом своей техники', () => {
    const { result } = setup();
    paintStroke(result, ['node-0-0']);
    act(() => { vi.advanceTimersByTime(PERSIST_MS); });

    expect(localStorage.getItem('silyanka:designMap')).toBe(JSON.stringify({ 'node-0-0': BLACK }));
    expect(localStorage.getItem('crossWeave:designMap')).toBeNull();
  });

  it('история отмен переживает перезагрузку', () => {
    const first = setup();
    paintStroke(first.result, ['node-0-0']);
    paintStroke(first.result, ['node-0-1']);
    act(() => { first.result.current.drawing.undo(); });
    act(() => { vi.advanceTimersByTime(PERSIST_MS); });
    first.unmount();

    const { result } = setup();

    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK });
    expect(result.current.drawing.canUndo).toBe(true);
    expect(result.current.drawing.canRedo).toBe(true);

    act(() => { result.current.drawing.redo(); });
    expect(result.current.drawing.designMap).toEqual({ 'node-0-0': BLACK, 'node-0-1': BLACK });

    act(() => { result.current.drawing.undo(); });
    act(() => { result.current.drawing.undo(); });
    expect(result.current.drawing.designMap).toEqual({});
    expect(result.current.drawing.canUndo).toBe(false);
  });

  it('мусор в стеке истории отфильтровывается при загрузке', () => {
    localStorage.setItem('silyanka:historyPast', JSON.stringify(['не снимок', 42]));
    const { result } = setup();
    expect(result.current.drawing.canUndo).toBe(false);
  });
});
