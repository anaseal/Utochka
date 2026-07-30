import { useEffect, useRef } from 'react';
import { DrawingTool } from './useDrawing';
import { SilyankaProject } from './useSilyankaProject';
import { CrossWeaveProject } from './useCrossWeaveProject';
import { Technique } from '../components/Editor/Header/Header.types';

interface Params {
  technique: Technique;
  silyanka: SilyankaProject;
  crossWeave: CrossWeaveProject;
  setSilyankaTool: (tool: DrawingTool) => void;
  cancelStampPattern: () => void;
  // Режим плетения подменяет собой Undo/Redo рисунка: своя история отметок
  // (см. useWeaveProgress) и своя кнопка Undo в WeaveControls, но без
  // клавиатурного шортката отметку можно было снять только мышью.
  weaveMode: boolean;
  onWeaveUndo: () => void;
}

// Глобальные горячие клавиши редактора: undo/redo, однобуквенные шорткаты
// инструментов (Photoshop-style) и Escape/Alt/Shift для штампа/цепочки.
export const useEditorKeyboardShortcuts = ({
  technique, silyanka, crossWeave, setSilyankaTool, cancelStampPattern, weaveMode, onWeaveUndo,
}: Params) => {
  // Обработчик пересобирается на каждый рендер (замыкается на technique/
  // silyanka/crossWeave), но сам addEventListener — только один раз при
  // монтировании: сравнение по ref избегает постоянного снятия/навешивания
  // keydown-слушателя, которое было бы неизбежно при [technique, silyanka,
  // crossWeave] в зависимостях эффекта (оба хука возвращают новый объект-
  // литерал на каждый рендер).
  const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    handleKeyDownRef.current = (e: KeyboardEvent) => {
      if (technique === 'silyanka' && e.key === 'Escape' && silyanka.stampPattern) {
        cancelStampPattern();
        return;
      }
      if (technique === 'silyanka' && e.key === 'Escape' && silyanka.chainPendingStart !== null) {
        silyanka.setChainPendingStart(null);
        return;
      }
      if (technique === 'silyanka' && e.key === 'Escape' && silyanka.toothPendingStart !== null) {
        silyanka.setToothPendingStart(null);
        return;
      }
      // Hole/Hole segment — единственные инструменты рисования без своей
      // однобуквенной клавиши (см. переключатель ниже, у них его нет) — без
      // Escape выйти из них можно было только кликом по другому инструменту
      // в UI.
      if (
        technique === 'silyanka' && e.key === 'Escape' &&
        (silyanka.drawingControls.activeTool === 'hole' || silyanka.drawingControls.activeTool === 'hole-segment')
      ) {
        setSilyankaTool('pencil');
        return;
      }
      // Alt сбрасывает захваченный штамп так же, как Escape, — курсор
      // сразу возвращается в режим выделения новой зоны драгом.
      if (technique === 'silyanka' && e.key === 'Alt' && silyanka.stampPattern) {
        e.preventDefault();
        cancelStampPattern();
        return;
      }
      // Shift — клавиатурный шорткат для того же тоггла, что и бейдж у кнопки
      // Stamp: один тап насовсем переключает точку привязки, удерживать не
      // нужно. e.repeat отсекает авто-повтор при удержании клавиши.
      if (
        technique === 'silyanka' && e.key === 'Shift' && !e.repeat &&
        silyanka.drawingControls.activeTool === 'stamp' && silyanka.stampPattern
      ) {
        e.preventDefault();
        silyanka.toggleStampAnchorEdge();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        // В режиме плетения Undo/Redo рисунка скрыты и не имеют смысла (своя
        // история — см. useWeaveProgress); Ctrl+Z снимает последнюю отметку,
        // Redo для отметок не заведён сознательно (см. useWeaveProgress.ts).
        if (weaveMode) {
          if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); onWeaveUndo(); }
          return;
        }
        const active = technique === 'silyanka' ? silyanka.drawingControls : crossWeave.drawingControls;
        if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); active.undo(); }
        if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { e.preventDefault(); active.redo(); }
        return;
      }

      // Однобуквенные шорткаты инструментов (Photoshop-style: B/E/G/S/M) —
      // не должны срабатывать при вводе в поля хедера (Stepper/ColorPicker) и
      // при удержании клавиши (e.repeat), чтобы не дёргать setActiveTool на повторе.
      if (e.altKey || e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          if (technique === 'silyanka') setSilyankaTool('pencil');
          else crossWeave.drawingControls.setActiveTool('pencil');
          break;
        case 'e':
          e.preventDefault();
          if (technique === 'silyanka') {
            setSilyankaTool(silyanka.drawingControls.activeTool === 'eraser' ? 'pencil' : 'eraser');
          } else {
            crossWeave.drawingControls.setActiveTool(crossWeave.drawingControls.activeTool === 'eraser' ? 'pencil' : 'eraser');
          }
          break;
        case 'g':
          e.preventDefault();
          if (technique === 'silyanka') {
            setSilyankaTool(silyanka.drawingControls.activeTool === 'flood-fill' ? 'pencil' : 'flood-fill');
          } else {
            crossWeave.drawingControls.setActiveTool(
              crossWeave.drawingControls.activeTool === 'flood-fill' ? 'pencil' : 'flood-fill',
            );
          }
          break;
        case 's':
          if (technique !== 'silyanka') break;
          e.preventDefault();
          setSilyankaTool(silyanka.drawingControls.activeTool === 'stamp' ? 'pencil' : 'stamp');
          break;
        case 'm':
          e.preventDefault();
          if (technique === 'silyanka') silyanka.setMirrorMode(!silyanka.mirrorMode);
          else crossWeave.setMirrorMode(!crossWeave.mirrorMode);
          break;
        case 't':
          e.preventDefault();
          if (technique === 'silyanka') {
            setSilyankaTool(silyanka.drawingControls.activeTool === 'thread' ? 'pencil' : 'thread');
          } else {
            crossWeave.drawingControls.setActiveTool(
              crossWeave.drawingControls.activeTool === 'thread' ? 'pencil' : 'thread',
            );
          }
          break;
        // Крестик плетётся двумя нитками одновременно (силянка — одной) —
        // 1/2 выбирают, какую из них ведём, и сразу включают инструмент
        // «Нитка» (тот же выбор доступен через ThreadMenu в хедере).
        case '1':
        case '2':
          if (technique !== 'crossWeave') break;
          e.preventDefault();
          crossWeave.setActiveThreadStrand(e.key === '1' ? 1 : 2);
          crossWeave.drawingControls.setActiveTool('thread');
          break;
      }
    };
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
};
